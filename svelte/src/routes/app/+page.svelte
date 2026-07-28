<script lang="ts">
	import SearchBar from '$lib/search/SearchBar.svelte';
	import HomeTile, { type TileStat } from './HomeTile.svelte';
	import { adminItems, dataSources, workflows, type NavItem } from '$lib/nav';
	import { client, subVal } from '$lib/client';
	import { derived as derivedStore } from 'svelte/store';
	import type { UnifiedErrorSummary } from '../../../../server/src/routers/summaries/worker';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const productSummary = subVal(client.summaries.getSub, {
			init: data.productSummary,
			input: { type: 'unifiedProduct' }
		}),
		guildSummary = subVal(client.summaries.getSub, {
			init: data.guildSummary,
			input: { type: 'unifiedGuild' }
		}),
		sprSummary = subVal(client.summaries.getSub, {
			init: data.sprSummary,
			input: { type: 'unifiedSpr' }
		});

	/** A tile reports on every worker its page owns, not just the unifier. */
	const workerState = (statuses: ({ running: boolean; error: boolean } | undefined)[]) => ({
		running: statuses.some((status) => status?.running),
		errored: statuses.some((status) => status?.error)
	});

	const productState = derivedStore(
			[subVal(client.product.worker.statusSub, { init: data.productWorker })],
			workerState
		),
		guildState = derivedStore(
			[
				subVal(client.guild.worker.statusSub, { init: data.guildWorker }),
				subVal(client.guild.data.worker.statusSub, { init: data.guildDataWorker }),
				subVal(client.guild.inventory.worker.statusSub, { init: data.guildInventoryWorker }),
				subVal(client.guild.flyer.worker.statusSub, { init: data.guildFlyerWorker }),
				subVal(client.guild.desc.worker.statusSub, { init: data.guildDescWorker })
			],
			workerState
		),
		sprState = derivedStore(
			[
				subVal(client.spr.worker.statusSub, { init: data.sprWorker }),
				subVal(client.spr.priceFile.worker.statusSub, { init: data.sprPriceFileWorker }),
				subVal(client.spr.flatFile.worker.statusSub, { init: data.sprFlatFileWorker }),
				subVal(client.spr.enhancedContent.worker.statusSub, { init: data.sprEnhancedContentWorker })
			],
			workerState
		),
		qbState = derivedStore(
			[subVal(client.qb.worker.statusSub, { init: data.qbWorker })],
			workerState
		),
		shopifyState = derivedStore(
			[
				subVal(client.shopify.worker.statusSub, { init: data.shopifyWorker }),
				subVal(client.shopify.pushSync.worker.statusSub, { init: data.shopifyPushWorker })
			],
			workerState
		);

	/** Each unifier lists its primary table first, so that connection holds the headline count. */
	function unifiedStat(
		summary: UnifiedErrorSummary | null,
		state: { running: boolean; errored: boolean }
	): TileStat {
		return {
			active: summary?.connectionSummaries[0]?.matchedActive ?? null,
			issues: summary?.itemCounts.nonDeletedWithErrors ?? null,
			...state
		};
	}

	/** Source tables have no errors of their own, so they only carry an item count. */
	function sourceStat(
		productSummary: UnifiedErrorSummary | null,
		tableName: string,
		state: { running: boolean; errored: boolean }
	): TileStat {
		const connection = productSummary?.connectionSummaries.find((c) => c.tableName === tableName);
		return {
			active: connection
				? connection.matchedActive + connection.unmatchedActive + connection.approvedUnmatchedActive
				: null,
			issues: null,
			...state
		};
	}

	const stats: Record<NonNullable<NavItem['stat']>, TileStat> = $derived.by(() => {
		const product = ($productSummary?.data ?? null) as UnifiedErrorSummary | null;
		return {
			unifiedProduct: unifiedStat(product, $productState),
			unifiedGuild: unifiedStat(
				($guildSummary?.data ?? null) as UnifiedErrorSummary | null,
				$guildState
			),
			unifiedSpr: unifiedStat(($sprSummary?.data ?? null) as UnifiedErrorSummary | null, $sprState),
			qb: sourceStat(product, 'qb', $qbState),
			shopify: sourceStat(product, 'shopify', $shopifyState)
		};
	});
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
	{@render section('Data Sources', dataSources)}

	{#if data.user.permissionLevel === 'admin'}
		{@render section('Administration', adminItems)}
	{/if}
</div>

{#snippet section(heading: string, tiles: NavItem[])}
	<section class="space-y-3">
		<h2
			class="text-sm font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-300"
		>
			{heading}
		</h2>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#each tiles as tile (tile.href)}
				<HomeTile {...tile} stat={tile.stat ? stats[tile.stat] : undefined} />
			{/each}
		</div>
	</section>
{/snippet}
