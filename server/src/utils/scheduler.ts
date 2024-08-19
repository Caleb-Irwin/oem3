import { KV } from "./kv";

const dailyTasks: Array<{ type: string; task: () => Promise<void> }> = [],
  kv = new KV("scheduler");

export const scheduleDailyTask = (type: string, task: () => Promise<void>) => {
  dailyTasks.push({ type, task });
};

export const runDailyTasksIfNeeded = () => {
  dailyTasks.forEach(async (task) => {
    if (
      Date.now() - 12 * 60 * 60 * 1000 <
      parseInt((await kv.get(task.type)) ?? "0")
    )
      return;
    await kv.set(task.type, Date.now().toString());
    console.log("Running " + task.type);
    await task.task();
  });
};
