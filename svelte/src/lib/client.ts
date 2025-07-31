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
				return op.path.startsWith('user.');
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

type SubVal = <SI extends object | void, SO>(
	sub: {
		subscribe: (
			param: SI,
			opts: {
				onData?: (data: SO) => void;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				onError?: (err: TRPCClientError<any>) => void;
			}
		) => unknown;
	},
	args: SI extends void ? { init?: SO | undefined } : SI & { init?: SO | undefined }
) => Readable<SO | undefined>;

export const subVal: SubVal = ({ subscribe: sub }, args) => {
	const { subscribe, set } = writable(args.init ?? undefined);

	if (browser) {
		const input = args;
		delete input.init;
		// @ts-expect-error Types through SubVal
		sub(input, {
			onData(val) {
				// @ts-expect-error Types through SubVal
				set(val);
			},
			onError: handleTRPCError
		});
	}

	return { subscribe };
};

export const subValReturnError: SubVal = ({ subscribe: sub }, args) => {
	const { subscribe, set } = writable(args.init ?? undefined);

	if (browser) {
		const input = args;
		delete input.init;
		// @ts-expect-error Types through SubVal
		sub(input, {
			onData(val) {
				// @ts-expect-error Types through SubVal
				set(val);
			},
			onError: (e: unknown) => {
				const message = isTRPCClientError(e)
					? e.message[0] === '['
						? JSON.parse(e.message)[0].message
						: e.message
					: 'Error Occured';
				// @ts-expect-error Custom thing
				set({ error: message });
			}
		});
	}

	return { subscribe };
};
