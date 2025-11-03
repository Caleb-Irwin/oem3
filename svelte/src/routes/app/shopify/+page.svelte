<script lang="ts">
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, subVal } from '$lib/client';
	import Files from '$lib/Files.svelte';
	import ModalSearchBar from '$lib/search/ModalSearchBar.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>OEM3 Shopify</title>
</svelte:head>

<h1 class="text-center h2 p-2 pt-4">Shopify</h1>
<div class="w-full flex flex-col items-center p-2">
	<ModalSearchBar queryType="shopify" placeholder="Search Shopify" class="max-w-xl pb-2" />
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
