<script lang="ts">
	import SearchBar from '$lib/search/SearchBar.svelte';
	import HomeTile from './HomeTile.svelte';
	import type { PageData } from './$types';
	import Tags from 'lucide-svelte/icons/tags';
	import ReceiptText from 'lucide-svelte/icons/receipt-text';
	import Boxes from 'lucide-svelte/icons/boxes';
	import Building2 from 'lucide-svelte/icons/building-2';
	import Truck from 'lucide-svelte/icons/truck';
	import Calculator from 'lucide-svelte/icons/calculator';
	import ShoppingBag from 'lucide-svelte/icons/shopping-bag';
	import ShieldCheck from 'lucide-svelte/icons/shield-check';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const workflows = [
		{
			href: '/app/shelf',
			title: 'Shelf Labels',
			description: 'Build, arrange, and print label sheets',
			icon: Tags
		},
		{
			href: '/app/price',
			title: 'Price List',
			description: 'Look up costs and price breakdowns',
			icon: ReceiptText
		},
		{
			href: '/app/product',
			title: 'Unified Products',
			description: 'Review matches and resolve item errors',
			icon: Boxes
		}
	];

	const sources = [
		{
			href: '/app/guild',
			title: 'Guild',
			description: 'Price file, inventory, and flyer data',
			icon: Building2
		},
		{
			href: '/app/spr',
			title: 'SPRichards',
			description: 'Price file and Etilize content',
			icon: Truck
		},
		{
			href: '/app/qb',
			title: 'QuickBooks',
			description: 'Item list imports and exports',
			icon: Calculator
		},
		{
			href: '/app/shopify',
			title: 'Shopify',
			description: 'Storefront catalogue sync',
			icon: ShoppingBag
		}
	];
</script>

<svelte:head>
	<title>OEM3 Home</title>
</svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10 space-y-10">
	<header class="text-center space-y-2">
		<p class="text-sm uppercase tracking-widest text-surface-400 dark:text-surface-300">
			Office Experts Manage 3
		</p>
		<h1 class="h2 font-semibold">
			Welcome back, <span class="capitalize">{data.user.username}</span>
		</h1>
	</header>

	<div class="flex justify-center">
		<SearchBar />
	</div>

	{@render section('Workflows', workflows)}
	{@render section('Data Sources', sources)}

	{#if data.user.permissionLevel === 'admin'}
		{@render section('Administration', [
			{
				href: '/app/admin',
				title: 'Admin Panel',
				description: 'Manage users and permissions',
				icon: ShieldCheck
			}
		])}
	{/if}
</div>

{#snippet section(heading: string, tiles: (typeof workflows)[number][])}
	<section class="space-y-3">
		<h2
			class="text-sm font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-300"
		>
			{heading}
		</h2>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#each tiles as tile (tile.href)}
				<HomeTile {...tile} />
			{/each}
		</div>
	</section>
{/snippet}
