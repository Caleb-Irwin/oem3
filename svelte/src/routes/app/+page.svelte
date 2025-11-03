<script lang="ts">
	import SearchBar from '$lib/search/SearchBar.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<svelte:head>
	<title>OEM3 Home</title>
</svelte:head>

<div class="container h-full mx-auto flex flex-col justify-center items-center">
	<div>
		<h1 class="h1 text-center mb-2">Home</h1>
	</div>
	<div class="w-full flex">
		<SearchBar />
	</div>
	<div class="w-full grid grid-cols-1 lg:grid-cols-2">
		<a href="/app/shelf" class="card card-hover p-6 m-2">
			<h3 class="font-semibold text-2xl">Shelf</h3>
		</a>
		<a href="/app/product" class="card p-6 m-2 card-hover">
			<h3 class="font-semibold text-2xl">Unified Products</h3>
		</a>
		<a href="/app/qb" class="card card-hover p-6 m-2">
			<h3 class="font-semibold text-2xl">QuickBooks</h3>
		</a>
		<a href="/app/guild" class="card card-hover p-6 m-2">
			<h3 class="font-semibold text-2xl">Guild</h3>
		</a>
		<a href="/app/spr" class="card card-hover p-6 m-2">
			<h3 class="font-semibold text-2xl">SPRichards</h3>
		</a>
		<a href="/app/shopify" class="card p-6 m-2 card-hover">
			<h3 class="font-semibold text-2xl">Shopify</h3>
		</a>
		{#if data.user.permissionLevel === 'admin'}
			<a href="/app/admin" class="card card-hover p-6 m-2">
				<h3 class="font-semibold text-2xl">Admin Panel</h3>
			</a>
		{/if}
	</div>
</div>
