import { router } from "../../../trpc";
import { managedWorker } from "../../../utils/managedWorker";
import { scheduleDailyTask } from "../../../utils/scheduler";

const { worker, runWorker, hook } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "guildDesc"
);

export const guildDescHook = hook;

export const descRouter = router({
  worker,
});

scheduleDailyTask("guildDesc", async () => {
  await runWorker({});
});
