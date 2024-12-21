import { and, eq, not } from "drizzle-orm";
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
    freightFlag: item.dataRowContent.freightFlag,
    deleted: item.dataRowContent.deleted,
  };

  const changes: Partial<typeof unifiedGuild.$inferInsert> = {};
  for (const key of Object.keys(transformed) as (keyof typeof transformed)[]) {
    if (transformed[key] !== item[key]) {
      //@ts-expect-error
      changes[key] = transformed[key];
    }
  }

  if (Object.keys(changes).length > 0) {
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
