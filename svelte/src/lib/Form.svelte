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
		modalMode = false,
		center = false;

	let disabled = false,
		formEl: HTMLFormElement;

	const toastStore = getToastStore(),
		modalStore = getModalStore();

	const readFile = async (file: File): Promise<string> =>
		new Promise((res, rej) => {
			const reader = new FileReader();
			reader.addEventListener('load', (event) => {
				if (event.target === null) rej(new Error('event.target is null'));
				else res(event.target?.result as string);
			});
			reader.addEventListener('error', (err) => rej(err));
			reader.readAsDataURL(file);
		});
</script>

<form
	class={(modalMode ? 'card max-w-md p-4 flex flex-col items-center ' : '') + formClass}
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
			if (formData.file instanceof File) {
				formData.fileName = formData.file.name;
				formData.file = await readFile(formData.file);
			}
			//@ts-ignore
			await res(await action.mutate({ ...input, ...formData }));
			if (!noReset) formEl.reset();
			if (successMessage !== null)
				toastStore.trigger({
					message: successMessage,
					background: 'variant-filled-success'
				});
			if (invalidateAllFlag) await invalidateAll();
			if (modalMode) modalStore.close();
		} catch (e) {
			handleTRPCError(e);
		}
		disabled = false;
	}}
>
	<fieldset class={center ? 'flex place-content-center' : ''} {disabled}>
		<slot />
	</fieldset>
</form>
