import { and, eq, not, or } from "drizzle-orm";
import { db as DB } from "../../db";
import { unifiedGuild } from "./table";
import { guildInventory } from "./inventory/table";
import { insertHistory } from "../../utils/history";
import { guildFlyer } from "./flyer/table";

export async function updateUnifiedGuildRow(
  id: number,
  db: typeof DB = DB
): Promise<void> {
  const getItem = () =>
    db.query.unifiedGuild
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

  let item = await getItem();

  if (!item) {
    throw new Error(`No Item Found (UnifiedGuild#${id})`);
  }

  const matchChanges: Partial<typeof unifiedGuild.$inferSelect> = {};

  // Update Inventory Match
  if (!item.inventoryRow || item.inventoryRowContent?.deleted) {
    matchChanges.inventoryRow = null;
    const rows = await db.query.guildInventory
      .findMany({
        where: and(
          eq(guildInventory.gid, item.gid),
          not(guildInventory.deleted)
        ),
        with: { uniref: true },
      })
      .execute();
    if (rows.length !== 0) {
      if (rows.length > 1) {
        throw new Error(
          `Multiple Inventory Rows Found (GuildInventory#${item.gid})`
        );
      } else {
        matchChanges.inventoryRow = rows[0].id;
      }
    }
  }

  // Update Flyer Match
  if (!item.flyerRow || item.flyerRowContent?.deleted) {
    matchChanges.flyerRow = null;
    const rows = await db.query.guildFlyer
      .findMany({
        where: and(eq(guildFlyer.gid, item.gid), not(guildFlyer.deleted)),
        with: { uniref: true },
      })
      .execute();

    if (rows.length !== 0) {
      if (rows.length > 1) {
        throw new Error(
          `Multiple Inventory Rows Found (GuildFlyer#${item.gid})`
        );
      } else {
        matchChanges.flyerRow = rows[0].id;
      }
    }
  }

  if (Object.keys(matchChanges).length > 0) {
    await db
      .update(unifiedGuild)
      .set(matchChanges)
      .where(eq(unifiedGuild.id, id))
      .execute();

    item = await getItem();
    if (!item) throw new Error(`This should never happen (UnifiedGuild#${id})`);
  }

  // FLATTEN

  const transformed: Partial<typeof unifiedGuild.$inferInsert> = {
    upc: item.dataRowContent.upc, //TODO Compare with inventory row
    spr: item.dataRowContent.spr, //TODO Compare with inventory row
    basics: item.dataRowContent.basics, //TODO Compare with inventory row
    cis: item.dataRowContent.cis, //TODO Compare with inventory row
    title: item.dataRowContent.shortDesc,
    description:
      item.dataRowContent.desc?.sanitizedDescription ||
      item.dataRowContent.longDesc,
    priceCents:
      item.flyerRowContent?.flyerPriceL1Cents ??
      item.dataRowContent.priceL1Cents,
    comparePriceCents: item.flyerRowContent?.flyerPriceL1Cents
      ? item.dataRowContent.priceL1Cents
      : null,
    costCents:
      (item.dataRowContent.dropshipPriceCents === -1
        ? null
        : item.dataRowContent.dropshipPriceCents) ??
      (item.dataRowContent.memberPriceCents === -1
        ? null
        : item.dataRowContent.memberPriceCents),
    um: item.dataRowContent.um, //TODO Compare with inventory row
    qtyPerUm: item.dataRowContent.standardPackQty, //TODO Compare with inventory row
    masterPackQty: item.dataRowContent.masterPackQty,
    imageUrl:
      (item.dataRowContent.desc?.imageListJSON
        ? JSON.parse(item.dataRowContent.desc?.imageListJSON)[0] ?? null
        : null) ?? item.dataRowContent.imageURL,
    imageDescriptions: `Image of ${item.gid}`,
    otherImageListJSON:
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
        : null,
    vendor: item.dataRowContent.vendor,
    category:
      categoryMap[item.dataRowContent.webCategory.toString().slice(0, 1)] ??
      null,
    weightGrams: item.dataRowContent.weightGrams,
    heavyGoodsChargeSkCents: item.dataRowContent.heavyGoodsChargeSkCents,
    inventory: item.inventoryRowContent?.onHand ?? null,
    freightFlag: item.dataRowContent.freightFlag,
    deleted: item.dataRowContent.deleted,
  };

  const changes: Partial<typeof unifiedGuild.$inferInsert> = {
    lastUpdated: Date.now(),
  };
  for (const key of Object.keys(transformed) as (keyof typeof transformed)[]) {
    if (transformed[key] !== item[key]) {
      //@ts-expect-error
      changes[key] = transformed[key];
    }
  }

  if (Object.keys(changes).length > 1) {
    await db
      .update(unifiedGuild)
      .set(changes)
      .where(eq(unifiedGuild.id, id))
      .execute();
  }

  if (Object.keys(changes).length > 0 || Object.keys(matchChanges).length > 0)
    await insertHistory({
      db,
      uniref: item.uniref.uniId,
      prev: item,
      resourceType: "unifiedGuild",
      entryType: "update",
      data: { ...matchChanges, ...changes },
      created: Date.now(),
    });
}

