import { TRPCError } from "@trpc/server";
import { db } from "../db";
import {
  type Context,
  generalProcedure,
  router,
  viewerProcedure,
} from "../trpc";
import { z } from "zod";
import { labelSheets, labels } from "./labels.table";
import { eq } from "drizzle-orm";
import { eventSubscription } from "../utils/eventSubscription";
import { KV } from "../utils/kv";

const { update, createSub } = eventSubscription();

const kv = new KV('labels')

export const labelsRouter = router({
  sheet: {
    all: viewerProcedure.query(async ({ ctx }) => {
      const allSheets = await db.query.labelSheets.findMany();
      return allSheets.filter(
        (sheet) =>
          ctx.user.permissionLevel === "admin" ||
          sheet.public ||
          sheet.owner === ctx.user.username
      );
    }),
    allSub: createSub(async ({ ctx }) => {
      const allSheets = await db.query.labelSheets.findMany();
      return allSheets.filter(
        (sheet) =>
          ctx.user.permissionLevel === "admin" ||
          sheet.public ||
          sheet.owner === ctx.user.username
      );
    }),
    add: generalProcedure
      .input(
        z.object({
          isPublic: z.coerce.boolean(),
          name: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input: { isPublic, name } }) => {
        const id = await db
          .insert(labelSheets)
          .values({
            name,
            public: isPublic,
            owner: ctx.user.username,
          })
          .returning({ id: labelSheets.id });
        update();
        return id[0];
      }),
    del: generalProcedure
      .input(
        z.object({
          id: z.number().int(),
        })
      )
      .mutation(async ({ ctx, input: { id } }) => {
        await checkSheetPermissions(ctx, id);
        await db.delete(labels).where(eq(labels.sheet, id));
        await db.delete(labelSheets).where(eq(labelSheets.id, id));
        update();
      }),
    clear: generalProcedure
      .input(
        z.object({
          id: z.number().int(),
        })
      )
      .mutation(async ({ ctx, input: { id } }) => {
        await checkSheetPermissions(ctx, id);
        await db.delete(labels).where(eq(labels.sheet, id));
        update(id.toString());
      }),
    rename: generalProcedure
      .input(
        z.object({
          id: z.number().int(),
          name: z.string().min(1),
          isPublic: z.coerce.boolean(),
        })
      )
      .mutation(async ({ ctx, input: { id, name, isPublic } }) => {
        await checkSheetPermissions(ctx, id);
        await db
          .update(labelSheets)
          .set({ name, public: isPublic })
          .where(eq(labelSheets.id, id));
        update();
      }),
  },
  allLastAccessed: viewerProcedure
    .query(async ({ ctx, }) => {
      const lastAccessed = await kv.get(ctx.user.username);
      if (!lastAccessed) {
        return null;
      }
      const id = parseInt(lastAccessed);
      try {
        await checkSheetPermissions(ctx, id);

      } catch (e) {
        // If the user doesn't have permission, return null
        return null;
      }
      return {
        id,
        labels: await db.query.labels.findMany({ where: eq(labels.sheet, id) }) ?? null
      };
    }),
  all: viewerProcedure
    .input(
      z.object({
        sheetId: z.number().int(),
      })
    )
    .query(async ({ ctx, input: { sheetId: id } }) => {
      await checkSheetPermissions(ctx, id);
      await kv.set(ctx.user.username, id.toString());
      return await db.query.labels.findMany({ where: eq(labels.sheet, id) }) ?? null;
    }),
  allSub: createSub<{ sheetId: number }, typeof labels.$inferSelect[]>(async ({ ctx, input: { sheetId } }) => {
    await checkSheetPermissions(ctx, sheetId);
    await kv.set(ctx.user.username, sheetId.toString());
    return await db.query.labels.findMany({ where: eq(labels.sheet, sheetId) }) ?? null;
  }),
  add: generalProcedure
    .input(
      z.object({
        sheetId: z.number().int(),
        name: z.string(),
        barcode: z.string().min(1),
        price: z.coerce.number().gte(0),
        qbId: z.string().optional(),
      })
    )
    .mutation(
      async ({ ctx, input: { sheetId, name, price, barcode, qbId } }) => {
        await checkSheetPermissions(ctx, sheetId);
        await db.insert(labels).values({
          sheet: sheetId,
          name,
          priceCents: Math.round(price * 100),
          barcode,
          qbId,
        });
        update(sheetId.toString());
      }
    ),
  edit: generalProcedure
    .input(
      z.object({
        sheetId: z.number().int(),
        id: z.number().int(),
        name: z.string(),
        barcode: z.string().min(1),
        price: z.coerce.number().gte(0),
        qbId: z.string().optional(),
      })
    )
    .mutation(
      async ({ ctx, input: { sheetId, id, name, price, barcode, qbId } }) => {
        await checkSheetPermissions(ctx, sheetId);
        await db
          .update(labels)
          .set({
            name,
            priceCents: Math.round(price * 100),
            barcode,
            qbId,
          })
          .where(eq(labels.id, id));
        update(sheetId.toString());
      }
    ),
  duplicate: generalProcedure
    .input(
      z.object({
        sheetId: z.number().int(),
        id: z.number().int(),
      })
    )
    .mutation(async ({ ctx, input: { sheetId, id } }) => {
      await checkSheetPermissions(ctx, sheetId);
      const label = await db.query.labels.findFirst({
        where: (labels, { eq }) => eq(labels.id, id),
      });
      if (!label) throw new TRPCError({ code: "BAD_REQUEST" });
      await db.insert(labels).values({
        sheet: sheetId,
        name: label.name,
        priceCents: label.priceCents,
        barcode: label.barcode,
        qbId: label.qbId,
      });
      update(sheetId.toString());
    }),
  del: generalProcedure
    .input(
      z.object({
        sheetId: z.number().int(),
        id: z.number().int(),
      })
    )
    .mutation(async ({ ctx, input: { id, sheetId } }) => {
      await checkSheetPermissions(ctx, sheetId);
      await db.delete(labels).where(eq(labels.id, id));
      update(sheetId.toString());
    }),
});

const checkSheetPermissions = async (
  ctx: Context,
  id: number
): Promise<void> => {
  const sheet = await db.query.labelSheets.findFirst({
    where: (labelSheets, { eq }) => eq(labelSheets.id, id),
  });

  if (!sheet || ctx.user === null) throw new TRPCError({ code: "BAD_REQUEST" });

  if (
    ctx.user.permissionLevel === "admin" ||
    sheet.public ||
    sheet.owner === ctx.user.username
  )
    return;
  throw new TRPCError({ code: "UNAUTHORIZED" });
};
