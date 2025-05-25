<script lang="ts">
	import { formatCurrency } from './productDetails';

	interface Props {
		key: string;
		value: string | number | boolean | null | undefined;
		prev?: string | number | boolean | null | undefined;
		create?: boolean;
	}
	let { key, value, prev, create = false }: Props = $props();

	function toReadable(value: string | number | boolean | null | undefined) {
		if (value === '') return 'EMPTY';
		if (typeof value === 'string') return value;
		if (typeof value === 'number') {
			if (key.endsWith('Cents')) return formatCurrency(value / 100);
			else return value.toString();
		}
		if (typeof value === 'boolean') return value ? 'True' : 'False';
		if (value === null) return 'NULL';
		return 'undefined';
	}
</script>

<div class="p-0.5">
	<span
		class="chip hover:cursor-default whitespace-break-spaces variant-filled-surface flex flex-col sm:flex-row m-0"
	>
		<span class="font-bold text-primary-500 pr-1">{key}:</span>
		{#if !create}
			{@render breakable(toReadable(prev).split(' '))}
			<span class="font-bold text-primary-500 pr-2">-></span>
		{/if}
		{@render breakable(toReadable(value).split(' '))}
		{#if create}
			<span class="font-bold text-primary-500">New</span>
		{/if}
	</span>
</div>

{#snippet breakable(text: string[])}
	<span>
		{#each text as t}
			{#if t.length > 20}
				<span class="break-all">{t}</span>
			{:else}
				{t}
			{/if}{' '}
		{/each}
	</span>
{/snippet}
