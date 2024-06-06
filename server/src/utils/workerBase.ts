import { eq } from "drizzle-orm";
import { files } from "./files.table";
import { Client } from "pg";
import { POSTGRESQL } from "../env";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db.schema";

export interface WorkerMessage {
  type: "ready" | "verifyed" | "progress" | "done" | "error";
  msg?: string;
}

export const work = async (
  self: Worker,
  verify: (params: {
    db: NodePgDatabase<typeof schema>;
    fileBlob: string;
  }) => Promise<number>,
  processFunc: (params: {
    db: NodePgDatabase<typeof schema>;
    fileBlob: string;
    incrementProgress: (by?: number) => void;
  }) => Promise<void>
) => {
  const sendMessage = (
    type: WorkerMessage["type"],
    msg?: WorkerMessage["msg"]
  ) => {
    self.postMessage({ type, msg });
  };

  const client = new Client({
    connectionString: POSTGRESQL,
  });
  await client.connect();
  const db = drizzle(client, { schema });

  self.onmessage = async (event: MessageEvent) => {
    try {
      await db.transaction(
        async (tx) => {
          const fileId = event.data.fileId;
          if (typeof fileId !== "number")
            throw new Error("No fileId was provided!");
          const fileRecord = await tx.query.files.findFirst({
            where: eq(files.id, fileId),
          });
          if (!fileRecord?.content)
            throw new Error("No file with id " + fileId);
          const total = await verify({ db: tx, fileBlob: fileRecord.content });
          sendMessage("verifyed");
          let done = 0;
          await processFunc({
            db: tx,
            fileBlob: fileRecord.content,
            incrementProgress: (by = 1) => {
              done += by;
              sendMessage(
                "progress",
                (done / (total <= 0 ? 1 : total)).toString()
              );
            },
          });
        },
        { isolationLevel: "repeatable read" }
      );
      sendMessage("done");
      await client.end();
      process.exit();
    } catch (e: any) {
      sendMessage("error", e["message"] ?? "Unknown Error Occurred");
      console.log(e);
      process.exit();
    }
  };

  sendMessage("ready");
};
