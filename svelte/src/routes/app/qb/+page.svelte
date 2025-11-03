<script lang="ts">
	import Files from '$lib/Files.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, subVal } from '$lib/client';
	import type { PageProps } from './$types';
	import ModalSearchBar from '$lib/search/ModalSearchBar.svelte';
	import Button from '$lib/Button.svelte';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>OEM3 QuickBooks</title>
</svelte:head>

<h1 class="text-center h2 p-2 pt-4">QuickBooks</h1>
<ModalSearchBar queryType="qb" placeholder="Search QuickBooks" class="max-w-xl pb-2" />

<div class="w-full flex flex-col xl:grid xl:grid-cols-2 justify-center p-2">
	<div class="w-full flex flex-col items-center p-2">
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
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full max-w-xl mb-2">
			<div class="card p-4 min-w-72">
				<div class="flex justify-between pb-2 items-center">
					<h4 class="pr-2 h4 font-semibold">QuickBooks Price Updates</h4>
					<!-- <Button
						class="btn btn-icon btn-icon-sm text-secondary-500"
						action={client.shopify.pushSync.worker.run}
						disabled={$workerStatus?.running ?? false}
					>
						<RotateCw />
					</Button> -->
				</div>
				<!-- <WorkerStatus status={workerStatus} /> -->
				<p>Coming soon...</p>
			</div>
		</div>
	</div>
</div>
