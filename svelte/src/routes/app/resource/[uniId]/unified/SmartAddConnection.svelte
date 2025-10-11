<script lang="ts">
	import { client } from '$lib/client';
	import ItemRow from '$lib/ItemRow.svelte';
	import OldSearch from '$lib/search/OldSearch.svelte';
	import type { QueryType } from '../../../../../../../server/src/routers/search';
	import Minimize2 from 'lucide-svelte/icons/minimize-2';
	import Maximize2 from 'lucide-svelte/icons/maximize-2';
	import type { Cell, CellConfigRowInsert } from './types';

	interface Props {
		baseSearch: string;
		tableName: QueryType;
		expanded: boolean;
		cell: Cell;
	}

	let { baseSearch, tableName, expanded, cell }: Props = $props();

	let searchRes: Awaited<ReturnType<typeof client.search.search.query>> | null = $state(null);
</script>

{#if !expanded}
	<button
		class="btn variant-glass-secondary mb-2"
		onclick={() => {
			expanded = true;
		}}
		><Maximize2 /> <span>Show Quick Add</span>
	</button>
{:else}
	<div class="flex flex-col justify-center items-center card variant-glass w-full p-2">
		<div class="flex flex-row items-center justify-center w-full px-2 gap-2 flex-wrap-reverse">
			<div>
				<OldSearch
					quickAdd
					initQuery={baseSearch}
					quickAddQueryType={tableName}
					altRes={(res) => {
						searchRes = res;
					}}
				/>
			</div>
			<button
				class="btn variant-glass-secondary"
				onclick={() => {
					expanded = false;
				}}
				><Minimize2 /> <span>Hide Quick Add</span>
			</button>
		</div>

		<div class="card p-1 mt-2 w-full">
			{#if searchRes}
				<div class="flex flex-col flex-grow-0 w-full overflow-x-scroll max-h-72 gap-y-1">
					{#each searchRes.results as item}
						<div class="w-full">
							<ItemRow
								all={false}
								rawProduct={item.uniref}
								grid={false}
								select={async ({ id }) => {
									await client.unified.updateSetting.mutate({
										compoundId: cell.compoundId,
										col: cell.col,
										settingData: {
											col: cell.col as any,
											confType: 'setting:custom',
											refId: parseInt(cell.compoundId.split(':')[1]),
											created: Date.now(),
											value: id.toString()
										} satisfies CellConfigRowInsert
									});
								}}
							/>
						</div>
					{:else}
						<div class="min-h-24 grid place-content-center">
							<p class="text-center p-2 italic text-gray-500">No Results</p>
						</div>
					{/each}
				</div>
			{:else}
				<div class="min-h-24 grid place-content-center">
					<p class="text-center p-2 italic text-gray-500">Loading...</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
