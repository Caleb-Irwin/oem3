<script lang="ts">
	import Button from '$lib/Button.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, subVal } from '$lib/client';
	import Files from '$lib/Files.svelte';
	import ModalSearchBar from '$lib/search/ModalSearchBar.svelte';
	import UnifiedSummary from '$lib/summary/UnifiedSummary.svelte';
	import WorkerStatus from '$lib/WorkerStatus.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>OEM3 Novexco</title>
</svelte:head>

<h1 class="text-center h2 p-2 pt-4">Novexco</h1>

<ModalSearchBar
	queryType="unifiedSpr"
	queryTypes={['unifiedSpr', 'sprPriceFile', 'sprFlatFile']}
	placeholder="Search Novexco"
	class="max-w-3xl pb-2"
/>

<UnifiedSummary
	tableName="unifiedSpr"
	initialErrorData={data.sprErrorSummary}
	workerStatus={subVal(client.spr.worker.statusSub, {
		init: data.sprWorkerStatus
	})}
	workerRun={client.spr.worker.run}
	headerName="Unified Novexco"
/>

<div class="w-full flex flex-col xl:grid xl:grid-cols-3 justify-center p-2">
	<div class="w-full flex flex-col items-center p-2">
		<div class="card w-full">
			<ChangesetStatus
				embedded
				name="Novexco Price File"
				status={subVal(client.spr.priceFile.worker.statusSub, {
					init: data.sprPriceFileStatus
				})}
				changeset={subVal(client.spr.priceFile.worker.changesetSub, {
					init: data.sprPriceFileChangeset
				})}
			/>
			<Files
				embedded
				filesRouter={client.spr.priceFile.files}
				title="Novexco Price File"
				applyMutation={client.spr.priceFile.worker.run}
				acceptFileType=".XLSX"
				initVal={data.sprPriceFileFiles}
			/>
		</div>
	</div>
	<div class="w-full flex flex-col items-center p-2">
		<div class="card w-full">
			<ChangesetStatus
				embedded
				name="Novexco Flat File"
				status={subVal(client.spr.flatFile.worker.statusSub, {
					init: data.sprFlatFileStatus
				})}
				changeset={subVal(client.spr.flatFile.worker.changesetSub, {
					init: data.sprFlatFileChangeset
				})}
			/>
			<Files
				embedded
				filesRouter={client.spr.flatFile.files}
				title="Novexco Flat File"
				applyMutation={client.spr.flatFile.worker.run}
				acceptFileType=".CSV"
				cloudSyncMutation={client.spr.flatFile.files.cloudDownload}
				initVal={data.sprFlatFileFiles}
			/>
		</div>
	</div>
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full card p-4">
			<Button class="mb-2 btn variant-ghost-primary" action={client.spr.enhancedContent.worker.run}
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
