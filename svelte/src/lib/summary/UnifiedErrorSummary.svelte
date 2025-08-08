<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/Button.svelte';
	import { client, subVal } from '$lib/client';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import AlertTriangle from 'lucide-svelte/icons/triangle-alert';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import CheckCircle from 'lucide-svelte/icons/circle-check';
	import type { SummaryType } from '../../../../server/src/routers/summaries';
	import type { UnifiedErrorSummary } from '../../../../server/src/routers/summaries/worker';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
	import BarChart from './BarChart.svelte';
	import { getErrorTitle } from '../../routes/app/resource/[uniId]/unified/errors/helpers';
	import type { UnifiedTableNames } from '../../../../server/src/unified/types';
	import { UnifiedTableNamesReadable } from './tableNames';

	interface Props {
		tableName: UnifiedTableNames;
		initialData: SummaryType | null;
	}

	let { tableName, initialData }: Props = $props();

	const _data = subVal(client.summaries.getSub, {
		init: initialData,
		input: {
			type: tableName
		}
	});

	const summary: UnifiedErrorSummary | null = $derived($_data?.data ?? null);

	let showDeletedItems = $state(false);
</script>

<div class="">
	{#if summary !== null}
		<div class="space-y-2">
			{#if summary.itemCounts.nonDeletedWithErrors > 0}
				<div class="pb-2">
					<div class="flex items-center gap-3 mb-3">
						<AlertTriangle class="ml-1 text-error-600 dark:text-error-400" size={24} />
						<div class="flex items-center gap-2 w-full">
							<span class="text-lg font-medium text-error-900 dark:text-error-100"
								>Active Items with Errors</span
							>
							<span class="badge variant-soft-error"
								>{summary.itemCounts.nonDeletedWithErrors} Items</span
							>
							<div class="flex-grow"></div>
							<Button
								class="btn variant-filled-error"
								action={client.unified.getFirstErrorUrl}
								queryMode
								input={{
									tableName,
									deletedMode: false
								}}
								res={async (output) => goto(output.url)}
								disabled={summary.itemCounts.nonDeletedWithErrors === 0}
							>
								<span class="flex-grow">Fix Active Errors</span>
								<ChevronRight />
							</Button>
						</div>
					</div>
					{#if summary.itemCounts.nonDeletedWithErrors > 0}
						<div class="p-1">
							<BarChart
								data={summary.errorsByType.nonDeleted}
								variant="error"
								labelFormatter={(val) => getErrorTitle(val as any)}
								showTotal={true}
								totalLabel="Total Errors"
							/>
						</div>
					{/if}
				</div>
			{:else}
				<div
					class="card variant-soft-secondary flex p-4 items-center justify-center gap-x-2 text-success-800 dark:text-success-200"
				>
					<CheckCircle size={28} />
					<h3 class="text-lg">
						No {summary.itemCounts.deletedWithErrors > 0 ? 'Active' : ''} Items With Errors
					</h3>
				</div>
			{/if}

			{#if summary.itemCounts.deletedWithErrors > 0 || summary.itemCounts.nonDeletedWithErrors > 0}
				<Accordion
					{showDeletedItems}
					onValueChange={(e: any) => (showDeletedItems = e.value)}
					collapsible={false}
					class="card"
					disabled={!summary.itemCounts.deletedWithErrors}
				>
					<AccordionItem>
						<svelte:fragment slot="lead">
							<Trash2 class="text-warning-900 dark:text-warning-100" size={20} />
						</svelte:fragment>
						<svelte:fragment slot="summary">
							<div class="flex items-center gap-2">
								<span class="font-medium text-warning-900 dark:text-warning-100"
									>Deleted Items with Errors</span
								>
								<span class="badge variant-soft-warning"
									>{summary.itemCounts.deletedWithErrors} Items</span
								>
							</div>
						</svelte:fragment>
						<svelte:fragment slot="content">
							<div class="flex flex-col">
								<Button
									class="btn variant-filled-warning mb-2"
									action={client.unified.getFirstErrorUrl}
									queryMode
									input={{
										tableName,
										deletedMode: true
									}}
									res={async (output) => goto(output.url)}
									disabled={summary.itemCounts.deletedWithErrors === 0}
								>
									<span class="flex-grow">Fix or Review Deleted Item Errors</span>
									<ChevronRight />
								</Button>
								{#if Object.keys(summary.errorsByType.deleted).length > 0}
									<div class="">
										<BarChart
											data={summary.errorsByType.deleted}
											variant="warning"
											labelFormatter={(val) => getErrorTitle(val as any)}
											showTotal={true}
											totalLabel="Total Errors"
										/>
									</div>
								{/if}
							</div>
						</svelte:fragment>
					</AccordionItem>
				</Accordion>
			{/if}
			<div class="flex w-full flex-wrap gap-2">
				{#each summary.connectionSummaries as item}
					<div class="flex-1 p-4 card min-w-80">
						<div class="flex items-center pb-2">
							<h4 class="h4 font-semibold flex-grow">
								{UnifiedTableNamesReadable[
									item.tableName as keyof typeof UnifiedTableNamesReadable
								]}
							</h4>
							{#if item.unmatchedActive}
								<button class="btn btn-sm variant-filled-error">
									<span> Add Missing Matches </span>
									<ChevronRight />
								</button>
							{:else}
								<p
									class="variant-soft-primary p-1.5 px-4 rounded-full text-sm flex items-center gap-2"
								>
									<span> All Matched </span>
									<CheckCircle />
								</p>
							{/if}
						</div>
						<BarChart
							data={{
								'Matched Active': item.matchedActive,
								'Unmatched Active': item.unmatchedActive,
								'Matched Deleted': item.matchedDeleted,
								'Unmatched Deleted': item.unmatchedDeleted
							}}
							variant="secondary"
							customColors={{
								'Matched Active': 'bg-primary-500',
								'Unmatched Active': 'bg-error-500',
								'Matched Deleted': 'bg-primary-400',
								'Unmatched Deleted': 'bg-primary-200'
							}}
							showTotal={true}
							totalLabel="Total Item"
							maxColumns={2}
						/>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="text-center py-8">
			<AlertTriangle class="mx-auto mb-3 text-surface-400" size={48} />
			<p class="text-surface-600 dark:text-surface-300">Run unifier to get error summary</p>
		</div>
	{/if}
</div>
