<script lang="ts">
	import Files from '$lib/Files.svelte';
	import Button from '$lib/Button.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, subVal } from '$lib/client';
	import type { PageProps } from './$types';
	import ModalSearchBar from '$lib/search/ModalSearchBar.svelte';
	import DatabaseBackup from 'lucide-svelte/icons/database-backup';
	import { getToastStore } from '@skeletonlabs/skeleton';

	let { data }: PageProps = $props();
	const toastStore = getToastStore();
	const canEdit = $derived(
		data.user.permissionLevel === 'general' || data.user.permissionLevel === 'admin'
	);
</script>

<svelte:head>
	<title>OEM3 QuickBooks</title>
</svelte:head>

<h1 class="text-center h2 p-2 pt-4">QuickBooks</h1>
<ModalSearchBar queryType="qb" placeholder="Search QuickBooks" class="max-w-xl pb-2" />

<div class="flex w-full justify-center p-2">
	<div class="w-full flex flex-col items-center p-2">
		<div class="card w-full max-w-xl">
			<ChangesetStatus
				embedded
				name="QuickBooks"
				status={subVal(client.qb.worker.statusSub, { init: data.status })}
				changeset={subVal(client.qb.worker.changesetSub, {
					init: data.changeset
				})}
			/>
			{#if canEdit}
				<section
					class="flex flex-col gap-3 border-t border-surface-300/80 p-4 dark:border-surface-600 sm:flex-row sm:items-center"
				>
					<div class="min-w-0 flex-1">
						<h2 class="font-semibold">Stock history</h2>
						<p class="mt-0.5 text-sm text-surface-600 dark:text-surface-300">
							Build inventory trends from QuickBooks files uploaded during the last three months.
						</p>
					</div>
					<Button
						action={client.qb.backfillInventoryHistory}
						input={{}}
						confirm="Backfill stock history from every QuickBooks file uploaded in the last three months?"
						res={(result) => {
							toastStore.trigger({
								message: `${result.snapshotsAdded.toLocaleString()} stock snapshots added from ${result.filesProcessed.toLocaleString()} files`,
								background: 'variant-filled-success'
							});
						}}
						class="btn variant-filled-primary shrink-0 gap-2"
					>
						<DatabaseBackup size={18} />
						Backfill 3 months
					</Button>
				</section>
			{/if}
			<Files
				embedded
				filesRouter={client.qb.files}
				title="QuickBooks Items"
				applyMutation={client.qb.worker.run}
				acceptFileType=".CSV"
				initVal={data.files}
			/>
		</div>
	</div>
</div>
