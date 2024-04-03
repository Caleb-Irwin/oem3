<script lang="ts" generics="T extends any">
	import { invalidateAll } from '$app/navigation';

	import { getToastStore } from '@skeletonlabs/skeleton';
	import { isTRPCClientError } from './client';

	let formClass = '';
	export { formClass as class };
	let invalidateAllFlag = false;
	export { invalidateAllFlag as invalidateAll };

	export let action: { mutate: (input: any) => Promise<T> },
		res: (output: T) => Promise<void> | void = (ouput) => undefined,
		successMessage: string | null = null;

	let disabled = false;

	const toastStore = getToastStore();
</script>

<form
	class={formClass}
	on:submit|preventDefault={async (e) => {
		disabled = true;
		try {
			await res(await action.mutate(Object.fromEntries(new FormData(e.currentTarget))));
			if (successMessage !== null)
				toastStore.trigger({
					message: successMessage,
					background: 'variant-filled-success'
				});
			if (invalidateAllFlag) await invalidateAll();
		} catch (e) {
			toastStore.trigger({
				message: isTRPCClientError(e)
					? e.message[0] === '['
						? JSON.parse(e.message)[0].message
						: e.message
					: 'Error Occured',
				background: 'variant-filled-error'
			});
			if (!isTRPCClientError(e)) {
				console.log(e);
			}
		}
		disabled = false;
	}}
>
	<fieldset {disabled}>
		<slot />
	</fieldset>
</form>
