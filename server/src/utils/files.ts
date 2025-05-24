import { z } from "zod";
import { db } from "../db";
import { files } from "./files.table";
import { generalProcedure, router, viewerProcedure } from "../trpc";
import { desc, eq } from "drizzle-orm";
import { eventSubscription } from "./eventSubscription";
import {
  TRPCError,
  type inferRouterInputs,
  type inferRouterOutputs,
} from "@trpc/server";
import { TRPCClientError } from "@trpc/client";
import type { RunWorker } from "./managedWorker";
import { scheduleDailyTask } from "./scheduler";
import { deleteFile, getFileRefById, uploadFile } from "./files.s3";

export const fileProcedures = (
  type: string,
  verifyFunction: (dataUrl: string, fileType: string) => Promise<void> | void,
  runWorker: RunWorker,
  cloudDownload:
    | (() => Promise<{ name: string; dataUrl: string; apply?: boolean } | null>)
    | undefined = undefined,
  dailyRunCloudDownload = false
) => {
  const { onUpdate, update } = eventSubscription();

  const upload = async ({
    input: { file, fileName, processFile },
    ctx: {
      user: { username },
    },
  }: {
    input: { file: string; fileName: string; processFile: boolean };
    ctx: { user: { username: string } };
  }) => {
    const fileUrlHeader = file.slice(0, file.indexOf("base64,")),
      fileType = fileUrlHeader.slice(5, fileUrlHeader.length - 1);

    await verifyFunction(file, fileType);

    const fileId = await db.transaction(async (db) => {
      const { fileId } = (
        await db
          .insert(files)
          .values({
            content: "@" + process.env["S3_BUCKET"],
            type,
            name: fileName,
            author: username,
            uploadedTime: Date.now(),
          })
          .returning({ fileId: files.id })
      )[0];
      await uploadFile(fileId, file);
      return fileId;
    });

    update();

    if (processFile) {
      try {
        await runWorker({ fileId });
      } catch (e: any) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            'Uploaded file, but could not process due to "' +
            (e.message ?? "unknown reason") +
            '"',
        });
      }
    }

    return { fileId };
  };

  if (dailyRunCloudDownload && cloudDownload) {
    scheduleDailyTask(type, async () => {
      const file = await cloudDownload();
      if (!file) return;
      await upload({
        input: {
          file: file.dataUrl,
          fileName: file.name,
          processFile: file.apply ?? true,
        },
        ctx: { user: { username: null as any } },
      });
    });
  }

  return router({
    onUpdate,
    upload: generalProcedure
      .input(
        z.object({
          file: z.string(),
          fileName: z.string(),
          processFile: z.coerce.boolean(),
        })
      )
      .mutation(upload),
    del: generalProcedure
      .input(z.object({ fileId: z.number().int() }))
      .mutation(async ({ input: { fileId } }) => {
        const row = await db.query.files.findFirst({
          where: eq(files.id, fileId),
        });
        if (!row) return;
        await db.transaction(async (db) => {
          const res = await db
            .delete(files)
            .where(eq(files.id, fileId))
            .returning({ content: files.content });
          if (res[0]?.content?.startsWith("@")) await deleteFile(fileId);
        });
        update();
      }),
    get: viewerProcedure.query(async () => {
      return await db.query.files.findMany({
        where: eq(files.type, type),
        columns: { content: false },
        orderBy: [desc(files.uploadedTime)],
      });
    }),
    download: viewerProcedure
      .input(z.object({ fileId: z.number().int() }))
      .query(async ({ input: { fileId } }) => {
        const ref = await getFileRefById(fileId);
        if (!ref) throw new TRPCError({ code: "NOT_FOUND" });
        return {
          url: ref.presign({
            expiresIn: 60 * 60,
            method: "GET",
            acl: "public-read",
          })
        };
      }),
    cloudDownload: generalProcedure
      .input(z.object({}))
      .mutation(async ({ ctx }) => {
        if (!cloudDownload)
          throw new TRPCError({
            code: "METHOD_NOT_SUPPORTED",
            message: "Cloud Download Not Supported",
          });
        const file = await cloudDownload();
        if (!file) return { message: "Latest File Already Downloaded" };
        const { fileId } = await upload({
          input: {
            file: file.dataUrl,
            fileName: file.name,
            processFile: file.apply ?? true,
          },
          ctx,
        });
        return { message: `File #${fileId} "${file.name}" Downloaded` };
      }),
  });
};

type inputs = inferRouterInputs<ReturnType<typeof fileProcedures>>;
type outputs = inferRouterOutputs<ReturnType<typeof fileProcedures>>;

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
  download: {
    query: (input: inputs["download"]) => Promise<outputs["download"]>;
  };
};
