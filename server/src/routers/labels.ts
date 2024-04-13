import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { Context, generalProcedure, router, viewerProcedure } from "../trpc";
import { z } from "zod";
import { labelSheets, labels } from "../../db/db";
import { eq } from "drizzle-orm";
import { eventSubscription } from "../utils/eventSubscription";

const { onUpdate, update } = eventSubscription();

export const labelsRouter = router({
  // all: viewerProcedure
  //   .input(
  //     z.object({
  //       sheetId: z.number().int(),
  //     })
  //   )
  //   .query(async ({ ctx, input: { sheetId: id } }) => {
  //     await checkSheetPermissions(ctx, id);
  //     return await db.query.labels.findMany({ where: eq(labels.sheet, id) });
  //   }),
  sheet: {
    onUpdate,
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
        update();
      }),
    rename: generalProcedure
      .input(
        z.object({
          id: z.number().int(),
          name: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input: { id, name } }) => {
        await checkSheetPermissions(ctx, id);
        await db
          .update(labelSheets)
          .set({ name })
          .where(eq(labelSheets.id, id));
        update();
      }),
  },
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
