<script lang="ts">
	import Files from '$lib/Files.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, subVal } from '$lib/client';
	// import WorkerStatus from '$lib/WorkerStatus.svelte';
	// import Button from '$lib/Button.svelte';
	import type { PageProps } from './$types';
	import UnifiedSummary from '$lib/summary/UnifiedSummary.svelte';
	import ModalSearchBar from '$lib/search/ModalSearchBar.svelte';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>OEM3 Guild</title>
</svelte:head>

<h1 class="text-center h2 p-2 pt-4">Guild</h1>

<ModalSearchBar
	queryType="unifiedGuild"
	queryTypes={['unifiedGuild', 'guildData', 'guildInventory', 'guildFlyer']}
	placeholder="Search Guild"
	class="max-w-3xl pb-2"
/>

<UnifiedSummary
	tableName="unifiedGuild"
	initialErrorData={data.guildErrorSummary}
	workerStatus={subVal(client.guild.worker.statusSub, {
		init: data.guildWorkerStatus
	})}
	workerRun={client.guild.worker.run}
	headerName="Unified Guild"
/>

<div class="w-full flex flex-col xl:grid xl:grid-cols-3 justify-center p-2">
	<div class="p-2 w-full xl:w-auto flex flex-col items-center min-w-96">
		<div class="card w-full">
			<ChangesetStatus
				embedded
				name="Guild Data"
				status={subVal(client.guild.data.worker.statusSub, {
					init: data.guildDataStatus
				})}
				changeset={subVal(client.guild.data.worker.changesetSub, {
					init: data.guildDataChangeset
				})}
			/>
			<Files
				embedded
				filesRouter={client.guild.data.files}
				title="Guild Items"
				applyMutation={client.guild.data.worker.run}
				acceptFileType=".XLSX"
				initVal={data.guildDataFiles}
			/>
		</div>
	</div>
	<div class="p-2 w-full xl:w-auto flex flex-col items-center min-w-96">
		<div class="card w-full">
			<ChangesetStatus
				embedded
				name="Guild Inventory"
				status={subVal(client.guild.inventory.worker.statusSub, {
					init: data.guildInventoryStatus
				})}
				changeset={subVal(client.guild.inventory.worker.changesetSub, {
					init: data.guildInventoryChangeset
				})}
			/>
			<Files
				embedded
				filesRouter={client.guild.inventory.files}
				title="Guild Inventory"
				applyMutation={client.guild.inventory.worker.run}
				acceptFileType=".CSV"
				cloudSyncMutation={client.guild.inventory.files.cloudDownload}
				initVal={data.guildInventoryFiles}
			/>
		</div>
	</div>
	<div class="p-2 w-full xl:w-auto flex flex-col items-center min-w-96">
		<div class="card w-full">
			<ChangesetStatus
				embedded
				name="Guild Flyer"
				status={subVal(client.guild.flyer.worker.statusSub, {
					init: data.guildFlyerStatus
				})}
				changeset={subVal(client.guild.flyer.worker.changesetSub, {
					init: data.guildFlyerChangeset
				})}
			/>
			<Files
				embedded
				filesRouter={client.guild.flyer.files}
				title="Guild Flyer"
				applyMutation={client.guild.flyer.worker.run}
				acceptFileType=".XLSX"
				cloudSyncMutation={client.guild.flyer.files.cloudDownload}
				initVal={data.guildFlyerFiles}
			/>
		</div>
	</div>

	<!-- Disable for now
	<div class="p-2 w-full xl:w-auto flex flex-col items-center min-w-96">
		<div class="w-full card p-4">
			<Button class="mb-2 btn variant-ghost-primary" action={client.guild.desc.worker.run}
				>Update Enhanced Descriptions</Button
			>
			<WorkerStatus
				status={subVal(client.guild.desc.worker.statusSub, {
					init: data.guildDescStatus
				})}
			/>
		</div>
	</div>
	-->
</div>
