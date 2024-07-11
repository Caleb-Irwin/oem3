<script lang="ts">
	import type { history as historyType } from '../../../server/src/db.schema';
	import HistoryLine from './HistoryLine.svelte';
	export let history: (typeof historyType.$inferSelect)[];
</script>

<ul class="card p-2">
	<h2 class="pt-2 text-center h3 font-semibold">History</h2>
	{#each history as entry}
		<HistoryLine {entry} />
	{/each}
</ul>
