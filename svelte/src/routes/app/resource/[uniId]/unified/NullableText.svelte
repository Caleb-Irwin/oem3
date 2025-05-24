<script lang="ts">
	type Props = {
		text: string | number | boolean | null | undefined;
	};
	let { text }: Props = $props();
</script>

<span
	class={text === null || text === undefined || text === ''
		? 'text-surface-400 dark:text-surface-200'
		: ''}
>
	{text === null || text === undefined ? 'Null' : text === '' ? 'Blank' : text}
</span>
