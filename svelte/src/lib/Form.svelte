<script lang="ts" generics="T extends any, I extends object">
	import { invalidateAll } from '$app/navigation';

	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import { handleTRPCError } from './client';

	let formClass = '';
	export { formClass as class };
	let invalidateAllFlag = false;
	export { invalidateAllFlag as invalidateAll };

	export let action: { mutate: (input: I) => Promise<T> },
		res: (output: T) => Promise<void> | void = (ouput) => undefined,
		successMessage: string | null = null,
		noReset = false,
		confirm: boolean | string = false,
		input: Partial<I> = {},
		modalMode = false;

	let disabled = false,
		formEl: HTMLFormElement;

	const toastStore = getToastStore(),
		modalStore = getModalStore();
</script>

<form
	class={formClass}
	bind:this={formEl}
	on:submit|preventDefault={async (e) => {
		const formData = Object.fromEntries(new FormData(e.currentTarget));
		if (confirm !== false) {
			const confirmed = await new Promise((response) =>
				modalStore.trigger({
					type: 'confirm',
					title: confirm === true ? 'Are you sure?' : confirm.toString(),
					response
				})
			);
			if (!confirmed) return;
		}
		disabled = true;
		try {
			//@ts-ignore
			await res(await action.mutate({ ...input, ...formData }));
			if (!noReset) formEl.reset();
			if (successMessage !== null)
				toastStore.trigger({
					message: successMessage,
					background: 'variant-filled-success'
				});
			if (invalidateAllFlag) await invalidateAll();
		} catch (e) {
			handleTRPCError(e);
		}
		disabled = false;
		if (modalMode) modalStore.close();
	}}
>
	<fieldset {disabled}>
		<slot />
	</fieldset>
</form>
