<script lang="ts">
	import { client, subVal } from '$lib/client';
	import ModalSearchBar from '$lib/search/ModalSearchBar.svelte';
	import UnifiedSummary from '$lib/summary/UnifiedSummary.svelte';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
</script>

<h1 class="text-center h2 p-2 pt-4">Unified Products</h1>

<ModalSearchBar
	queryType="unifiedSpr"
	placeholder="Search Unified Product TODO"
	class="max-w-xl pb-2"
/>

<UnifiedSummary
	tableName="unifiedProduct"
	initialErrorData={data.productErrorSummary}
	workerStatus={subVal(client.product.worker.statusSub, {
		init: data.productWorkerStatus
	})}
	workerRun={client.product.worker.run}
	headerName="Unified Products"
/>
