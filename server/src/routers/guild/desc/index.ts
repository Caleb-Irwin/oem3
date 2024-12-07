import { router } from "../../../trpc";
import { managedWorker } from "../../../utils/managedWorker";

const { worker, hook } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "guildDesc"
);

export const guildDescHook = hook;

export const descRouter = router({
  worker,
});
