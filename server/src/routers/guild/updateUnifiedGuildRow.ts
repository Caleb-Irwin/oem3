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
  let item = await db.query.unifiedGuild
    .findFirst({
      where: eq(unifiedGuild.id, id),
      with: {
        dataRowContent: true,
        inventoryRowContent: true,
        flyerRowContent: true,
        uniref: true,
      },
    })
    .execute();

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

    item = await db.query.unifiedGuild
      .findFirst({
        where: eq(unifiedGuild.id, id),
        with: {
          dataRowContent: true,
          inventoryRowContent: true,
          flyerRowContent: true,
          uniref: true,
        },
      })
      .execute();
    if (!item) throw new Error(`This should never happen (UnifiedGuild#${id})`);
  }

  // FLATTEN

  // Add History
  await insertHistory({
    db,
    uniref: item.uniref.uniId,
    prev: item,
    resourceType: "unifiedGuild",
    entryType: "update",
    data: matchChanges,
    created: Date.now(),
  });

  return;
}
