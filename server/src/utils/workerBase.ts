import { eq } from "drizzle-orm";
import { files } from "./files.table";
import { Client } from "pg";
import { POSTGRESQL } from "../env";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db.schema";
import { createChangeset } from "./changeset";

export interface WorkerMessage {
  type:
    | "ready"
    | "verified"
    | "progress"
    | "done"
    | "changesetUpdate"
    | "error";
  msg?: string;
}

export const work = async (
  self: Worker,
  changesetTable: schema.ChangesetTable,
  verify: (params: {
    db: NodePgDatabase<typeof schema>;
    fileBlob: string;
  }) => Promise<void>,
  processFunc: (params: {
    db: NodePgDatabase<typeof schema>;
    fileBlob: string;
    progress: (percentDone: number) => void;
    changeset: Awaited<ReturnType<typeof createChangeset>>;
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
    let changeset: Awaited<ReturnType<typeof createChangeset>> | undefined =
      undefined;

    try {
      const fileId = event.data.fileId;
      changeset = await createChangeset(changesetTable, fileId, () =>
        sendMessage("changesetUpdate")
      );
      await db.transaction(
        async (tx) => {
          changeset = changeset as Awaited<ReturnType<typeof createChangeset>>;
          if (typeof fileId !== "number")
            throw new Error("No fileId was provided!");

          const fileRecord = await tx.query.files.findFirst({
            where: eq(files.id, fileId),
          });
          if (!fileRecord?.content)
            throw new Error("No file with id " + fileId);
          await verify({ db: tx, fileBlob: fileRecord.content });
          sendMessage("verified");
          await processFunc({
            db: tx,
            fileBlob: fileRecord.content,
            progress: (amountDone) => {
              sendMessage("progress", amountDone.toString());
            },
            changeset,
          });
          changeset.setStatus("current");
        },
        { isolationLevel: "repeatable read" }
      );
      sendMessage("done");
      await client.end();
      process.exit();
    } catch (e: any) {
      sendMessage("error", e["message"] ?? "Unknown Error Occurred");
      if (changeset) changeset.setStatus("error");
      console.log(e);
      process.exit();
    }
  };

  sendMessage("ready");
};
