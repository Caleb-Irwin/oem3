import { S3Client, gzipSync, gunzipSync } from "bun";

const s3 = new S3Client({
  accessKeyId: process.env["S3_ACCESS_KEY"],
  secretAccessKey: process.env["S3_SECRET_ACCESS_KEY"],
  bucket: process.env["S3_BUCKET"],
  endpoint: process.env["S3_ENDPOINT"],
});

export async function uploadFile(
  fileId: number,
  content: string
): Promise<void> {
  const encoded = new TextEncoder().encode(content);
  await s3.file(fileId.toString()).write(gzipSync(encoded));
}

export async function downloadFile(fileId: number): Promise<string> {
  const res = await s3.file(fileId.toString()).arrayBuffer();
  const decompressed = gunzipSync(res);
  return new TextDecoder().decode(decompressed);
}

export async function deleteFile(fileId: number): Promise<void> {
  await s3.file(fileId.toString()).delete();
}
