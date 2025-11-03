<script lang="ts">
	import Button from '$lib/Button.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, subVal } from '$lib/client';
	import Files from '$lib/Files.svelte';
	import ModalSearchBar from '$lib/search/ModalSearchBar.svelte';
	import WorkerStatus from '$lib/WorkerStatus.svelte';
	import RotateCw from 'lucide-svelte/icons/rotate-cw';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();

	const workerStatus = subVal(client.shopify.pushSync.worker.statusSub, {
		init: undefined
	});
</script>

<svelte:head>
	<title>OEM3 Shopify</title>
</svelte:head>

<h1 class="text-center h2 p-2 pt-4">Shopify</h1>

<ModalSearchBar queryType="shopify" placeholder="Search Shopify" class="max-w-xl pb-2" />

<div class="w-full flex flex-col xl:grid xl:grid-cols-2 justify-center p-2">
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="Shopify"
				status={subVal(client.shopify.worker.statusSub, {
					init: data.status
				})}
				changeset={subVal(client.shopify.worker.changesetSub, {
					init: data.changeset
				})}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
				filesRouter={client.shopify.files}
				title="Shopify Product Updates"
				applyMutation={client.shopify.worker.run}
				acceptFileType=".JSONL"
				cloudSyncMutation={client.shopify.files.cloudDownload}
				initVal={data.files}
			/>
		</div>
	</div>
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full max-w-xl mb-2">
			<div class="card p-4 min-w-72">
				<div class="flex justify-between pb-2 items-center">
					<h4 class="pr-2 h4 font-semibold">Shopify Product Push Sync</h4>
					<Button
						class="btn btn-icon btn-icon-sm text-secondary-500"
						action={client.shopify.pushSync.worker.run}
						disabled={$workerStatus?.running ?? false}
					>
						<RotateCw />
					</Button>
				</div>
				<WorkerStatus status={workerStatus} />
				<div class="card flex flex-col mt-2 p-4">
					<h5 class="h4 font-semibold">Utilities</h5>
					<Button
						class="btn variant-filled-error"
						action={client.shopify.pushSync.archiveAllUnmatchedProducts}
						confirm="Are you sure you want to archive ALL unmatched products? This action cannot be undone. Admin access is required."
						>Archive All Unmatched Products</Button
					>
				</div>
			</div>
		</div>
	</div>
</div>
