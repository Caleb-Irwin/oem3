import { eq } from "drizzle-orm";
import { db } from "../db";
import { downloadFile } from "./files.s3";
import { files } from "./files.table";

export async function getFileRow(fileId: number) {
  const row = await db.query.files.findFirst({
    where: eq(files.id, fileId),
  });
  if (!row) return null;
  if (row.content?.startsWith("@")) row.content = await downloadFile(fileId);
  return row;
}
