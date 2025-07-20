<script lang="ts">
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import Info from 'lucide-svelte/icons/info';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import { getContext } from 'svelte';
	import type { PageProps } from './$types';
	import { getErrorTitle } from './helpers';
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import { goto, preloadData } from '$app/navigation';
	import { page } from '$app/state';

	let props: PageProps = $props();

	const unifiedData = getContext('unifiedData') as any;
	const data = $derived($unifiedData) as typeof props.data;

	const allErrors = $derived(data.allActiveErrors || []);

	let isExpanded = $state(false);
	const visibleErrors = $derived(isExpanded ? allErrors : allErrors.slice(0, 3));

	$effect(() => {
		const json = page.url.hash.split('#')[1];
		if (json) {
			const { prefetchURLs } = JSON.parse(decodeURIComponent(json));
			prefetchURLs?.forEach((url: string) => {
				preloadData(url);
			});
		}
	});
</script>

<div class="sticky top-0 z-10 p-2 md:px-4">
	<div
		class="w-full p-1 card {allErrors.length === 0
			? 'variant-ghost-primary'
			: 'variant-ghost-error'} backdrop-blur-md relative"
	>
		<div
			class="flex items-center justify-between p-1 px-2 pt-2 pb-0 {visibleErrors.length === 0
				? 'pb-1.5'
				: ''}"
		>
			<div class="flex items-center space-x-2">
				<h3 class="h3 font-bold">Errors</h3>
				<span
					class="chip text-sm {allErrors.length === 0
						? 'variant-glass-primary'
						: 'variant-glass-error'}"
				>
					{allErrors.length} Issue{allErrors.length !== 1 ? 's' : ''}
				</span>
			</div>

			<div class="flex flex-wrap items-center gap-x-2 gap-y-2 justify-end">
				<Button
					class="btn w-36 variant-soft-surface"
					action={client.unified.getErrorUrl}
					queryMode
					input={{
						currentUniId: data.uniId,
						mode: 'prev',
						urlHash: page.url.hash
					}}
					res={async (output) => goto(output.url)}
				>
					<ChevronLeft />
					<span class="flex-grow">Previous</span>
				</Button>
				<Button
					class="btn w-36 {allErrors.length === 0
						? 'variant-filled-primary'
						: 'variant-soft-surface'}"
					action={client.unified.getErrorUrl}
					queryMode
					input={{
						currentUniId: data.uniId,
						mode: 'next',
						urlHash: page.url.hash
					}}
					res={async (output) => goto(output.url)}
				>
					<span class="flex-grow">{allErrors.length === 0 ? 'Continue' : 'Skip'}</span>
					<ChevronRight />
				</Button>
			</div>
		</div>

		{#if visibleErrors.length > 0}
			<div class="space-y-1">
				{#each visibleErrors as error (error.id)}
					<div class="flex items-center space-x-2 px-2 py-1">
						<div class="flex-shrink-0">
							{#if error.confType === 'error:needsApproval'}
								<Info size="20" />
							{:else}
								<TriangleAlert size="20" />
							{/if}
						</div>

						<div class="flex-grow min-w-0">
							<div class="flex items-center justify-between">
								<div class="flex-grow min-w-0">
									<p class="font-semibold truncate">
										{getErrorTitle(error.confType)}
										<span class="code ml-1">{error.col}</span>
									</p>
									<p class="text-xs text-surface-600 dark:text-surface-300 truncate opacity-75">
										{error.message ? `${error.message}` : ''}
									</p>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if allErrors.length > 3}
			<button
				class="btn btn-sm variant-soft-error absolute bottom-2 right-4 z-20"
				onclick={() => (isExpanded = !isExpanded)}
			>
				{#if isExpanded}
					<ChevronUp />
					<span>Show Less</span>
				{:else}
					<ChevronDown />
					<span>Show {allErrors.length - 3} More</span>
				{/if}
			</button>
		{/if}
	</div>
</div>
