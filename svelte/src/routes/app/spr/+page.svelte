<script lang="ts">
	import Button from '$lib/Button.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, subVal } from '$lib/client';
	import Files from '$lib/Files.svelte';
	import WorkerStatus from '$lib/WorkerStatus.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="text-center h2 p-2 pt-4">SPR</h1>
<div class="w-full flex flex-col xl:grid xl:grid-cols-3 justify-center p-2">
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="SPR Price File"
				status={subVal(client.spr.priceFile.worker.statusSub, {
					init: data.sprPriceFileStatus
				})}
				changeset={subVal(client.spr.priceFile.worker.changesetSub, {
					init: data.sprPriceFileChangeset
				})}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
				filesRouter={client.spr.priceFile.files}
				title="SPR Price File"
				applyMutation={client.spr.priceFile.worker.run}
				acceptFileType=".XLSX"
				initVal={data.sprPriceFileFiles}
			/>
		</div>
	</div>
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="SPR Flat File"
				status={subVal(client.spr.flatFile.worker.statusSub, {
					init: data.sprFlatFileStatus
				})}
				changeset={subVal(client.spr.flatFile.worker.changesetSub, {
					init: data.sprFlatFileChangeset
				})}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
				filesRouter={client.spr.flatFile.files}
				title="SPR Flat File"
				applyMutation={client.spr.flatFile.worker.run}
				acceptFileType=".CSV"
				cloudSyncMutation={client.spr.flatFile.files.cloudDownload}
				initVal={data.sprFlatFileFiles}
			/>
		</div>
	</div>
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full card p-4 max-w-xl">
			<Button class="mb-2 btn variant-filled-primary" action={client.spr.enhancedContent.worker.run}
				>Update Enhanced Content</Button
			>
			<WorkerStatus
				status={subVal(client.spr.enhancedContent.worker.statusSub, {
					init: data.sprEnhancedContentStatus
				})}
			/>
		</div>
	</div>
</div>
