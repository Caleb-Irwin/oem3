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
			else return value;
		}
		if (typeof value === 'boolean') return value ? 'True' : 'False';
		if (value === null) return 'NULL';
		return 'undefined';
	}
</script>

<span
	class="chip hover:cursor-default whitespace-break-spaces variant-filled-surface m-0.5 flex flex-col lg:flex-row"
>
	<span class="font-bold text-primary-500 pr-1"> {key}: </span>
	{#if !create}
		{toReadable(prev)}<span class="font-bold text-primary-500 pr-2"> -> </span>
	{/if}
	{toReadable(value)}
</span>
