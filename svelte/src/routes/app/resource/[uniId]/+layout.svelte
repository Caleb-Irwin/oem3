<script lang="ts">
	import { client, subVal } from '$lib/client';
	import { productDetails } from '$lib/productDetails';
	import { setContext } from 'svelte';
	import { toStore } from 'svelte/store';
	import UnifiedMatchConf from './UnifiedMatchConf.svelte';

	let { children, data } = $props();

	const _res = $derived(
		subVal(client.resources.getSub, {
			init: data.res,
			input: { uniId: data.res.uniId as number, includeHistory: true, includeAllowUnmatched: true },
			updateTopic: data.res.resourceType,
			sendInit: true
		})
	);

	const res = $derived($_res) as typeof data.res;

	const product = $derived(res ? productDetails(res) : undefined);

	const resProductStore = toStore(() => ({ res, product }));

	setContext('resProduct', resProductStore);

	const idTextToName: Record<string, string> = {
		QB: 'QuickBooks',
		GuildData: 'Guild Data',
		GuildInventory: 'Guild Inventory',
		GuildFlyer: 'Guild Flyer',
		Shopify: 'Shopify',
		SPRPriceFile: 'SPR Price',
		SPRFlatFile: 'SPR Flat',
		UnifiedGuild: 'Guild',
		UnifiedSPR: 'SPR',
		UnifiedProduct: 'Product',
		Unknown: 'Unknown'
	};
</script>

<svelte:head>
	<title
		>OEM3 {data.res === null
			? 'Resource Not Found'
			: `${idTextToName[product?.idText.split('#')[0] ?? 'Unknown'] ?? 'Unknown'} "${product?.name ?? 'Unnamed Item'}"`}
	</title>
</svelte:head>

<div class="md:p-2">
	<UnifiedMatchConf
		{product}
		uniId={data.uniId}
		unmatchedMode={data.unmatchedMode}
		allowUnmatched={res.allowUnmatched ?? false}
		tableName={data.res.resourceType ?? ''}
		resourceType={data.res.resourceType ?? ''}
	/>

	{@render children()}
</div>
