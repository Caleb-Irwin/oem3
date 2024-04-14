import {
	createTRPCClient,
	createWSClient,
	httpBatchLink,
	splitLink,
	TRPCClientError,
	wsLink
} from '@trpc/client';
import { writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import type { AppRouter } from '../../../server/src';

export const client = createTRPCClient<AppRouter>({
	links: [
		splitLink({
			condition(op) {
				return op.type !== 'subscription';
			},
			true: httpBatchLink({
				url: '/trpc'
			}),
			false: wsLink({
				client: browser
					? createWSClient({
							url: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/trpc`
						})
					: (undefined as unknown as ReturnType<typeof createWSClient>)
			})
		})
	]
});

export function isTRPCClientError(cause: unknown): cause is TRPCClientError<AppRouter> {
	return cause instanceof TRPCClientError;
}

const toastMessages: string[] = [],
	toastTrigger = (msg: string) => {
		if (toastTrigFunc) return toastTrigFunc(msg);
		toastMessages.push(msg);
	};
let toastTrigFunc: (msg: string) => void;
export const setToastTrigger = (trig: typeof toastTrigFunc) => {
	toastTrigFunc = trig;
	toastMessages.forEach(trig);
};

export const handleTRPCError = (e: unknown) => {
	const message = isTRPCClientError(e)
		? e.message[0] === '['
			? JSON.parse(e.message)[0].message
			: e.message
		: 'Error Occured';
	toastTrigger(message);
	console.warn(e);
};

export const query = <I, O>(
	q: { query: (input: I) => Promise<O> },
	...args: I extends void ? [] : [I]
): Readable<O | undefined> => {
	const { subscribe, set } = writable<O | undefined>(undefined);

	if (browser)
		q.query(args[0] as I)
			.then((v) => set(v))
			.catch(handleTRPCError);
	return { subscribe };
};

export const sub = <I, O, SI, SO>(
	q: { query: (input: I) => Promise<O> },
	{
		subscribe: sub
	}: {
		subscribe: (
			param: SI,
			opts: {
				onData?: (data: SO) => void;
				onError?: (err: TRPCClientError<any>) => void;
			}
		) => any;
	},
	...args: I extends void ? (SI extends void ? [] : [undefined, SI]) : [I, SI | void]
): Readable<O | undefined> => {
	const { subscribe, set } = writable<O | undefined>(undefined);

	if (browser) {
		q.query(args[0] as I)
			.then((v) => set(v))
			.catch(handleTRPCError);
		sub(args[1] as SI, {
			onData(data) {
				q.query(args[0] as I).then((v) => set(v));
			},
			onError: handleTRPCError
		});
	}

	return { subscribe };
};
