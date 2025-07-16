<script lang="ts">
	import Button from '$lib/Button.svelte';
	import WorkerStatus from '$lib/WorkerStatus.svelte';
	import { ProgressBar } from '@skeletonlabs/skeleton';
	import type { SummaryType } from '../../../../server/src/routers/summaries';
	import type { UnifiedTableNames } from '../../../../server/src/utils/unifier';
	import UnifiedErrorSummary from './UnifiedErrorSummary.svelte';
	import RotateCw from 'lucide-svelte/icons/rotate-cw';
	import CircleAlert from 'lucide-svelte/icons/circle-alert';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import type { Resolver } from '@trpc/client';
	import type { Readable } from 'svelte/store';

	interface Props {
		headerName: string;
		tableName: UnifiedTableNames;
		initialErrorData: SummaryType | null;
		workerRun: {
			mutate: Resolver<{
				input: {
					fileId?: number;
				};
				output: never;
				errorShape: any;
				transformer: false;
			}>;
		};
		workerStatus: Readable<
			| {
					message: string;
					error: boolean;
					running: boolean;
					progress: number;
			  }
			| undefined
		>;
	}

	let { headerName, tableName, initialErrorData, workerStatus, workerRun }: Props = $props();

	const workerData = $derived($workerStatus);
</script>

<div class="card mx-4 p-0">
	<div class="h-2">
		{#if workerData?.running && workerData?.progress >= 0}
			<ProgressBar
				meter="bg-primary-600"
				track="bg-surface-200 dark:bg-surface-500"
				height="h-1.5"
				value={workerData.progress * 100}
			/>
		{/if}
	</div>

	<div class="p-4 pt-2 flex items-center gap-x-2">
		<h4 class=" h3 font-semibold">{headerName}</h4>

		{#if workerData?.error}
			<div class="text-error-600">
				<CircleAlert height="h-8" />
			</div>
		{:else if workerData?.running}
			<div class="animate-spin text-primary-600">
				<LoaderCircle height="h-8" />
			</div>
		{:else}
			<div class="text-primary-600">
				<CircleCheck height="h-8" />
			</div>
		{/if}

		<div class="flex-grow"></div>

		<Button
			class="btn btn-icon btn-icon-sm text-secondary-500"
			action={workerRun}
			disabled={workerData?.running ?? false}
		>
			<RotateCw />
		</Button>
	</div>

	<div class="px-4">
		{#if workerData?.error}
			<WorkerStatus status={workerStatus} />
		{/if}
	</div>
	<div class="p-4 pt-0">
		<UnifiedErrorSummary {tableName} initialData={initialErrorData} />
	</div>
</div>
