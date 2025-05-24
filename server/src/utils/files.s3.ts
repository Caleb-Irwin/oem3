import { S3Client, gzipSync, gunzipSync } from "bun";
import { db } from "../db";
import { files, images } from "./files.table";
import { and, eq } from "drizzle-orm";
import { zipDataUrlToBuffer } from "./filesZipHelpers";

const s3 = new S3Client({
  accessKeyId: process.env["S3_ACCESS_KEY"],
  secretAccessKey: process.env["S3_SECRET_ACCESS_KEY"],
  bucket: process.env["S3_BUCKET"],
  endpoint: process.env["S3_ENDPOINT"],
});


const res = await s3.list()
for (const file of res?.contents ?? []) {
  if (isNaN(Number(file.key))) continue;
  console.log(file.key);
  await migrateFile(Number(file.key))
}


export async function uploadFile(
  fileId: number,
  content: string
): Promise<void> {
  throw new Error("New version not implemented");
  const encoded = new TextEncoder().encode(content);
  await s3.file('files/' + fileId.toString()).write(gzipSync(encoded));
}

export async function uploadFileByName(fileName: string, contentDataUrl: string): Promise<void> {
  const buff = await zipDataUrlToBuffer(contentDataUrl, fileName);
  await s3.file('files/' + fileName + '.zip').write(buff, { type: "application/zip" });
}
async function migrateFile(fileId: number) {
  const file = await downloadFile(fileId);
  const row = await db.query.files.findFirst({
    where: eq(files.id, fileId),
  });
  if (!row?.name) {
    console.log("No name found for file", fileId);
    return;
  }
  console.log("Migrating file", fileId, row.name);
  const newName = row?.name ? `${fileId} - ${row.name.replaceAll('/', ' ')}` : fileId.toString();
  await uploadFileByName(newName, file);
  await deleteFile(fileId);
  console.log("Migration complete", newName);
}

export async function downloadFile(fileId: number): Promise<string> {
  const res = await s3.file(fileId.toString()).arrayBuffer();
  const decompressed = gunzipSync(res);
  return new TextDecoder().decode(decompressed);
}

export async function deleteFile(fileId: number): Promise<void> {
  await s3.file(fileId.toString()).delete();
}

export async function uploadImage(
  {
    filePath,
    content,
    isThumb = false,
    sourceURL,
    sourceType,
    productId
  }: {
    filePath: string,
    content: string | ArrayBuffer | Blob | Buffer,
    isThumb?: boolean,
    sourceURL?: string,
    sourceHash?: string,
    sourceType?: "venxia" | "shopofficeonline",
    productId?: string
  }
) {
  await s3.file(filePath).write(content);
  await db.insert(images).values({
    filePath,
    isThumbnail: isThumb,
    sourceURL,
    sourceHash: Bun.hash(content).toString(),
    sourceType,
    productId,
    uploadedTime: Date.now(),
  });
}

export function getImageRef(filePath: string): Bun.S3File {
  return s3.file(filePath);
}

export async function getImageRefBySourceURL(
  sourceURL: string,
  thumbnail: boolean = false
): Promise<Bun.S3File | null> {
  const image = await db
    .query.images.findFirst({
      where: and(eq(images.sourceURL, sourceURL), eq(images.isThumbnail, thumbnail)),
    });
  if (!image) return null;
  return s3.file(image.filePath);
}

