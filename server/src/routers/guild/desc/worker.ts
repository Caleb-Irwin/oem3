import { work } from "../../../utils/workerBase";
import DOMPurify from "isomorphic-dompurify";
import { SessionManager } from "./sessionManager";
import type { ProductRes } from "./productRes";
import { guildDescriptions } from "./table";
import PromisePool from "@supercharge/promise-pool";
import { eq } from "drizzle-orm";

declare var self: Worker;

work({
  self,
  process: async ({ db, progress }) => {
    const guildList = (
      await db.query.guildData
        .findMany({
          columns: { gid: true, lastUpdated: true },
          with: { desc: true },
          where: (guildData, { not }) => not(guildData.deleted),
        })
        .execute()
    ).filter((v) => {
      return (
        !v.desc ||
        (v.desc.timesScrapeFailed < 3 && !v.desc.found) ||
        v.desc.lastUpdated < v.lastUpdated
      );
    });

    console.log("Descriptions to scrape: " + guildList.length);

    let itemsProcessed = 0,
      fail = 0,
      success = 0,
      total = guildList.length;

    await PromisePool.withConcurrency(10)
      .for(new Array(10).fill(null))
      .process(async () => {
        const session = new SessionManager();
        session.init();

        while (guildList.length > 0) {
          const next = guildList.pop();
          if (!next) break;
          await addDescription(next.gid, session);
          itemsProcessed++;
          if (itemsProcessed % 20 === 0) {
            progress(itemsProcessed / total);
          }
        }
      });

    console.log(
      `Description scrape finished - ${fail} failed, ${success} succeeded`
    );

    async function addDescription(
      guildId: string,
      session: InstanceType<typeof SessionManager>
    ): Promise<void> {
      const prev = await db.query.guildDescriptions
        .findFirst({
          where: (guildDescriptions, { eq }) =>
            eq(guildDescriptions.gid, guildId),
        })
        .execute();

      try {
        const res = await session.req(
          "/productDetailInfo",
          {},
          {
            customQuery: {
              sku: guildId,
            },
          }
        );

        if (res.status === 404) {
          await failed(true);
          return;
        }

        const raw = (await res.json()) as ProductRes;

        if (!raw.items[0]) return failed();

        const {
          name,
          itemPrice,
          uom,
          mediaDtos,
          longDescription: longDescHtml,
        } = raw.items[0];

        const row = {
          gid: guildId,
          sanitizedDescription: DOMPurify.sanitize(longDescHtml),
          imageListJSON: JSON.stringify(
            mediaDtos
              .filter(
                (v) =>
                  v.type === "DefaultImage" || v.type === "AdditionalImages"
              )
              .map((v) => v.path)
          ),
          name,
          uom: uom ? uom.toString() : null,
          price: itemPrice.toString(),
          rawResult: JSON.stringify(raw),
          found: true,
          timesScrapeFailed: 0,
          deleted: false,
          lastUpdated: new Date().getTime(),
        };

        await db
          .insert(guildDescriptions)
          .values(row)
          .onConflictDoUpdate({
            target: guildDescriptions.gid,
            set: row,
          })
          .execute();
        success++;
      } catch (e) {
        console.log(e);
        await failed();
      }

      async function failed(was404 = false) {
        fail++;
        if (prev) {
          await db
            .update(guildDescriptions)
            .set({
              timesScrapeFailed: prev.timesScrapeFailed + 1,
              deleted: prev.found && was404,
              lastUpdated: new Date().getTime(),
            })
            .where(eq(guildDescriptions.gid, guildId))
            .execute();
        } else {
          await db
            .insert(guildDescriptions)
            .values({
              gid: guildId,
              found: false,
              timesScrapeFailed: 1,
              deleted: false,
              lastUpdated: new Date().getTime(),
            })
            .execute();
        }
      }
    }
  },
});
