<script lang="ts">
	import Download from 'lucide-svelte/icons/download';
	import Undo2 from 'lucide-svelte/icons/undo-2';
	import { client, handleTRPCError } from '$lib/client';
	import { downloadTextFile } from '$lib/downloadFile';

	interface Props {
		exportId: number;
	}

	let { exportId }: Props = $props();

	let busy = $state(false);

	async function download(mode: 'change' | 'revert') {
		busy = true;
		try {
			const { fileName, csv } = await client.priceChanges.exports.csv.query({ exportId, mode });
			downloadTextFile(fileName, csv);
		} catch (e) {
			handleTRPCError(e);
		}
		busy = false;
	}
</script>

<div class="card mt-2 w-full max-w-lg p-3">
	<h4 class="h4 font-semibold">Price change list</h4>
	<p class="pb-2 text-sm text-surface-600 dark:text-surface-300">
		These tags came from a price change export. Import the change CSV into QuickBooks with duplicate
		handling set to "replace, except blank fields"; the revert CSV puts the previous prices back.
	</p>
	<div class="flex flex-wrap gap-2">
		<button
			class="btn btn-sm variant-ghost-primary"
			disabled={busy}
			onclick={() => download('change')}
		>
			<Download size={16} /><span class="pl-1">Change CSV</span>
		</button>
		<button
			class="btn btn-sm variant-ghost-warning"
			disabled={busy}
			onclick={() => download('revert')}
		>
			<Undo2 size={16} /><span class="pl-1">Revert CSV</span>
		</button>
	</div>
</div>
