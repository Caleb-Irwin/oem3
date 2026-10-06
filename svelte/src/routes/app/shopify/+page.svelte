<script lang="ts">
	import Button from '$lib/Button.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, subVal } from '$lib/client';
	import Files from '$lib/Files.svelte';
	import ModalSearchBar from '$lib/search/ModalSearchBar.svelte';
	import ShopifySync from './ShopifySync.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>OEM3 Shopify</title>
</svelte:head>

<h1 class="text-center h2 p-2 pt-4">Shopify</h1>

<ModalSearchBar queryType="shopify" placeholder="Search Shopify" class="max-w-xl pb-2" />

<div class="w-full flex flex-col xl:grid xl:grid-cols-2 justify-center p-2">
	<div class="w-full flex flex-col items-center p-2">
		<div class="card w-full max-w-xl">
			<ChangesetStatus
				embedded
				name="Shopify"
				status={subVal(client.shopify.worker.statusSub, {
					init: data.status
				})}
				changeset={subVal(client.shopify.worker.changesetSub, {
					init: data.changeset
				})}
			/>
			<Files
				embedded
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
			<ShopifySync
				initOverview={data.syncOverview}
				isAdmin={data.user.permissionLevel === 'admin'}
			/>
			<div class="card p-4 min-w-72 mt-2">
				<div class="flex flex-col gap-2">
					<h5 class="h4 font-semibold">Utilities</h5>
					<Button
						class="btn variant-ghost-warning"
						action={client.shopify.pushSync.resetFailedUploads}
						confirm="Retry all failed products on the next push, including ones that have failed 3 or more times?"
						successMessage="Failed products will be retried on the next push."
						>Retry Failed Products</Button
					>
					<Button
						class="btn variant-ghost-error"
						action={client.shopify.pushSync.activateAllInventoryLocations}
						confirm="Are you sure you want to activate ALL inventory locations? This action cannot be undone. Admin access is required."
						successMessage="Started. DO NOT RETRY UNTIL PREVIOUS ACTIVATION IS COMPLETE."
						>Activate All Inventory Locations</Button
					>
				</div>
			</div>
		</div>
	</div>
</div>
