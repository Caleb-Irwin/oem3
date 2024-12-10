<script lang="ts">
	import Button from '$lib/Button.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, sub } from '$lib/client';
	import Files from '$lib/Files.svelte';
	import WorkerStatus from '$lib/WorkerStatus.svelte';
</script>

<h1 class="text-center h2 p-2 pt-4">SPR</h1>
<div class="w-full flex flex-col xl:grid xl:grid-cols-3 justify-center p-2">
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="SPR Price File"
				status={sub(client.spr.priceFile.worker.status, client.spr.priceFile.worker.onUpdate)}
				changeset={sub(client.spr.priceFile.worker.changeset, client.spr.priceFile.worker.onUpdate)}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
				filesRouter={client.spr.priceFile.files}
				title="SPR Price File"
				applyMutation={client.spr.priceFile.worker.run}
				acceptFileType=".XLSX"
			/>
		</div>
	</div>
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="SPR Flat File"
				status={sub(client.spr.flatFile.worker.status, client.spr.flatFile.worker.onUpdate)}
				changeset={sub(client.spr.flatFile.worker.changeset, client.spr.flatFile.worker.onUpdate)}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
				filesRouter={client.spr.flatFile.files}
				title="SPR Flat File"
				applyMutation={client.spr.flatFile.worker.run}
				acceptFileType=".CSV"
				cloudSyncMutation={client.spr.flatFile.files.cloudDownload}
			/>
		</div>
	</div>
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full card p-4 max-w-xl">
			<Button class="mb-2 btn variant-filled-primary" action={client.spr.images.worker.run}
				>Update Enhanced Images</Button
			>
			<WorkerStatus
				status={sub(client.spr.images.worker.status, client.spr.images.worker.onUpdate)}
			/>
		</div>
	</div>
</div>
