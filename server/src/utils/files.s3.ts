import { S3Client, gzipSync, gunzipSync } from "bun";
import { db } from "../db";
import { files } from "./files.table";
import { eq } from "drizzle-orm";
import { unzipBufferToDataUrl, zipDataUrlToBuffer } from "./filesZipHelpers";

export const s3 = new S3Client({
  accessKeyId: process.env["S3_ACCESS_KEY"],
  secretAccessKey: process.env["S3_SECRET_ACCESS_KEY"],
  bucket: process.env["S3_BUCKET"],
  endpoint: process.env["S3_ENDPOINT"],
});

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

export async function downloadFile(fileId: number): Promise<string> {
  const res = await s3.file(fileId.toString()).arrayBuffer();
  const decompressed = gunzipSync(res);
  return new TextDecoder().decode(decompressed);
}

export async function deleteFile(fileId: number): Promise<void> {
  await s3.file(fileId.toString()).delete();
}

export async function getFileRefById(fileId: number): Promise<Bun.S3File | null> {
  const file = await db.query.files.findFirst({
    where: eq(files.id, fileId),
  });
  if (!file?.content?.startsWith("@")) throw new Error("File not in S3");
  if (!file?.name) return null;
  const fileName = `files/${fileId} - ${file.name.replaceAll('/', ' ')}.zip`;
  return s3.file(fileName);
}

export async function getFileRow(fileId: number) {
  const file = await db.query.files.findFirst({
    where: eq(files.id, fileId),
  });
  if (!file?.content?.startsWith("@")) throw new Error("File not in S3");
  if (!file?.name) return null;
  const innerFileName = `${fileId} - ${file.name.replaceAll('/', ' ')}`
  const fileName = `files/${innerFileName}.zip`;
  const arrayBuffer = await s3.file(fileName).arrayBuffer();
  return {
    ...file,
    content: await unzipBufferToDataUrl(arrayBuffer, innerFileName),
  };
}