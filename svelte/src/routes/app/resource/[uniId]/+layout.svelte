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
			input: { uniId: data.res.uniId as number, includeHistory: true },
			updateTopic: data.res.resourceType
		})
	);

	const res = $derived($_res) as typeof data.res;

	const product = $derived(res ? productDetails(res) : undefined);

	const resProductStore = toStore(() => ({ res, product }));

	setContext('resProduct', resProductStore);
</script>

<div class="md:p-2">
	<UnifiedMatchConf {product} uniId={data.uniId} unmatchedMode={data.unmatchedMode} />

	{@render children()}
</div>
