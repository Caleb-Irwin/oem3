import { and, eq, not, or } from "drizzle-orm";
import { db as DB } from "../../db";
import { createUnifier } from "../../utils/unifier";
import {
  unifiedGuild,
  guildData,
  guildInventory,
  guildFlyer,
} from "../../db.schema";

const getRow = async (id: number, db: typeof DB) => {
  const res = await db.query.unifiedGuild
    .findFirst({
      where: eq(unifiedGuild.id, id),
      with: {
        dataRowContent: {
          with: {
            desc: true,
          },
        },
        inventoryRowContent: true,
        flyerRowContent: true,
        uniref: true,
      },
    })
    .execute();
  if (res === undefined) throw new Error(`UnifiedGuild#${id} not found`);
  return res;
};

type GuildRowType = Awaited<ReturnType<typeof getRow>>;

export const guildUnifier = createUnifier<GuildRowType, typeof unifiedGuild>({
  table: unifiedGuild,
  version: 1,
  getRow,
  transform: (item, t) => {
    return {
      id: t("id", item.id),
      gid: t("gid", item.gid, { neverNull: true }),
      lastUpdated: t("lastUpdated", item.lastUpdated),

      dataRow: t("dataRow", item.dataRow, { neverNull: true, isRef: true }),
      inventoryRow: t("inventoryRow", item.inventoryRow, {
        shouldNotBeNull: true,
        isRef: true,
      }),
      flyerRow: t("flyerRow", item.flyerRow ?? null, { isRef: true }),

      upc: t("upc", item.dataRowContent.upc, {
        shouldMatch: {
          name: "Guild Inventory UPC",
          val: item.inventoryRowContent?.upc ?? null,
          ignore: item.inventoryRowContent === null,
        },
      }),
      spr: t("spr", item.dataRowContent.spr, {
        shouldMatch: {
          name: "Guild Inventory SPR Product ID",
          val: item.inventoryRowContent?.spr ?? null,
          ignore: item.inventoryRowContent === null,
        },
      }),
      basics: t("basics", item.dataRowContent.basics, {
        shouldMatch: {
          name: "Guild Inventory Basics Product ID",
          val: item.inventoryRowContent?.basics ?? null,
          ignore: item.inventoryRowContent === null,
        },
      }),
      cis: t("cis", item.dataRowContent.cis, {
        shouldMatch: {
          name: "Guild Inventory CIS Product ID",
          val: item.inventoryRowContent?.cis ?? null,
          ignore: item.inventoryRowContent === null,
        },
      }),
      title: t("title", item.dataRowContent.shortDesc),
      description: t(
        "description",
        item.dataRowContent.desc?.sanitizedDescription ||
          item.dataRowContent.longDesc
      ),
      priceCents: t(
        "priceCents",
        item.flyerRowContent?.flyerPriceL1Cents ??
          item.dataRowContent.priceL1Cents,
        {
          neverNull: true,
          isPrice: true,
        }
      ),
      comparePriceCents: t(
        "comparePriceCents",
        item.flyerRowContent?.flyerPriceL1Cents
          ? item.dataRowContent.priceL1Cents
          : null,
        {
          shouldMatch: {
            name: "Flyer Regular Price",
            val: item.flyerRowContent?.flyerPriceL1Cents ?? null,
            ignore:
              item.flyerRowContent === null || item.flyerRowContent?.deleted,
          },
        }
      ),
      costCents: t(
        "costCents",
        (item.dataRowContent.dropshipPriceCents === -1
          ? null
          : item.dataRowContent.dropshipPriceCents) ??
          (item.dataRowContent.memberPriceCents === -1
            ? null
            : item.dataRowContent.memberPriceCents)
      ),
      um: t("um", item.dataRowContent.um, {
        shouldMatch: {
          name: "Guild Inventory UM",
          val: item.inventoryRowContent?.um ?? null,
          ignore: item.inventoryRowContent === null,
        },
      }),
      qtyPerUm: t("qtyPerUm", item.dataRowContent.standardPackQty, {
        shouldMatch: {
          name: "Guild Inventory Qty Per UM",
          val: item.inventoryRowContent?.qtyPerUm ?? null,
          ignore: item.inventoryRowContent === null,
        },
      }),
      masterPackQty: t("masterPackQty", item.dataRowContent.masterPackQty),
      imageUrl: t(
        "imageUrl",
        (item.dataRowContent.desc?.imageListJSON
          ? JSON.parse(item.dataRowContent.desc?.imageListJSON)[0] ?? null
          : null) ?? item.dataRowContent.imageURL
      ),
      imageDescriptions: t("imageDescriptions", `Image of ${item.gid}`),
      otherImageListJSON: t(
        "otherImageListJSON",
        item.dataRowContent.desc?.imageListJSON &&
          JSON.parse(item.dataRowContent.desc?.imageListJSON).length > 1
          ? JSON.stringify(
              (
                JSON.parse(item.dataRowContent.desc?.imageListJSON).slice(
                  1
                ) as string[]
              ).map((url, idx) => ({
                url,
                description: `Alternate image #${idx + 1} of ${item.gid}`,
              }))
            )
          : null
      ),
      vendor: t("vendor", item.dataRowContent.vendor),
      category: t(
        "category",
        categoryMap[item.dataRowContent.webCategory.toString().slice(0, 1)] ??
          null
      ),
      weightGrams: t("weightGrams", item.dataRowContent.weightGrams),
      heavyGoodsChargeSkCents: t(
        "heavyGoodsChargeSkCents",
        item.dataRowContent.heavyGoodsChargeSkCents
      ),
      inventory: t("inventory", item.inventoryRowContent?.onHand ?? null),
      freightFlag: t("freightFlag", item.dataRowContent.freightFlag),
      deleted: t("deleted", item.dataRowContent.deleted),
    };
  },
  connections: {
    primaryTable: {
      table: guildData,
      refCol: "dataRow",
      recheckConnectionsOnFieldChange: ["gid", "upc"],
      findConnections: async (row, db) => {
        if (row.gid === null || row.gid === "") return [];
        const res = await db.query.guildData.findMany({
          where: and(eq(guildData.gid, row.gid), not(guildData.deleted)),
          columns: {
            id: true,
          },
        });
        return res.map((r) => r.id);
      },
      newRowTransform: (row, lastUpdated) => {
        return {
          gid: row.gid,
          dataRow: row.id,
          lastUpdated,
          deleted: row.deleted,
        };
      },
    },
    otherTables: [
      {
        table: guildInventory,
        refCol: "inventoryRow",
        recheckConnectionsOnFieldChange: ["gid", "upc"],
        findConnections: async (row, db) => {
          if (
            (row.gid === null || row.gid === "") &&
            (row.dataRowContent === null ||
              row.dataRowContent.upc === "" ||
              row.dataRowContent.upc === null)
          )
            return [];
          const rows = await db.query.guildInventory
            .findMany({
              where: or(
                row.gid !== null && row.gid !== ""
                  ? and(
                      eq(guildInventory.gid, row.gid),
                      not(guildInventory.deleted)
                    )
                  : undefined,
                row.dataRowContent !== null &&
                  row.dataRowContent.upc !== null &&
                  row.dataRowContent.upc !== ""
                  ? and(
                      eq(guildInventory.upc, row.dataRowContent.upc),
                      not(guildInventory.deleted)
                    )
                  : undefined
              ),
              columns: {
                id: true,
              },
            })
            .execute();
          return rows.map((r) => r.id);
        },
      },
      {
        table: guildFlyer,
        refCol: "flyerRow",
        recheckConnectionsOnFieldChange: ["gid"],
        findConnections: async (row, db) => {
          if (row.gid === null || row.gid === "") return [];
          const res = await db.query.guildFlyer
            .findMany({
              where: and(eq(guildFlyer.gid, row.gid), not(guildFlyer.deleted)),
              columns: {
                id: true,
              },
            })
            .execute();
          return res.map((r) => r.id);
        },
      },
    ],
  },
});

const categoryMap = {
  "2": "officeSchool",
  "3": "officeSchool",
  "4": "furniture",
  "5": "cleaningBreakRoom",
  "6": "technology",
  "7": "inkToner",
} as {
  [key: string]:
    | "officeSchool"
    | "technology"
    | "furniture"
    | "cleaningBreakRoom"
    | "inkToner";
};
