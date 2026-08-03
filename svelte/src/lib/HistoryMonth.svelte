<script lang="ts">
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import type { history as historyType } from '../../../server/src/db.schema';
	import HistoryLine from './HistoryLine.svelte';

	type HistoryEntry = typeof historyType.$inferSelect;

	interface MonthGroup {
		key: string;
		label: string;
		entries: HistoryEntry[];
		summary: string;
	}

	interface Props {
		group: MonthGroup;
		open?: boolean;
	}

	let { group, open = false }: Props = $props();
	let isOpen = $state(open);
</script>

<details
	bind:open={isOpen}
	class="group rounded-md border border-surface-300 dark:border-surface-600"
>
	<summary
		class="flex cursor-pointer list-none items-center gap-2 rounded-md bg-surface-100 px-2.5 py-2 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700"
	>
		<ChevronDown
			size={17}
			class="shrink-0 text-surface-600 transition-transform duration-150 group-open:rotate-180 dark:text-surface-300"
		/>
		<span class="font-semibold">{group.label}</span>
		<span class="min-w-0 flex-1 truncate text-right text-sm text-surface-600 dark:text-surface-300">
			{group.summary}
		</span>
	</summary>

	{#if isOpen}
		<ul class="border-t border-surface-200 px-1 py-1 dark:border-surface-700">
			{#each group.entries as entry (entry.id)}
				<HistoryLine {entry} />
			{/each}
		</ul>
	{/if}
</details>
