<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
	import Search from 'lucide-svelte/icons/search';
</script>

<div class="container h-full mx-auto flex flex-col justify-center items-center">
	<div>
		<h1 class="h1 text-center mb-2">Home</h1>
		<p class="text-center">
			Welcome <span class="font-semibold">{data.user.username}</span>. Your permission level is
			<span class="font-semibold">{data.user.permissionLevel}</span>.
		</p>
	</div>
	<form class="p-2 m-2 mb-3 h-20 max-w-2xl form w-full flex">
		<div class="input-group input-group-divider grid-cols-[1fr_auto_auto]">
			<input type="text" placeholder="Search Query" disabled />
			<select disabled>
				<option>All</option>
				<option>QB</option>
			</select>
			<button class="variant-filled-primary w-16" disabled>
				<Search />
			</button>
		</div>
	</form>
	<div class="w-full grid grid-cols-1 lg:grid-cols-2">
		<a href="/app/shelf" class="card card-hover p-6 m-2">
			<h3 class="font-semibold text-2xl">Shelf</h3>
		</a>
		<a href="/app/" class="card p-6 m-2 cursor-not-allowed text-surface-400">
			<h3 class="font-semibold text-2xl">Quality Assurance</h3>
		</a>
		<a href="/app/qb" class="card card-hover p-6 m-2">
			<h3 class="font-semibold text-2xl">QuickBooks</h3>
		</a>
		<a href="/app/" class="card p-6 m-2 cursor-not-allowed text-surface-400">
			<h3 class="font-semibold text-2xl">Guild</h3>
		</a>
		<a href="/app/" class="card p-6 m-2 cursor-not-allowed text-surface-400">
			<h3 class="font-semibold text-2xl">SPRichards</h3>
		</a>
		<a href="/app/" class="card p-6 m-2 cursor-not-allowed text-surface-400">
			<h3 class="font-semibold text-2xl">Shopify</h3>
		</a>
		{#if data.user.permissionLevel === 'admin'}
			<a href="/app/admin" class="card card-hover p-6 m-2">
				<h3 class="font-semibold text-2xl">Admin Panel</h3>
			</a>
		{/if}
	</div>
</div>
