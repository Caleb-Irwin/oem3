import { z } from 'zod';
import { generalProcedure, router, viewerProcedure } from '../trpc';
import { eventSubscription } from './eventSubscription';
import type { HostMessage, WorkerMessage } from './workerBase';
import { TRPCError } from '@trpc/server';
import { getChangeset } from './changeset';
import { changesetType } from './changeset.table';
import { KV } from './kv';
import { updateByChangesetType } from '../routers/resources';
import type { Subprocess } from 'bun';

export type RunWorker = (data: HostMessage, time?: number) => Promise<void>;
export type PostRunHook = (cb: () => void) => void;

export const managedWorker = (
	workerUrl: string,
	name: (typeof changesetType.enumValues)[number] | string,
	runAfter: PostRunHook[] = [],
	customMessageCallback?: (msg: WorkerMessage) => void,
	maxQueueSize = 100
) => {
	const changeset = changesetType.enumValues.includes(name as any)
			? (name as (typeof changesetType.enumValues)[number])
			: null,
		{ update, createSub } = eventSubscription(),
		kv = new KV(name),
		status = {
			running: false,
			error: false,
			message: 'Not running',
			progress: -1
		},
		postRunCallbacks: (() => void)[] = [],
		runQueue: HostMessage[] = [];

	const runWorker: RunWorker = async (data, time = Date.now()) => {
		if (status.running) {
			if (runQueue.length < maxQueueSize) {
				runQueue.push(data);
			}
			return;
		}
		status.running = true;
		status.error = false;
		status.message = 'Starting';
		status.progress = -1;
		console.log(`Running ${name} worker`);
		update();

		return new Promise<void>((res, rej) => {
			const proc = Bun.spawn(['bun', workerUrl.slice(7)], {
				ipc(message: WorkerMessage, subprocess: Subprocess) {
					if (message.type === 'ready') {
						subprocess.send(data);
					} else if (message.type === 'done') {
						done = true;
						update();
					} else if (message.type === 'started') {
						status.progress = 0;
						update();
						started = true;
						res();
					} else if (message.type === 'progress') {
						status.progress = parseFloat(message.msg ?? '0');
						update();
					} else if (message.type === 'changesetUpdate') {
						update('changeset');
					} else if (message.type === 'custom') {
						customMessageCallback?.(message);
					} else if (message.type === 'error') {
						status.running = false;
						status.error = true;
						status.message = message.msg ?? 'Error in worker';
						update();
						if (started) {
							rej(message.msg ?? 'Error in worker');
						} else {
							rej('Worker failed to start');
						}
					}
				},
				serialization: 'advanced',
				stdio: ['inherit', 'inherit', 'inherit']
			});

			let done = false,
				started = false;

			proc.exited.then(async () => {
				await kv.set('lastRan', time.toString());
				status.running = false;
				status.message = done ? 'Completed' : 'Worker closed before completing task';
				status.error = done ? false : true;
				update();

				if (done) {
					console.log(`Finished ${name} worker`);
					updateByChangesetType(name);
					postRunCallbacks.forEach((cb) => cb());
					if (
						(await kv.get('lastStaled')) &&
						parseInt((await kv.get('lastStaled')) as string) >
							(parseInt((await kv.get('lastRan')) as string) ?? 0)
					) {
						runWorker({});
					}
					if (runQueue.length > 0) {
						const next = runQueue.shift();
						if (next) {
							runWorker(next);
						}
					}
				}
				if (!started) rej('Worker closed before completing task');
			});
		});
	};

	if (runAfter.length > 0) {
		runAfter.forEach((setCb) =>
			setCb(async () => {
				const time = Date.now();
				await kv.set('lastStaled', time.toString());
				if (!status.running) runWorker({}, time);
			})
		);

		(async () => {
			if (
				(await kv.get('lastStaled')) &&
				parseInt((await kv.get('lastStaled')) as string) >
					parseInt((await kv.get('lastRan')) as string)
			) {
				runWorker({});
			}
		})();
	}
	return {
		runWorker,
		worker: router({
			run: generalProcedure
				.input(z.object({ fileId: z.number().int().optional() }))
				.mutation(async ({ input }) => {
					try {
						await runWorker(input);
					} catch (e: any) {
						console.log(e);
						throw new TRPCError({ message: e.message, code: 'CONFLICT' });
					}
				}),
			status: viewerProcedure.query(() => {
				return status;
			}),
			statusSub: createSub(async () => {
				return status;
			}),
			changeset: viewerProcedure.query(async () => {
				return changeset ? await getChangeset(changeset) : null;
			}),
			changesetSub: createSub(async () => {
				return changeset ? await getChangeset(changeset) : null;
			})
		}),
		hook: (cb: () => void) => {
			postRunCallbacks.push(cb);
		},
		triggerHooks: () => {
			postRunCallbacks.forEach((cb) => cb());
		}
	};
};
