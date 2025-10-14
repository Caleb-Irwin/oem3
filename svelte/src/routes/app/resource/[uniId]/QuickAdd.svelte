<script lang="ts">
	import { client } from '$lib/client';
	import OldSearch from '$lib/search/OldSearch.svelte';
	import type { QueryType } from '../../../../../../server/src/routers/search';
	import SearchRes from '$lib/search/SearchRes.svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import QuickAddModal from './QuickAddModal.svelte';
	import { tick } from 'svelte';

	interface Props {
		baseSearch: string;
		tableName: QueryType;
		unifiedResourceType: string;
		resourceType: string;
		unifiedTitle: string;
		resourceId: number;
		unifiedColumn: string;
	}

	let {
		baseSearch,
		tableName,
		unifiedResourceType,
		resourceType,
		unifiedTitle,
		resourceId,
		unifiedColumn
	}: Props = $props();

	let searchRes: Awaited<ReturnType<typeof client.search.search.query>> | null = $state(null);

	const modalStore = getModalStore();
</script>

<div class="flex flex-col justify-center items-center card variant-glass w-full p-2">
	<OldSearch
		quickAdd
		initQuery={baseSearch}
		quickAddQueryType={tableName}
		altRes={(res) => {
			searchRes = res;
		}}
	/>

	<div class="w-full max-h-96 overflow-y-scroll pt-2">
		{#if searchRes}
			{#key searchRes}
				<SearchRes
					searchPages={[searchRes]}
					select={async (selection) => {
						if (selection.uniref) {
							tick().then(() => {
								modalStore.trigger({
									type: 'component',
									component: {
										ref: QuickAddModal,
										props: {
											uniId: selection.uniref,
											unifiedResourceType,
											resourceType,
											unifiedTitle,
											unifiedItemId: selection.id,
											resourceId,
											unifiedColumn
										}
									}
								});
							});
						}
					}}
					overrideGrid
				/>
			{/key}
		{:else}
			<div class="card p-2 flex items-center justify-center h-[82px] w-full">
				<p class="text-gray-500 animate-pulse">Loading...</p>
			</div>
		{/if}
	</div>
</div>
