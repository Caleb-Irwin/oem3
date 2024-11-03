<script lang="ts">
	import type { history as historyType } from '../../../server/src/db.schema';
	import HistoryLine from './HistoryLine.svelte';
	interface Props {
		history: (typeof historyType.$inferSelect)[];
	}

	let { history }: Props = $props();
</script>

<ul class="card p-2">
	<h2 class="pt-2 text-center h3 font-semibold">History</h2>
	{#each history as entry}
		<HistoryLine {entry} />
	{/each}
</ul>
