<script lang="ts">
	import Files from '$lib/Files.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, sub } from '$lib/client';
</script>

<h1 class="text-center h2 p-2 pt-4">QuickBooks</h1>
<div class="w-full flex flex-col items-center p-2">
	<div class="w-full max-w-xl mb-2">
		<ChangesetStatus
			name="QuickBooks"
			status={sub(client.qb.worker.status, client.qb.worker.onUpdate)}
			changeset={sub(client.qb.worker.changeset, client.qb.worker.onUpdate)}
		/>
	</div>
	<div class="w-full max-w-xl">
		<Files
			filesRouter={client.qb.files}
			title="QuickBooks Items"
			applyMutation={client.qb.worker.run}
			acceptFileType=".CSV"
		/>
	</div>
</div>
