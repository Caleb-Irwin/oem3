import { work } from "../../utils/workerBase";
import {
  guild,
  guildFlyer,
  guildInventory,
  qb,
  shopify,
  unifiedItems,
  uniref,
} from "../../db.schema";
import { eq, isNull, notExists, sql } from "drizzle-orm";
import type { db as DB } from "../../db";
import { insertHistory } from "../../utils/history";

declare var self: Worker;
work({
  self,
  process: async ({ db, message, progress }) => {
    console.log("unified worker started");
    const lastUpdated = Date.now();
    await db.transaction(async (db) => {
      console.time("auto match");
      console.time("addGuildItem");
      await addGuildItem(db, lastUpdated);
      console.timeEnd("addGuildItem");

      console.time("matchGuildInventory");
      await matchGuildInventory(db, lastUpdated);
      console.timeEnd("matchGuildInventory");

      console.time("matchGuildFlyer");
      await matchGuildFlyer(db, lastUpdated);
      console.timeEnd("matchGuildFlyer");

      console.time("matchQB");
      await matchQB(db, lastUpdated);
      console.timeEnd("matchQB");

      console.time("matchShopify");
      await matchShopify(db, lastUpdated);
      console.timeEnd("matchShopify");
      console.timeEnd("auto match");
    });
  },
});

const addGuildItem = async (db: typeof DB, lastUpdated: number) => {
  const guildUnaddedItems = await db
    .select()
    .from(guild)
    .leftJoin(unifiedItems, eq(guild.id, unifiedItems.guild))
    .where(isNull(unifiedItems));
  for (let i = 0; i < guildUnaddedItems.length; i++) {
    const element = guildUnaddedItems[i];
    await db.transaction(async (db) => {
      const addRes = await db
        .insert(unifiedItems)
        .values({ type: "guild", guild: element.guild.id, lastUpdated })
        .returning({ id: unifiedItems.id });
      const uniRef = await db
        .insert(uniref)
        .values({
          resourceType: "unifiedItem",
          unifiedItem: addRes[0].id,
        })
        .returning({ uniId: uniref.uniId });
      await insertHistory({
        db,
        uniref: uniRef[0].uniId,
        resourceType: "unifiedItem",
        entryType: "create",
        data: { type: "guild", guild: element.guild.id, lastUpdated },
        created: lastUpdated,
      });
    });
  }
};

const matchGuildInventory = async (db: typeof DB, lastUpdated: number) => {
  const guildInventoryUnaddedItems = await db
    .selectDistinctOn([guildInventory.id])
    .from(unifiedItems)
    .innerJoin(guild, eq(guild.id, unifiedItems.guild))
    .innerJoin(guildInventory, eq(guildInventory.gid, guild.gid))
    .where(
      notExists(
        db
          .select()
          .from(unifiedItems)
          .where(eq(unifiedItems.guildInventory, guildInventory.id))
      )
    );
  for (let i = 0; i < guildInventoryUnaddedItems.length; i++) {
    const element = guildInventoryUnaddedItems[i];
    await db.transaction(async (db) => {
      await db
        .update(unifiedItems)
        .set({ guildInventory: element.guildInventory.id, lastUpdated })
        .where(eq(unifiedItems.id, element.unifiedItems.id));
      await insertHistory({
        db,
        uniref: (
          await db.query.uniref.findFirst({
            where: eq(uniref.unifiedItem, element.unifiedItems.id),
          })
        )?.uniId as number,
        resourceType: "unifiedItem",
        entryType: "update",
        data: { guildInventory: element.guildInventory.id },
        created: lastUpdated,
        prev: element.unifiedItems,
      });
    });
  }
};

