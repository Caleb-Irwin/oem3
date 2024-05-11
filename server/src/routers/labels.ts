import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { Context, generalProcedure, router, viewerProcedure } from "../trpc";
import { z } from "zod";
import { labelSheets, labels } from "./labels.table";
import { eq } from "drizzle-orm";
import { eventSubscription } from "../utils/eventSubscription";

const { onUpdate, update } = eventSubscription();

export const labelsRouter = router({
  onUpdate,
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
  all: viewerProcedure
    .input(
      z.object({
        sheetId: z.number().int(),
      })
    )
    .query(async ({ ctx, input: { sheetId: id } }) => {
      await checkSheetPermissions(ctx, id);
      return await db.query.labels.findMany({ where: eq(labels.sheet, id) });
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
  if (
    ctx.user.permissionLevel === "admin" ||
    sheet.public ||
    sheet.owner === ctx.user.username
  )
    return;
  throw new TRPCError({ code: "UNAUTHORIZED" });
};
