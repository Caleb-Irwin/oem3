<script lang="ts">
	import Files from '$lib/Files.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, subVal } from '$lib/client';
	import type { PageProps } from './$types';
	import ModalSearchBar from '$lib/search/ModalSearchBar.svelte';

	let { data }: PageProps = $props();
</script>

<h1 class="text-center h2 p-2 pt-4">QuickBooks</h1>
<div class="w-full flex flex-col items-center p-2">
	<ModalSearchBar queryType="qb" placeholder="Search QuickBooks" class="max-w-xl pb-2" />
	<div class="w-full max-w-xl mb-2">
		<ChangesetStatus
			name="QuickBooks"
			status={subVal(client.qb.worker.statusSub, { init: data.status })}
			changeset={subVal(client.qb.worker.changesetSub, {
				init: data.changeset
			})}
		/>
	</div>
	<div class="w-full max-w-xl">
		<Files
			filesRouter={client.qb.files}
			title="QuickBooks Items"
			applyMutation={client.qb.worker.run}
			acceptFileType=".CSV"
			initVal={data.files}
		/>
	</div>
</div>
