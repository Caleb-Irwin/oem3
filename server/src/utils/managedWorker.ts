import { z } from "zod";
import { generalProcedure, router } from "../trpc";
import { eventSubscription } from "./eventSubscription";
import type { HostMessage, WorkerMessage } from "./workerBase";
import { TRPCError } from "@trpc/server";
import { getChangeset } from "./changeset";
import { changesetType } from "./changeset.table";
import { KV } from "./kv";

export type RunWorker = (data: HostMessage, time?: number) => Promise<void>;
export type PostRunHook = (cb: () => void) => void;

export const managedWorker = (
  workerUrl: string,
  name: (typeof changesetType.enumValues)[number] | string,
  runAfter: PostRunHook[] = []
) => {
  const changeset = changesetType.enumValues.includes(name as any)
      ? (name as (typeof changesetType.enumValues)[number])
      : null,
    { onUpdate, update } = eventSubscription(),
    kv = new KV(name),
    status = {
      running: false,
      error: false,
      message: "Not running",
      progress: -1,
    },
    postRunCallbacks: (() => void)[] = [],
    runWorker: RunWorker = async (data, time = Date.now()) => {
      if (status.running) throw new Error("Already Processing");
      status.running = true;
      status.error = false;
      status.message = "Starting";
      status.progress = -1;
      update();
      return new Promise<void>((res, rej) => {
        const worker = new Worker(workerUrl, {
          //@ts-ignore Due to svelte check
          smol: true,
        });
        let done = false,
          started = false;

        worker.onmessage = (event) => {
          const msg: WorkerMessage = event.data;

          if (msg.type === "ready") {
            worker.postMessage(data);
          } else if (msg.type === "done") {
            done = true;
            update();
          } else if (msg.type === "started") {
            status.progress = 0;
            update();
            started = true;
            res();
          } else if (msg.type === "progress") {
            status.progress = parseFloat(msg.msg ?? "0");
            update();
          } else if (msg.type === "changesetUpdate") {
            update("changeset");
          } else if (started) {
            rej(msg.msg ?? "Error in worker");
          } else {
            status.running = false;
            status.error = true;
            status.message = msg.msg ?? "Error in worker";
          }
        };

        worker.addEventListener("close", async () => {
          await kv.set("lastRan", time.toString());
          status.running = false;
          status.message = done
            ? "Completed"
            : "Worker closed before completing task";
          status.error = done ? false : true;
          update();
          if (done) {
            postRunCallbacks.forEach((cb) => cb());
          }
          if (!started) rej("Worker closed before completing task");
          if (
            ((await kv.get("lastStaled"))
              ? parseInt((await kv.get("lastStaled")) as string)
              : Number.NEGATIVE_INFINITY) >
            parseInt((await kv.get("lastRan")) as string)
          ) {
            runWorker({}, time);
          }
        });
      });
    };

  runAfter.forEach((setCb) =>
    setCb(async () => {
      const time = Date.now();
      await kv.set("lastStaled", time.toString());
      if (status.running) return;
      runWorker({}, time);
    })
  );

  return {
    runWorker,
    worker: router({
      run: generalProcedure
        .input(z.object({ fileId: z.number().int() }))
        .mutation(async ({ input }) => {
          try {
            await runWorker(input);
          } catch (e: any) {
            console.log(e);
            throw new TRPCError({ message: e.message, code: "CONFLICT" });
          }
        }),
      status: generalProcedure.query(() => {
        return status;
      }),
      changeset: generalProcedure.query(async () => {
        return changeset ? await getChangeset(changeset) : null;
      }),
      onUpdate,
    }),
    hook: (cb: () => void) => {
      postRunCallbacks.push(cb);
    },
  };
};
