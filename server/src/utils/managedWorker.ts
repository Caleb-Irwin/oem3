import { z } from "zod";
import { generalProcedure, router } from "../trpc";
import { eventSubscription } from "./eventSubscription";
import type { WorkerMessage } from "./workerBase";
import { TRPCError } from "@trpc/server";

export type RunWorker = (data: { fileId: number }) => Promise<void>;

export const managedWorker = (workerUrl: string) => {
  const { onUpdate, update } = eventSubscription();

  const status = {
      running: false,
      error: false,
      message: "Not running",
      progress: -1,
    },
    runWorker: RunWorker = async (data: { fileId: number }) => {
      if (status.running) throw new Error("Already Processsing");
      status.running = true;
      status.error = false;
      status.message = "Starting";
      status.progress = -1;
      update();
      return new Promise<void>((res, rej) => {
        const worker = new Worker(workerUrl);
        let done = false,
          verifyed = false;

        worker.onmessage = (event) => {
          const msg: WorkerMessage = event.data;

          if (msg.type === "ready") {
            worker.postMessage(data);
          } else if (msg.type === "done") {
            done = true;
            update();
          } else if (msg.type === "verifyed") {
            status.progress = 0;
            update();
            verifyed = true;
            res();
          } else if (msg.type === "progress") {
            status.progress = parseFloat(msg.msg ?? "0");
            update();
          } else if (verifyed) {
            rej(msg.msg ?? "Error in worker");
          } else {
            status.running = false;
            status.error = true;
            status.message = msg.msg ?? "Error in worker";
          }
        };

        worker.addEventListener("close", () => {
          status.running = false;
          status.message = done
            ? "Completed"
            : "Worker closed before completing task";
          status.error = done ? false : true;
          update();
          if (!verifyed) rej("Worker closed before completing task");
        });
      });
    };

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
      onUpdate,
    }),
  };
};