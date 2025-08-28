<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import Settings from 'lucide-svelte/icons/settings';
	import { Accordion, AccordionItem, focusTrap } from '@skeletonlabs/skeleton';
	import type { QueryType } from '../../../../server/src/routers/search';
	import { afterNavigate } from '$app/navigation';

	interface Props {
		query?: string;
		queryType?: QueryType;
		small?: boolean;
		// qbMode?: boolean;
		// searchInResults?: boolean;
	}

	let props: Props = $props();

	let query = $state(props.query ?? ''),
		focus: boolean = $state(false),
		queryType: string | undefined = $state(props.queryType),
		// qbMode: boolean = $state(props.qbMode ?? false),
		// searchInResults: boolean = $state(props.searchInResults ?? false),
		searchSettingsOpen: boolean = $state(
			props.queryType !== 'all' && props.queryType !== undefined
			//  ||
			// props.qbMode === true ||
			// props.searchInResults === true
		),
		loading = $state(false);

	afterNavigate(() => (loading = false));
</script>

<form class="w-full" action="/app/search" onsubmit={() => (loading = true)}>
	<div class="w-full flex flex-col justify-center content-center items-center pb-1">
		<div class="{props.small ? 'h-12' : 'h-20'} p-1 form w-full flex max-w-2xl">
			<div class="input-group input-group-divider grid-cols-[1fr_auto]" use:focusTrap={focus}>
				<input
					type="text"
					placeholder="Search Query"
					name="query"
					class={loading ? 'text-gray-500' : ''}
					bind:value={query}
				/>
				<button
					class="variant-filled-primary w-16 {loading ? 'bg-primary-400 dark:bg-primary-800' : ''}"
				>
					<Search />
				</button>
			</div>
		</div>

		<Accordion class="max-w-2xl px-1 {props.small ? 'hidden' : ''}">
			<AccordionItem
				open={searchSettingsOpen}
				on:toggle={() => (searchSettingsOpen = !searchSettingsOpen)}
			>
				<svelte:fragment slot="lead"><Settings /></svelte:fragment>
				<svelte:fragment slot="summary">Search Settings</svelte:fragment>
				<svelte:fragment slot="content">
					{@render searchOptions()}
				</svelte:fragment>
			</AccordionItem>
		</Accordion>
		{#if !searchSettingsOpen}
			<div class="hidden">
				{@render searchOptions()}
			</div>
		{/if}
	</div>
</form>

{#snippet searchOptions()}
	<div class="w-full flex flex-row flex-wrap justify-center">
		<label for="type" class="label flex flex-row items-center m-0.5">
			<span class="text-nowrap font-semibold">Item Type </span>
			<select class="max-w-40 select h-10 ml-2" name="type" bind:value={queryType}>
				<option value="all">All</option>
				<option value="unifiedGuild">Unified Guild</option>
				<option value="unifiedSpr">Unified SPR</option>
				<option value="qb">QuickBooks</option>
				<option value="shopify">Shopify</option>
				<option value="guildData">Guild Data</option>
				<option value="guildInventory">Guild Inventory</option>
				<option value="guildFlyer">Guild Flyer</option>
				<option value="sprPriceFile">SPR Price</option>
				<option value="sprFlatFile">SPR Info</option>
			</select>
		</label>
		<!-- <div class="w-4"></div>
		<label for="qbMode" class="flex flex-col items-center">
			"QuickBooks" Mode
			<br />
			<SlideToggle
				name="qbMode"
				active="bg-primary-500"
				background="bg-surface-200 dark:bg-surface-500"
				size="lg"
				bind:checked={qbMode}
			/>
		</label>
		<div class="w-4"></div>
		<label for="searchInResults" class="mx-0.5 flex flex-col items-center">
			Search In Results
			<br />
			<SlideToggle
				name="searchInResults"
				active="bg-primary-500"
				background="bg-surface-200 dark:bg-surface-500"
				size="lg"
				bind:checked={searchInResults}
			/>
		</label> -->
	</div>
{/snippet}
