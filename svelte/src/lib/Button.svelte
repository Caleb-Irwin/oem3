<script lang="ts" generics="T extends any, I extends object">
	import Form from './Form.svelte';

	interface Props {
		class?: string;
		invalidateAll?: boolean;
		reloadPage?: boolean;
		action: { mutate: (input: any) => Promise<T> } | { query: (input: any) => Promise<T> };
		queryMode?: boolean;
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
		reloadPage = false,
		action,
		queryMode = false,
		res = (output: T) => undefined,
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
	{reloadPage}
	{successMessage}
	{confirm}
	{input}
	{queryMode}
>
	<button class={btnClass} {disabled}>{@render children?.()}</button>
</Form>