const matchGuildFlyer = async (db: typeof DB, lastUpdated: number) => {
  const guildFlyerUnaddedItems = await db
    .selectDistinctOn([guildFlyer.id])
    .from(unifiedItems)
    .innerJoin(guild, eq(guild.id, unifiedItems.guild))
    .innerJoin(guildFlyer, eq(guildFlyer.gid, guild.gid))
    .where(
      notExists(
        db
          .select()
          .from(unifiedItems)
          .where(eq(unifiedItems.guildFlyer, guildFlyer.id))
      )
    );
  for (let i = 0; i < guildFlyerUnaddedItems.length; i++) {
    const element = guildFlyerUnaddedItems[i];
    await db.transaction(async (db) => {
      await db
        .update(unifiedItems)
        .set({ guildFlyer: element.guildFlyer.id, lastUpdated })
        .where(eq(unifiedItems.id, element.unifiedItems.id));
      await insertHistory({
        db,
        uniref: (
          await db.query.uniref.findFirst({
            where: eq(uniref.unifiedItem, element.unifiedItems.id),
          })
        )?.uniId as number,
        resourceType: "unifiedItem",
        entryType: "update",
        data: { guildFlyer: element.guildFlyer.id },
        created: lastUpdated,
        prev: element.unifiedItems,
      });
    });
  }
};

const matchQB = async (db: typeof DB, lastUpdated: number) => {
  const qbUnaddedItems = await db
    .selectDistinctOn([qb.id])
    .from(unifiedItems)
    .innerJoin(guild, eq(guild.id, unifiedItems.guild))
    .innerJoin(
      qb,
      sql`
      SUBSTR(
        SUBSTR(${qb.qbId}, POSITION(':' IN ${qb.qbId}) + 1),
        LENGTH(SUBSTR(${qb.qbId}, POSITION(':' IN ${qb.qbId}) + 1)) - 10,
        10
      ) = NULLIF(SUBSTRING(${guild.upc}, LENGTH(${guild.upc}) - 10, 10), '')`
    )
    .where(
      notExists(
        db.select().from(unifiedItems).where(eq(unifiedItems.qb, qb.id))
      )
    );

  for (let i = 0; i < qbUnaddedItems.length; i++) {
    const element = qbUnaddedItems[i];
    await db.transaction(async (db) => {
      await db
        .update(unifiedItems)
        .set({ qb: element.qb.id, lastUpdated })
        .where(eq(unifiedItems.id, element.unifiedItems.id));
      await insertHistory({
        db,
        uniref: (
          await db.query.uniref.findFirst({
            where: eq(uniref.unifiedItem, element.unifiedItems.id),
          })
        )?.uniId as number,
        resourceType: "unifiedItem",
        entryType: "update",
        data: { qb: element.qb.id },
        created: lastUpdated,
        prev: element.unifiedItems,
      });
    });
  }
};

const matchShopify = async (db: typeof DB, lastUpdated: number) => {
  const shopifyUnaddedItems = await db
    .selectDistinctOn([shopify.id])
    .from(unifiedItems)
    .innerJoin(guild, eq(guild.id, unifiedItems.guild))
    .innerJoin(shopify, eq(shopify.vBarcode, guild.upc))
    .where(
      notExists(
        db
          .select()
          .from(unifiedItems)
          .where(eq(unifiedItems.shopify, shopify.id))
      )
    );

  for (let i = 0; i < shopifyUnaddedItems.length; i++) {
    const element = shopifyUnaddedItems[i];
    await db.transaction(async (db) => {
      await db
        .update(unifiedItems)
        .set({ shopify: element.shopify.id, lastUpdated })
        .where(eq(unifiedItems.id, element.unifiedItems.id));
      await insertHistory({
        db,
        uniref: (
          await db.query.uniref.findFirst({
            where: eq(uniref.unifiedItem, element.unifiedItems.id),
          })
        )?.uniId as number,
        resourceType: "unifiedItem",
        entryType: "update",
        data: { shopify: element.shopify.id },
        created: lastUpdated,
        prev: element.unifiedItems,
      });
    });
  }
};
