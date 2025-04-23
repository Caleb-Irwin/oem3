<script lang="ts">
	import { productDetails } from '$lib/productDetails';
	import type { PageProps } from './$types';

	let {data}: PageProps = $props();

	let product = $derived(data.res ? productDetails(data.res) : undefined);

</script>

<div class="card m-4 p-4 text-center">
	<h1 class="h2">Edit Item Config</h1>
	<p>{product?.name}</p>
</div>
