<script lang="ts">
	import Button from '$lib/Button.svelte';
	import { client, subValReturnError } from '$lib/client';
	import ItemRow from '$lib/ItemRow.svelte';
	import { productDetails } from '$lib/productDetails';
	import { UnifiedTableNamesReadable } from '$lib/summary/tableNames';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import Check from 'lucide-svelte/icons/check';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import X from 'lucide-svelte/icons/x';
	import type { CellConfigRowInsert } from './unified/types';

	interface Props {
		uniId: number;
		unifiedResourceType: string;
		resourceType: string;
		unifiedTitle: string;
		unifiedItemId: number;
		resourceId: number;
		unifiedColumn: string;
	}

	let {
		uniId,
		unifiedResourceType,
		resourceType,
		unifiedTitle,
		unifiedItemId,
		resourceId,
		unifiedColumn
	}: Props = $props();

	const resStore = subValReturnError(client.resources.getSub, {
		input: { uniId, includeHistory: false },
		updateTopic: unifiedResourceType
	});
	const res = $derived($resStore);

	const resError = $derived(
		res !== undefined &&
			((res as unknown as { error: string }).error || !res.uniId ? 'Not Found' : false)
	);

	const productDetailsRes = $derived(res ? productDetails(res) : undefined);

	const alreadyConnected = $derived(
		productDetailsRes
			? (productDetailsRes.connections?.find((conn) => conn.tableName === resourceType)
					?.connected ?? true)
			: true
	);

	const modalStore = getModalStore();
</script>

<div class="card max-w-md p-4 flex flex-col items-center">
	<h2 class="h4 font-semibold w-full">Quick Add Connection</h2>
	{#if resError}
		<p class="text-lg font-semibold p-2 w-full text-center text-error-600">
			Error loading unified item ({resError}). Something went wrong!
		</p>
	{:else if res === undefined}
		<p class="font-semibold p-2 w-full text-center animate-pulse">Loading...</p>
	{:else}
		<div class="flex flex-col pt-2 gap-y-2">
			<ItemRow rawProduct={res as any} newTab />

			<div
				class="flex items-center card {alreadyConnected
					? 'variant-glass-error'
					: 'variant-glass-warning'} p-2"
			>
				<span class="pr-2"><TriangleAlert /></span>
				<p class="font-semibold">
					Are you sure you want to {alreadyConnected ? 'change the' : 'add a'}
					{UnifiedTableNamesReadable[resourceType as keyof typeof UnifiedTableNamesReadable] ?? ''} connection
					of this {unifiedTitle} item?
					{#if alreadyConnected}
						<span class="font-normal">
							This will <span class="font-bold"> overwrite</span> the existing connection and disable
							auto matching.
						</span>
					{:else}
						<span class="font-normal"
							>Note that this will add a custom value which will disable auto matching.</span
						>
					{/if}
				</p>
			</div>

			<div class="flex gap-x-2 w-full pt-2">
				<div class="flex-1 flex justify-stretch">
					<button
						class="btn variant-filled-error flex-grow"
						onclick={() => {
							modalStore.close();
						}}
					>
						<X />
						<span> Cancel </span>
					</button>
				</div>
				<div class="flex-1">
					<Button
						class="btn variant-filled-primary w-full"
						action={client.unified.updateSetting}
						input={{
							compoundId: `${unifiedResourceType}:${unifiedItemId}`,
							col: unifiedColumn,
							settingData: {
								col: unifiedColumn as any,
								confType: 'setting:custom',
								refId: unifiedItemId,
								created: Date.now(),
								value: resourceId.toString()
							} satisfies CellConfigRowInsert
						}}
						flexible
						res={() => modalStore.close()}
						successMessage="Match Updated"
						invalidateAll
					>
						<Check />
						<span> Confirm </span>
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
