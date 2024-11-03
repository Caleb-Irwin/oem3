<script lang="ts" generics="T extends any, I extends object">
	import Form from './Form.svelte';

	
	

	interface Props {
		class?: string;
		invalidateAll?: boolean;
		action: { mutate: (input: any) => Promise<T> };
		res?: (output: T) => Promise<void> | void;
		successMessage?: string | null;
		confirm?: boolean | string;
		input?: Partial<I>;
		disabled?: boolean;
		children?: import('svelte').Snippet;
	}

	let {
		class: btnClass = 'btn variant-filled-primary',
		invalidateAll: invalidateAllFlag = false,
		action,
		res = (ouput) => undefined,
		successMessage = null,
		confirm = false,
		input = {},
		disabled = false,
		children
	}: Props = $props();
</script>

<Form
	{action}
	{res}
	class="grid place-content-center"
	invalidateAll={invalidateAllFlag}
	{successMessage}
	{confirm}
	{input}
>
	<button class={btnClass} {disabled}>{@render children?.()}</button>
</Form>