// NEW VERSION (IN PROGRESS)
import { createUnifier, type TableConnections } from "../../utils/unifier";
import { guildData } from "./data/table";

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

export const unifyGuild = createUnifier<GuildRowType, typeof unifiedGuild>({
  table: unifiedGuild,
  getRow,
  transform: (item, t) => {
    return {
      id: t("id", item.id),
      gid: t("gid", item.gid, { neverNull: true }),
      lastUpdated: t("lastUpdated", item.lastUpdated),

      dataRow: t("dataRow", item.dataRow, { neverNull: true, isRef: true }),
      inventoryRow: t("inventoryRow", item.inventoryRow, { shouldNotBeNull: true, isRef: true }),
      flyerRow: t("flyerRow", item.flyerRow ?? null, { isRef: true }),

      upc: t("upc", item.dataRowContent.upc, { shouldMatch: { name: "Guild Inventory UPC", val: item.inventoryRowContent?.upc ?? null, ignore: item.inventoryRowContent === null } }),
      spr: t("spr", item.dataRowContent.spr, { shouldMatch: { name: "Guild Inventory SPR Product ID", val: item.inventoryRowContent?.spr ?? null, ignore: item.inventoryRowContent === null } }),
      basics: t("basics", item.dataRowContent.basics, { shouldMatch: { name: "Guild Inventory Basics Product ID", val: item.inventoryRowContent?.basics ?? null, ignore: item.inventoryRowContent === null } }),
      cis: t("cis", item.dataRowContent.cis, { shouldMatch: { name: "Guild Inventory CIS Product ID", val: item.inventoryRowContent?.cis ?? null, ignore: item.inventoryRowContent === null } }),
      title: t("title", item.dataRowContent.shortDesc),
      description:
        t("description", item.dataRowContent.desc?.sanitizedDescription ||
          item.dataRowContent.longDesc),
      priceCents:
        t("priceCents", item.flyerRowContent?.flyerPriceL1Cents ??
          item.dataRowContent.priceL1Cents, {
          neverNull: true,
          isPrice: true,
        }),
      comparePriceCents: t("comparePriceCents", item.flyerRowContent?.flyerPriceL1Cents
        ? item.dataRowContent.priceL1Cents
        : null, {
        shouldMatch: { name: "Flyer Regular Price", val: item.flyerRowContent?.flyerPriceL1Cents ?? null, ignore: item.flyerRowContent === null || item.flyerRowContent?.deleted },
      }),
      costCents:
        t("costCents", (item.dataRowContent.dropshipPriceCents === -1
          ? null
          : item.dataRowContent.dropshipPriceCents) ??
          (item.dataRowContent.memberPriceCents === -1
            ? null
            : item.dataRowContent.memberPriceCents)),
      um: t("um", item.dataRowContent.um, { shouldMatch: { name: "Guild Inventory UM", val: item.inventoryRowContent?.um ?? null, ignore: item.inventoryRowContent === null } }),
      qtyPerUm: t("qtyPerUm", item.dataRowContent.standardPackQty, { shouldMatch: { name: "Guild Inventory Qty Per UM", val: item.inventoryRowContent?.qtyPerUm ?? null, ignore: item.inventoryRowContent === null } }),
      masterPackQty: t("masterPackQty", item.dataRowContent.masterPackQty),
      imageUrl:
        t("imageUrl", (item.dataRowContent.desc?.imageListJSON
          ? JSON.parse(item.dataRowContent.desc?.imageListJSON)[0] ?? null
          : null) ?? item.dataRowContent.imageURL),
      imageDescriptions: t("imageDescriptions", `Image of ${item.gid}`),
      otherImageListJSON:
        t("otherImageListJSON", item.dataRowContent.desc?.imageListJSON &&
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
          : null),
      vendor: t("vendor", item.dataRowContent.vendor),
      category:
        t("category", categoryMap[item.dataRowContent.webCategory.toString().slice(0, 1)] ??
          null),
      weightGrams: t("weightGrams", item.dataRowContent.weightGrams),
      heavyGoodsChargeSkCents: t("heavyGoodsChargeSkCents", item.dataRowContent.heavyGoodsChargeSkCents),
      inventory: t("inventory", item.inventoryRowContent?.onHand ?? null),
      freightFlag: t("freightFlag", item.dataRowContent.freightFlag),
      deleted: t("deleted", item.dataRowContent.deleted),
    }
  },
  connections: {
    primaryTable: {
      table: guildData,
      refCol: "dataRow",
      recheckConnectionsOnFieldChange: ["gid", "upc"],
      findConnections: async (row, db) => {
        if (row.gid === null || row.gid === '') return [];
        const res = await db.query.guildData.findMany({
          where: and(
            eq(guildData.gid, row.gid),
            not(guildData.deleted)
          ),
          columns: {
            id: true,
          }
        })
        return res.map(r => r.id);
      }
    } satisfies TableConnections<GuildRowType, typeof guildData>,
    otherTables: [
      {
        table: guildInventory,
        refCol: "inventoryRow",
        recheckConnectionsOnFieldChange: ["gid", "upc"],
        findConnections: async (row, db) => {
          if ((row.gid === null || row.gid === '') && (row.dataRowContent === null || row.dataRowContent.upc === '' || row.dataRowContent.upc === null))
            return []
          const rows = await db.query.guildInventory.findMany({
            where:
              or(
                row.gid !== null && row.gid !== '' ? and(
                  eq(guildInventory.gid, row.gid),
                  not(guildInventory.deleted)
                ) : undefined,
                row.dataRowContent !== null && row.dataRowContent.upc !== null && row.dataRowContent.upc !== '' ? and(
                  eq(guildInventory.upc, row.dataRowContent.upc),
                  not(guildInventory.deleted)
                ) : undefined
              ),
            columns: {
              id: true,
            }
          }).execute();
          return rows.map(r => r.id);
        },
      },
      {
        table: guildFlyer,
        refCol: "flyerRow",
        recheckConnectionsOnFieldChange: ["gid"],
        findConnections: async (row, db) => {
          if (row.gid === null || row.gid === '') return [];
          const res = await db.query.guildFlyer.findMany({
            where: and(
              eq(guildFlyer.gid, row.gid),
              not(guildFlyer.deleted)
            ),
            columns: {
              id: true,
            }
          }).execute();
          return res.map(r => r.id);
        }
      }
    ]
  }
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
