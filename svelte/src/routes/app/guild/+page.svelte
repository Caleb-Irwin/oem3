<script lang="ts">
	import Files from '$lib/Files.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, subVal } from '$lib/client';
	import WorkerStatus from '$lib/WorkerStatus.svelte';
	import Button from '$lib/Button.svelte';
	import type { PageProps } from './$types';
	import { goto } from '$app/navigation';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';

	let { data }: PageProps = $props();
</script>

<h1 class="text-center h2 p-2 pt-4">Guild</h1>

<div class="card mx-4 p-4 flex">
	<Button
		class="btn w-36 variant-filled-primary"
		action={client.unified.getFirstErrorUrl}
		queryMode
		input={{
			tableName: 'unifiedGuild'
		}}
		res={async (output) => goto(output.url)}
	>
		<span class="flex-grow">Fix Errors</span>
		<ChevronRight />
	</Button>
</div>

<div class="w-full flex flex-col xl:grid xl:grid-cols-3 justify-center p-2">
	<div class="p-2 w-full xl:w-auto flex flex-col items-center min-w-96">
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="Guild Data"
				status={subVal(client.guild.data.worker.statusSub, {
					init: data.guildDataStatus
				})}
				changeset={subVal(client.guild.data.worker.changesetSub, {
					init: data.guildDataChangeset
				})}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
				filesRouter={client.guild.data.files}
				title="Guild Items"
				applyMutation={client.guild.data.worker.run}
				acceptFileType=".XLSX"
				initVal={data.guildDataFiles}
			/>
		</div>
	</div>
	<div class="p-2 w-full xl:w-auto flex flex-col items-center min-w-96">
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="Guild Inventory"
				status={subVal(client.guild.inventory.worker.statusSub, {
					init: data.guildInventoryStatus
				})}
				changeset={subVal(client.guild.inventory.worker.changesetSub, {
					init: data.guildInventoryChangeset
				})}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
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
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="Guild Flyer"
				status={subVal(client.guild.flyer.worker.statusSub, {
					init: data.guildFlyerStatus
				})}
				changeset={subVal(client.guild.flyer.worker.changesetSub, {
					init: data.guildFlyerChangeset
				})}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
				filesRouter={client.guild.flyer.files}
				title="Guild Flyer"
				applyMutation={client.guild.flyer.worker.run}
				acceptFileType=".XLSX"
				cloudSyncMutation={client.guild.flyer.files.cloudDownload}
				initVal={data.guildFlyerFiles}
			/>
		</div>
	</div>

	<div class="p-2 w-full xl:w-auto flex flex-col items-center min-w-96">
		<div class="w-full card p-4 max-w-xl">
			<Button class="mb-2 btn variant-filled-primary" action={client.guild.desc.worker.run}
				>Update Enhanced Descriptions</Button
			>
			<WorkerStatus
				status={subVal(client.guild.desc.worker.statusSub, {
					init: data.guildDescStatus
				})}
			/>
		</div>
	</div>

	<div class="p-2 w-full xl:w-auto flex flex-col items-center min-w-96">
		<div class="w-full card p-4 max-w-xl">
			<Button class="mb-2 btn variant-filled-primary" action={client.guild.worker.run}
				>Update Unified Guild</Button
			>
			<WorkerStatus
				status={subVal(client.guild.worker.statusSub, {
					init: data.guildWorkerStatus
				})}
			/>
		</div>
	</div>
</div>
