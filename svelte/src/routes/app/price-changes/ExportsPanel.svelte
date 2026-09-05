<script lang="ts">
	import { goto } from '$app/navigation';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Download from 'lucide-svelte/icons/download';
	import Undo2 from 'lucide-svelte/icons/undo-2';
	import Tags from 'lucide-svelte/icons/tags';
	import Button from '$lib/Button.svelte';
	import { client, handleTRPCError, subVal } from '$lib/client';
	import { downloadTextFile } from '$lib/downloadFile';
	import type { PriceChangeExport } from './types';

	interface Props {
		init: PriceChangeExport[];
	}

	let { init }: Props = $props();

	const exportsSub = subVal(client.priceChanges.exports.listSub, { sendInit: false, init });
	const exports = $derived($exportsSub ?? init);

	const dateFormat = new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});

	async function download(exportId: number, mode: 'change' | 'revert') {
		try {
			const { fileName, csv } = await client.priceChanges.exports.csv.query({ exportId, mode });
			downloadTextFile(fileName, csv);
		} catch (e) {
			handleTRPCError(e);
		}
	}
</script>

<details class="card group p-0">
	<summary
		class="flex cursor-pointer list-none items-center gap-2 rounded-md p-4 hover:bg-surface-100 dark:hover:bg-surface-700/60"
	>
		<ChevronDown size={18} class="shrink-0 transition-transform group-open:rotate-180" />
		<h2 class="h4 font-semibold">Export history</h2>
		<span class="badge variant-soft">{exports.length}</span>
	</summary>

	<div class="border-t border-surface-200 p-4 dark:border-surface-700">
		<p class="pb-3 text-sm text-surface-600 dark:text-surface-300">
			Import the change CSV with File &gt; Utilities &gt; Import &gt; Excel Files, with duplicate
			handling set to "replace, except blank fields". The revert CSV puts the previous prices back,
			which is how flyer pricing comes off again.
		</p>
		<ul class="space-y-2">
			{#each exports as exportRow (exportRow.id)}
				<li class="card flex flex-wrap items-center gap-3 p-3">
					<div class="min-w-0 flex-grow">
						<p class="font-semibold">{exportRow.name}</p>
						<p class="text-sm text-surface-600 dark:text-surface-300">
							{exportRow.itemCount}
							{exportRow.itemCount === 1 ? 'item' : 'items'} · {dateFormat.format(
								exportRow.createdAt
							)} · {exportRow.createdBy}
						</p>
					</div>
					<div class="flex flex-wrap gap-1">
						<button
							class="btn btn-sm variant-ghost-primary"
							onclick={() => download(exportRow.id, 'change')}
						>
							<Download size={16} /><span class="pl-1">Change CSV</span>
						</button>
						<button
							class="btn btn-sm variant-ghost-warning"
							onclick={() => download(exportRow.id, 'revert')}
						>
							<Undo2 size={16} /><span class="pl-1">Revert CSV</span>
						</button>
						<Button
							class="btn btn-sm variant-ghost-secondary"
							action={client.priceChanges.exports.toSheet}
							input={{ exportId: exportRow.id }}
							res={async (result) => {
								await goto(`/app/shelf?sheet=${result.sheetId}`);
							}}
							successMessage="Created a new shelf tag sheet"
						>
							<Tags size={16} /><span class="pl-1">New sheet</span>
						</Button>
					</div>
				</li>
			{:else}
				<li class="p-4 text-center text-surface-600 dark:text-surface-300">
					Nothing exported yet.
				</li>
			{/each}
		</ul>
	</div>
</details>
