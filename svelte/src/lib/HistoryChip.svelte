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
		class="chip m-0 flex cursor-default flex-col whitespace-break-spaces border border-surface-300 bg-surface-200 text-surface-800 sm:flex-row dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100"
	>
		<span class="pr-1 font-bold text-primary-700 dark:text-primary-300">{key}:</span>
		<span class="flex flex-wrap flex-col sm:flex-row">
			{#if !create && prev !== value}
				<BreakableText text={toReadable(prev)} />
				<span class="pr-2 font-bold text-primary-700 dark:text-primary-300"> -> </span>
			{/if}
			<span>
				<BreakableText text={toReadable(value)} />
			</span>
		</span>
	</span>
</div>
