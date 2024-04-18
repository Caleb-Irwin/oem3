<script lang="ts" generics="T extends any, I extends object">
	import Form from './Form.svelte';

	let btnClass = 'btn variant-filled-primary';
	export { btnClass as class };
	let invalidateAllFlag = false;
	export { invalidateAllFlag as invalidateAll };

	export let action: { mutate: (input: any) => Promise<T> },
		res: (output: T) => Promise<void> | void = (ouput) => undefined,
		successMessage: string | null = null,
		confirm: boolean | string = false,
		input: Partial<I> = {},
		disabled = false;
</script>

<Form
	{action}
	{res}
	class="flex justify-center"
	invalidateAll={invalidateAllFlag}
	{successMessage}
	{confirm}
	{input}
>
	<button class={btnClass} {disabled}><slot /></button>
</Form>
