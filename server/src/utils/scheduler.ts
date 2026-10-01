import { KV } from './kv';

const dailyTasks: Array<{ type: string; task: () => Promise<void> }> = [],
	kv = new KV('scheduler'),
	runningTasks = new Set<string>();

const SUCCESS_INTERVAL_MS = 12 * 60 * 60 * 1000,
	// Tasks are checked on every request, so a failing one would otherwise retry on each
	FAILURE_COOLDOWN_MS = 60 * 60 * 1000;

export const scheduleDailyTask = (type: string, task: () => Promise<void>) => {
	dailyTasks.push({ type, task });
};

export const runDailyTasksIfNeeded = () => {
	dailyTasks.forEach(async (task) => {
		const successKey = `${task.type}_lastSuccess`,
			failureKey = `${task.type}_lastFailure`;
		if (runningTasks.has(task.type)) return;
		runningTasks.add(task.type);
		try {
			if (Date.now() - SUCCESS_INTERVAL_MS < parseInt((await kv.get(successKey)) ?? '0')) return;
			if (Date.now() - FAILURE_COOLDOWN_MS < parseInt((await kv.get(failureKey)) ?? '0')) return;

			console.log('Running ' + task.type);
			await task.task();
			await kv.set(successKey, Date.now().toString());
		} catch (error) {
			console.error(`Daily task ${task.type} failed:`, error);
			await kv.set(failureKey, Date.now().toString()).catch(() => {});
		} finally {
			runningTasks.delete(task.type);
		}
	});
};
