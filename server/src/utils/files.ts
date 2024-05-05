import { z } from "zod";
import { db } from "../../db";
import { files } from "../../db/db";
import { generalProcedure, router } from "../trpc";
import { desc, eq } from "drizzle-orm";
import { eventSubscription } from "./eventSubscription";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { TRPCClientError } from "@trpc/client";

export const fileProcedures = (
  type: string,
  verifyFunction: (blob: string, fileType: string) => Promise<void>
) => {
  const { onUpdate, update } = eventSubscription();

  return {
    files: router({
      onUpdate,
      upload: generalProcedure
        .input(z.object({ file: z.string(), fileName: z.string() }))
        .mutation(
          async ({
            input: { file, fileName },
            ctx: {
              user: { username },
            },
          }) => {
            const blobHeader = file.slice(0, file.indexOf("base64,")),
              fileType = blobHeader.slice(5, blobHeader.length - 1);

            await verifyFunction(file, fileType);

            const { fileId } = (
              await db
                .insert(files)
                .values({
                  content: file,
                  type,
                  name: fileName,
                  author: username,
                  uploadedTime: Date.now(),
                })
                .returning({ fileId: files.id })
            )[0];

            update();

            return { fileId };
          }
        ),
      del: generalProcedure
        .input(z.object({ fileId: z.number().int() }))
        .mutation(async ({ input: { fileId } }) => {
          await db.delete(files).where(eq(files.id, fileId));
          update();
        }),
      get: generalProcedure.query(async () => {
        return await db.query.files.findMany({
          where: eq(files.type, type),
          columns: { content: false },
          orderBy: [desc(files.uploadedTime)],
        });
      }),
    }),
  };
};

type inputs = inferRouterInputs<ReturnType<typeof fileProcedures>["files"]>;
type outputs = inferRouterOutputs<ReturnType<typeof fileProcedures>["files"]>;

export type FileRouterType = {
  onUpdate: {
    subscribe: (
      param: void,
      opts: {
        onData?: (data: null) => void;
        onError?: (err: TRPCClientError<any>) => void;
      }
    ) => any;
  };
  upload: {
    mutate: (input: inputs["upload"]) => Promise<outputs["upload"]>;
  };
  get: {
    query: (input: inputs["get"]) => Promise<outputs["get"]>;
  };
  del: {
    mutate: (input: inputs["del"]) => Promise<outputs["del"]>;
  };
};
