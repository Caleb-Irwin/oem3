import { router } from "../../../trpc";
import { managedWorker } from "../../../utils/managedWorker";
import { scheduleDailyTask } from "../../../utils/scheduler";

const { worker, runWorker, hook } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "sprImages"
);

export const enhancedContentHook = hook;

export const enhancedContentRouter = router({
  worker,
});

scheduleDailyTask("sprEnhancedContent", async () => {
  await runWorker({});
});
