import { work } from "../../../utils/workerBase";
import { Client } from "basic-ftp";
import { existsSync, mkdirSync, rmSync, createReadStream } from "fs";
import { join } from "path";
import unzipper from "unzipper";
import { sprEnhancedContent, sprImages, sprSkus } from "./table";
import { readFileSync } from "fs";
import papa from "papaparse";
import { sprFlatFile } from "../flatFile/table";
import { eq, isNull } from "drizzle-orm";
import { DEV } from "../../../config";
import { chunk } from "../../../utils/chunk";

declare var self: Worker;

const tempFolderPath = DEV ? join(process.cwd(), "temp") : "/tmp/oem3";

work({
  self,
  process: async ({ db, progress }) => {
    if (existsSync(tempFolderPath)) {
      rmSync(tempFolderPath, { recursive: true, force: true });
    }
    mkdirSync(tempFolderPath);

    const totalSteps = 13;

    const client = new Client();
    try {
      await client.access({
        host: "ftp.etilize.com",
        user: process.env["ETILIZE_USER"],
        password: process.env["ETILIZE_PASSWORD"],
        secure: true,
      });
      progress(1 / totalSteps);

      const { code: code0 } = await client.downloadTo(
        tempFolderPath + "/basic.zip",
        "/Novexco/content/EN_CA/basic/basic_EN_CA_current_mysql.zip"
      );
      progress(2 / totalSteps);

      const { code: code1 } = await client.downloadTo(
        tempFolderPath + "/sku.zip",
        "/Novexco/content/EN_CA/sku/sku_EN_CA_current_mysql.zip"
      );
      progress(3 / totalSteps);

      if (code0 !== 226 || code1 !== 226) {
        throw new Error("Download failed");
      }

      client.close();
    } catch (err) {
      client.close();
      console.log(err);
    }

    await unzipFile(tempFolderPath + "/basic.zip", tempFolderPath + "/basic");
    await unzipFile(tempFolderPath + "/sku.zip", tempFolderPath + "/sku");
    progress(4 / totalSteps);

    //images;
    const imageData = readCSV<[string, string, string]>(
      "/basic/EN_CA_B_productimages.csv"
    ).map((row): typeof sprImages.$inferInsert => {
      return {
        etilizeId: row[0],
        type: row[1],
        status: row[2] as
          | "Published"
          | "Series Published"
          | "Third Party Published"
          | "Third Party Series Published",
      };
    });
    progress(5 / totalSteps);

    await db.transaction(async (db) => {
      await db.delete(sprImages).execute();
      for (const c of chunk(imageData)) {
        await db.insert(sprImages).values(c).execute();
      }
    });
    progress(6 / totalSteps);

    //skus
    const cwsData = readCSV<[string, string, string, string, string, string]>(
        "/sku/EN_CA_SKU_CWS_A_productskus.csv"
      ).map((row): typeof sprSkus.$inferInsert => {
        return {
          etilizeId: row[0],
          type: "CWS",
          sku: row[2],
        };
      }),
      upcData = readCSV<[string, string, string, string, string, string]>(
        "/sku/EN_CA_SKU_UPC_productskus.csv"
      ).map((row): typeof sprSkus.$inferInsert => {
        return {
          etilizeId: row[0],
          type: "UPC",
          sku: row[2],
        };
      }),
      gtinData = readCSV<[string, string, string, string, string, string]>(
        "/sku/EN_CA_SKU_GTIN_productskus.csv"
      ).map((row): typeof sprSkus.$inferInsert => {
        return {
          etilizeId: row[0],
          type: "GTIN",
          sku: row[2],
        };
      }),
      sprcData = readCSV<[string, string, string, string, string, string]>(
        "/sku/EN_CA_SKU_SPRC_productskus.csv"
      ).map((row): typeof sprSkus.$inferInsert => {
        return {
          etilizeId: row[0],
          type: "SPRC",
          sku: row[2],
        };
      });
    if (existsSync(tempFolderPath)) {
      rmSync(tempFolderPath, { recursive: true, force: true });
    }
    progress(7 / totalSteps);

    await db.transaction(async (db) => {
      await db.delete(sprSkus).execute();
      for (const c of chunk(cwsData)) {
        await db.insert(sprSkus).values(c).execute();
      }
      for (const c of chunk(upcData)) {
        await db.insert(sprSkus).values(c).execute();
      }
      for (const c of chunk(gtinData)) {
        await db.insert(sprSkus).values(c).execute();
      }
      for (const c of chunk(sprcData)) {
        await db.insert(sprSkus).values(c).execute();
      }
    });
    progress(8 / totalSteps);

    //enhanced content
    await db.transaction(async (db) => {
      const missingEtilizeItems = await db
        .select({ etilizeId: sprFlatFile.etilizeId })
        .from(sprFlatFile)
        .leftJoin(
          sprEnhancedContent,
          eq(sprFlatFile.etilizeId, sprEnhancedContent.etilizeId)
        )
        .where(isNull(sprEnhancedContent.id))
        .execute();
      progress(9 / totalSteps);

      const lastUpdated = Date.now();

      for (const c of chunk(
        missingEtilizeItems
          .map(({ etilizeId }) => ({ etilizeId, lastUpdated }))
          .filter((v) => v.etilizeId) as {
          etilizeId: string;
          lastUpdated: number;
        }[]
      )) {
        await db.insert(sprEnhancedContent).values(c).execute();
      }
      progress(10 / totalSteps);

      const enhancedContentRows = await db.query.sprEnhancedContent
        .findMany({ with: { images: true, skus: true } })
        .execute();
      progress(11 / totalSteps);

      for (const row of enhancedContentRows) {
        const primaryImages = row.images
            .filter(
              (v) =>
                ["Large", "Original"].includes(v.type) ||
                !isNaN(parseInt(v.type))
            )
            .map((v) => v.type),
          otherImages = row.images
            .filter(
              (v) =>
                !primaryImages.includes(v.type) &&
                !["Thumbnail"].includes(v.type)
            )
            .map((v) => v.type),
          orderedOtherImages = [
            otherImages.includes("FrontMaximum")
              ? "FrontMaximum"
              : otherImages.includes("Front")
              ? "Front"
              : null,
            otherImages.includes("RearMaximum")
              ? "RearMaximum"
              : otherImages.includes("Rear")
              ? "Rear"
              : null,
            otherImages.includes("TopMaximum")
              ? "TopMaximum"
              : otherImages.includes("Top")
              ? "Top"
              : null,
            otherImages.includes("BottomMaximum")
              ? "BottomMaximum"
              : otherImages.includes("Bottom")
              ? "Bottom"
              : null,
            otherImages.includes("LeftMaximum")
              ? "LeftMaximum"
              : otherImages.includes("Left")
              ? "Left"
              : null,
            otherImages.includes("RightMaximum")
              ? "RightMaximum"
              : otherImages.includes("Right")
              ? "Right"
              : null,
            otherImages.includes("360-main-view") ? "360-main-view" : null,
            otherImages.includes("In-Package") ? "In-Package" : null,
            otherImages.includes("Out-of-Package") ? "Out-of-Package" : null,
            otherImages.includes("Life-Style") ? "Life-Style" : null,
            otherImages.includes("Labeled-Images") ? "Labeled-Images" : null,
            otherImages.includes("Collections") ? "Collections" : null,
            otherImages.includes("Hero-Shot") ? "Hero-Shot" : null,
            otherImages.includes("Zoom-Closeup") ? "Zoom-Closeup" : null,
            otherImages.includes("Finish") ? "Finish" : null,
            otherImages.includes("Frame") ? "Frame" : null,
            otherImages.includes("Shell") ? "Shell" : null,
            ...otherImages
              .filter((v) => v.startsWith("Alternate-Image"))
              .sort((a, b) => parseInt(a.slice(15)) - parseInt(b.slice(15))),
            otherImages.includes("Jack-Pack") ? "Jack-Pack" : null,
            otherImages.includes("Screenshot1") ? "Screenshot1" : null,
            otherImages.includes("Screenshot2") ? "Screenshot2" : null,
            otherImages.includes("Screenshot3") ? "Screenshot3" : null,
            otherImages.includes("Screenshot4") ? "Screenshot4" : null,
            otherImages.includes("Screenshot5") ? "Screenshot5" : null,
            otherImages.includes("Screenshot6") ? "Screenshot6" : null,
            otherImages.includes("Swatch") ? "Swatch" : null,
          ].filter((v) => v !== null) as string[];

        const n: Partial<typeof sprEnhancedContent.$inferInsert> = {
          sprc: row.skus.find((v) => v.type === "SPRC")?.sku ?? null,
          cws: row.skus.find((v) => v.type === "CWS")?.sku ?? null,
          upc: row.skus.find((v) => v.type === "UPC")?.sku ?? null,
          gtin: row.skus.find((v) => v.type === "GTIN")?.sku ?? null,
          primaryImage: primaryImages
            .filter((v) => !isNaN(parseInt(v)))
            .sort((a, b) => parseInt(b) - parseInt(a))[0],
          otherImagesJsonArr: JSON.stringify(orderedOtherImages),
          allSizesJsonArr: JSON.stringify(row.images.map((v) => v.type)),
          deleted: false,
          lastUpdated,
        };
        if (
          row.etilizeId &&
          (row.sprc !== n.sprc ||
            row.cws !== n.cws ||
            row.upc !== n.upc ||
            row.gtin !== n.gtin ||
            row.primaryImage !== n.primaryImage ||
            row.otherImagesJsonArr !== n.otherImagesJsonArr ||
            row.allSizesJsonArr !== n.allSizesJsonArr)
        ) {
          await db
            .update(sprEnhancedContent)
            .set(n)
            .where(eq(sprEnhancedContent.etilizeId, row.etilizeId))
            .execute();
        }
      }
      progress(12 / totalSteps);

      // Deleted Flag
      const nowDeletedEnhancedItems = await db
        .select({ id: sprEnhancedContent.id })
        .from(sprEnhancedContent)
        .leftJoin(
          sprFlatFile,
          eq(sprEnhancedContent.etilizeId, sprFlatFile.etilizeId)
        )
        .where(isNull(sprFlatFile.id))
        .execute();

      for (const row of nowDeletedEnhancedItems) {
        await db
          .update(sprEnhancedContent)
          .set({ deleted: true })
          .where(eq(sprEnhancedContent.id, row.id))
          .execute();
      }
    });
  },
});

function readCSV<T>(filePath: string): T[] {
  const { data } = papa.parse<T>(
    readFileSync(tempFolderPath + filePath).toString(),
    {
      header: false,
    }
  );
  data.pop(); //Last row empty
  return data;
}

async function unzipFile(zipFile: string, outputFolder: string) {
  try {
    await createReadStream(zipFile)
      .pipe(unzipper.Extract({ path: outputFolder }))
      .promise();
  } catch (error) {
    console.log(error);
    throw new Error(`Error during unzipping`);
  }
}
