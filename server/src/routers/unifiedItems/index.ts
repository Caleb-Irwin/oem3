import { router } from "../../trpc";
import { managedWorker } from "../../utils/managedWorker";

const { worker, hook } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "unifiedItems"
);

export const unifiedItemsHook = hook;

export const unifiedItemsRouter = router({
  worker,
});
