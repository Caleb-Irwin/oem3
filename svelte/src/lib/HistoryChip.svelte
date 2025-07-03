<script lang="ts">
	import BreakableText from './helpers/BreakableText.svelte';
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
		if (value === null) return 'Null';
		return 'undefined';
	}
</script>

<div class="p-0.5">
	<span
		class="chip hover:cursor-default whitespace-break-spaces variant-filled-surface flex flex-col sm:flex-row m-0"
	>
		<span class="font-bold text-primary-500 pr-1">{key}:</span>
		{#if !create && prev !== value}
			<BreakableText text={toReadable(prev)} />
			<span class="font-bold text-primary-500 pr-2">-></span>
		{/if}
		<BreakableText text={toReadable(value)} />
	</span>
</div>
