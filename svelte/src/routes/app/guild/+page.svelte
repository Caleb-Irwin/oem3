<script lang="ts">
	import Files from '$lib/Files.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, sub } from '$lib/client';
</script>

<h1 class="text-center h2 p-2 pt-4">Guild</h1>
<div class="w-full flex flex-col items-center p-2">
	<div class="w-full max-w-xl mb-2">
		<ChangesetStatus
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
