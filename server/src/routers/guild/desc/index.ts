import { z } from "zod";
import { generalProcedure, router } from "../../../trpc";
import { SessionManager } from "./sessionManager";
import type { ProductRes } from "./productRes";
import { TRPCError } from "@trpc/server";

export const descRouter = router({
  getProduct: generalProcedure
    .input(z.object({ guildId: z.string() }))
    .mutation(async ({ input }) => {
      const session = new SessionManager();
      session.init();
      try {
        const res = await session.req(
          "/productDetailInfo",
          {},
          {
            customQuery: {
              sku: input.guildId,
            },
          },
          fetch
        );

        if (res.status === 404) {
          throw new TRPCError({
            message: "Failed to find product",
            code: "NOT_FOUND",
          });
        }

        const raw = (await res.json()) as ProductRes;
        const {
          name,
          itemPrice: price,
          uom,
          mediaDtos,
          outOfStock,
          longDescription: longDescHtml,
          displayAttributes: displayAttributesHtml,
        } = raw.items[0];

        return {
          sku: input.guildId,
          name,
          price,
          uom,
          images: mediaDtos
            .filter(
              (v) => v.type === "DefaultImage" || v.type === "AdditionalImages"
            )
            .map((v, i) => ({
              src: v.path,
              alt: `Image #${i} for ${input.guildId}`,
            })),
          inStock: !outOfStock,
          onSale: raw.onSale,
          longDescHtml,
          displayAttributesHtml,
        };
      } catch (e) {
        console.log(e);
        throw new TRPCError({
          message: "Failed to get product",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
});
