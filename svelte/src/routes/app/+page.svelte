<script lang="ts">
	import Search from '$lib/search/Search.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="container h-full mx-auto flex flex-col justify-center items-center">
	<div>
		<h1 class="h1 text-center mb-2">Home</h1>
		<p class="text-center">
			Welcome <span class="font-semibold">{data.user.username}</span>. Your permission level is
			<span class="font-semibold">{data.user.permissionLevel}</span>.
		</p>
	</div>
	<Search />
	<div class="w-full grid grid-cols-1 lg:grid-cols-2">
		<a href="/app/shelf" class="card card-hover p-6 m-2">
			<h3 class="font-semibold text-2xl">Shelf</h3>
		</a>
		<a
			href="/app/unifiedItems"
			class="card p-6 m-2 {data.user.permissionLevel === 'admin'
				? 'card-hover'
				: 'cursor-not-allowed text-surface-400'}"
		>
			<h3 class="font-semibold text-2xl">Unified Items</h3>
		</a>
		<a href="/app/qb" class="card card-hover p-6 m-2">
			<h3 class="font-semibold text-2xl">QuickBooks</h3>
		</a>
		<a href="/app/guild" class="card card-hover p-6 m-2">
			<h3 class="font-semibold text-2xl">Guild</h3>
		</a>
		<a
			href="/app/spr"
			class="card p-6 m-2 {data.user.permissionLevel === 'admin'
				? 'card-hover'
				: 'cursor-not-allowed text-surface-400'}"
		>
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
