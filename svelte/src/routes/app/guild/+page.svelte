<script lang="ts">
	import Files from '$lib/Files.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, sub } from '$lib/client';
</script>

<h1 class="text-center h2 p-2 pt-4">Guild</h1>
<div class="w-full flex flex-col xl:grid xl:grid-cols-3 justify-center p-2">
	<div class="p-2 w-full xl:w-auto flex flex-col items-center min-w-96">
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="Guild Data"
				status={sub(client.guild.worker.status, client.guild.worker.onUpdate)}
				changeset={sub(client.guild.worker.changeset, client.guild.worker.onUpdate)}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
				filesRouter={client.guild.files}
				title="Guild Items"
				applyMutation={client.guild.worker.run}
				acceptFileType=".XLSX"
			/>
		</div>
	</div>
	<div class="p-2 w-full xl:w-auto flex flex-col items-center min-w-96">
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="Guild Inventory"
				status={sub(client.guild.inventory.worker.status, client.guild.inventory.worker.onUpdate)}
				changeset={sub(
					client.guild.inventory.worker.changeset,
					client.guild.inventory.worker.onUpdate
				)}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
				filesRouter={client.guild.inventory.files}
				title="Guild Inventory"
				applyMutation={client.guild.inventory.worker.run}
				acceptFileType=".CSV"
				cloudSyncMutation={client.guild.inventory.files.cloudDownload}
			/>
		</div>
	</div>
	<div class="p-2 w-full xl:w-auto flex flex-col items-center min-w-96">
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="Guild Flyer"
				status={sub(client.guild.flyer.worker.status, client.guild.flyer.worker.onUpdate)}
				changeset={sub(client.guild.flyer.worker.changeset, client.guild.flyer.worker.onUpdate)}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
				filesRouter={client.guild.flyer.files}
				title="Guild Flyer"
				applyMutation={client.guild.flyer.worker.run}
				acceptFileType=".XLSX"
				cloudSyncMutation={client.guild.flyer.files.cloudDownload}
			/>
		</div>
	</div>
</div>
