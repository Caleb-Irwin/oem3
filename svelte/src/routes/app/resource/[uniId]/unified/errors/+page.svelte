<script lang="ts">
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import Info from 'lucide-svelte/icons/info';
	import { getContext } from 'svelte';
	import type { PageProps } from './$types';
	import { getErrorTitle } from './helpers';
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import { goto, preloadData } from '$app/navigation';
	import { page } from '$app/state';

	let props: PageProps = $props();

	const unifiedData = getContext('unifiedData') as any;
	const data = $derived($unifiedData) as typeof props.data.unifiedRes;
	const allErrors = $derived(data.allActiveErrors || []);

	let deletedMode = $state(false);

	$effect(() => {
		const json = page.url.hash.split('#')[1];
		if (json) {
			const { prefetchURLs, deleted } = JSON.parse(decodeURIComponent(json));
			prefetchURLs?.forEach((url: string) => {
				preloadData(url);
			});
			deletedMode = deleted;
		}
	});
</script>

<div class="sticky top-0 z-10 p-2">
	<div
		class="w-full p-2 card {allErrors.length === 0
			? 'variant-ghost-primary'
			: 'variant-ghost-error'} backdrop-blur-md relative"
	>
		<div class="flex items-center justify-between p-1 {allErrors.length === 0 ? 'pb-1.5' : ''}">
			<div class="flex items-center space-x-2">
				<h3 class="h3 font-bold">Errors {deletedMode ? 'in Deleted Items' : ''}</h3>
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

		{#if allErrors.length > 0}
			<div
				class="pt-1 gap-2 grid grid-cols-1 {allErrors.length >= 2
					? 'sm:grid-cols-2'
					: ''} {allErrors.length >= 3 ? 'lg:grid-cols-3' : ''} {allErrors.length >= 4
					? 'xl:grid-cols-4'
					: ''}"
			>
				{#each allErrors as error (error.id)}
					<div class="flex items-center space-x-2 px-2 py-1 variant-glass card">
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
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
