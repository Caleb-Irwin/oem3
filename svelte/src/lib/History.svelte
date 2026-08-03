<script lang="ts">
	import type { history as historyType } from '../../../server/src/db.schema';
	import HistoryMonth from './HistoryMonth.svelte';

	type HistoryEntry = typeof historyType.$inferSelect;

	interface MonthGroup {
		key: string;
		label: string;
		entries: HistoryEntry[];
		summary: string;
	}

	const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

	function pluralize(count: number, singular: string) {
		return `${count} ${singular}${count === 1 ? '' : 's'}`;
	}

	function summarize(entries: HistoryEntry[]) {
		const counts = { create: 0, update: 0, delete: 0 };
		for (const entry of entries) counts[entry.entryType]++;

		return [
			pluralize(entries.length, 'entry'),
			...(['create', 'update', 'delete'] as const)
				.filter((type) => counts[type] > 0)
				.map((type) => pluralize(counts[type], type))
		].join(' · ');
	}
	interface Props {
		history: (typeof historyType.$inferSelect)[];
	}

	let { history }: Props = $props();

	const monthGroups = $derived.by(() => {
		const groups = new Map<string, MonthGroup>();

		for (const entry of history) {
			const created = new Date(entry.created);
			const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
			let group = groups.get(key);

			if (!group) {
				group = {
					key,
					label: monthFormatter.format(created),
					entries: [],
					summary: ''
				};
				groups.set(key, group);
			}

			group.entries.push(entry);
		}

		for (const group of groups.values()) group.summary = summarize(group.entries);
		return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
	});
</script>

<section class="card space-y-2 p-2">
	<h2 class="h3 pt-2 text-center font-semibold">History</h2>
	<div class="space-y-2">
		{#each monthGroups as group, index (group.key)}
			<HistoryMonth {group} open={index === 0} />
		{/each}
	</div>
</section>
