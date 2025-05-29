import * as schema from "../db.schema";
import { createChangeset } from "./changeset";
import { db, type db as dbType } from "../db";
import { getFileRow } from "./files.s3";

export interface WorkerMessage {
  type: "ready" | "started" | "progress" | "done" | "changesetUpdate" | "error" | "custom";
  msg?: string;
}
export type HostMessage = {} | { fileId: number };

interface WorkerParams {
  process: (params: {
    db: typeof dbType;
    message: HostMessage;
    progress: (percentDone: number) => void;
    utils: {
      notifier: () => void;
      customMessage: (msg: string) => void;
      getFileDataUrl: (fileId: number | undefined) => Promise<string>;
      createChangeset: (
        changesetTable: schema.ChangesetTable,
        fileId: number | undefined
      ) => Promise<Awaited<ReturnType<typeof createChangeset>>>;
    };
  }) => Promise<void>;
}

export const work = async ({ process: processFunc }: WorkerParams) => {
  const sendMessage = (
    type: WorkerMessage["type"],
    msg?: WorkerMessage["msg"]
  ) => {
    process.send!({ type, msg });
  };

  process.on("message", async (message: HostMessage) => {
    try {
      sendMessage("started");
      await processFunc({
        db,
        message,
        progress: (amountDone) => {
          sendMessage("progress", amountDone.toString());
        },
        utils: {
          notifier: () => {
            sendMessage("changesetUpdate");
          },
          customMessage: (msg) => {
            sendMessage("custom", msg);
          },
          getFileDataUrl: async (fileId) => {
            if (typeof fileId !== "number")
              throw new Error("No fileId was provided!");

            const fileRecord = await getFileRow(fileId);

            if (!fileRecord?.content)
              throw new Error("No file with id " + fileId);
            return fileRecord.content as string;
          },
          createChangeset: async (changesetTable, fileId) => {
            if (!changesetTable) throw new Error("No changesetTable provided!");
            return await createChangeset(changesetTable, fileId, () =>
              sendMessage("changesetUpdate")
            );
          },
        },
      });
      sendMessage("done");
      process.exit(0);
    } catch (e: any) {
      sendMessage("error", e["message"] ?? "Unknown Error Occurred");
      console.log(e);
      process.exit(1);
    }
  });

  sendMessage("ready");
};
