<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import CompactSearch from '$lib/search/CompactSearch.svelte';
	import ItemRow from '$lib/ItemRow.svelte';
	import { client } from '$lib/client';
	import Search from 'lucide-svelte/icons/search';
	import Suspense from '$lib/Suspense.svelte';
	import type { getSmartChangeset, SmartChangesetKeys } from './smartChangeset';

	export let smartChangeset: Awaited<ReturnType<typeof getSmartChangeset>>, key: SmartChangesetKeys;

	const value = smartChangeset.fields[key].value,
		original = smartChangeset.fields[key].original;
	const modalStore = getModalStore(),
		getRawProduct = (res: any, key: string): any => {
			const obj: any = { uniId: res[key].uniref.uniId };
			obj[key] = res[key];
			return obj;
		},
		select = ({ id }: { id: number }) => {
			value.set(id.toString());
		};
</script>

<div class="card flex flex-col">
	<div class="flex flex-row items-center p-1 px-2">
		<p class="font-semibold text-lg"><slot /></p>
		<div class="flex-grow" />
		<button
			class="btn btn-icon btn-icon-sm h-8 w-8 variant-ghost-secondary text-secondary-500"
			on:click={() =>
				modalStore.trigger({
					type: 'component',
					component: {
						ref: CompactSearch,
						props: { select, queryType: key.replace('Alt', '') }
					}
				})}><Search /></button
		>
		<input
			type="text"
			class="input max-w-24 text-center ml-1 h-8 {$original != ($value === '' ? null : $value)
				? 'border-success-600 bg-success-300 dark:border-success-500 dark:bg-success-800'
				: ''}"
			bind:value={$value}
			placeholder="null"
		/>
	</div>
	{#if $value && $original == ($value === '' ? null : $value)}
		<ItemRow rawProduct={getRawProduct(smartChangeset.raw, key + 'Data')} />
	{:else if $value && $value != '-1'}
		{#key $value}
			<Suspense
				component={ItemRow}
				minimal
				promise={(async () => {
					const rawProduct = await client.resources.get.query({
						//@ts-expect-error
						type: key.replace('Alt', ''),
						id: parseInt($value.toString()),
						uniId: -1
					});
					if (!rawProduct) throw new Error('No resource found');
					return {
						rawProduct,
						all: true,
						extraClass:
							'border-success-600 bg-success-300 dark:border-success-500 dark:bg-success-800'
					};
				})()}
			>
				<div slot="error" class="h-full card grid place-content-center">
					<p class="text-center text-error-700 dark:text-error-400 font-semibold">
						Could not find resource
					</p>
				</div>
			</Suspense>
		{/key}
	{:else}
		<div
			class="h-full card grid place-content-center {$original != ($value === '' ? null : $value)
				? 'border-success-600 bg-success-300 dark:border-success-500 dark:bg-success-800'
				: ''}"
		>
			<p class="text-center text-surface-400">
				{#if $value == '-1'}
					<span class="font-semibold">Intentionally</span>
				{/if}
				Not Connected
			</p>
		</div>
	{/if}
</div>
