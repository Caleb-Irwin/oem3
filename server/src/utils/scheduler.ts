import { KV } from './kv';

const dailyTasks: Array<{ type: string; task: () => Promise<void> }> = [],
	kv = new KV('scheduler'),
	runningTasks = new Set<string>();

export const scheduleDailyTask = (type: string, task: () => Promise<void>) => {
	dailyTasks.push({ type, task });
};

export const runDailyTasksIfNeeded = () => {
	dailyTasks.forEach(async (task) => {
		const successKey = `${task.type}_lastSuccess`;
		if (runningTasks.has(task.type)) return;
		runningTasks.add(task.type);
		try {
			if (Date.now() - 12 * 60 * 60 * 1000 < parseInt((await kv.get(successKey)) ?? '0')) return;

			console.log('Running ' + task.type);
			await task.task();
			await kv.set(successKey, Date.now().toString());
		} catch (error) {
			console.error(`Daily task ${task.type} failed:`, error);
		} finally {
			runningTasks.delete(task.type);
		}
	});
};
