<script lang="ts">
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, sub } from '$lib/client';
	import Files from '$lib/Files.svelte';
</script>

<h1 class="text-center h2 p-2 pt-4">SPR</h1>
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
