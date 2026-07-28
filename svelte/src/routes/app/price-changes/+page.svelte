<script lang="ts">
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
	import Construction from 'lucide-svelte/icons/construction';

	let maxIncreasePercent = $state(40);
	let maxDecreasePercent = $state(40);
	let priceChangesData: Awaited<ReturnType<typeof client.qb.priceChanges.query>> | null =
		$state(null);

	function handlePriceChangesResult(
		result: Awaited<ReturnType<typeof client.qb.priceChanges.query>>
	) {
		priceChangesData = result;

		const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `price_changes_${new Date().toISOString().split('T')[0]}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>OEM3 Price Changes</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8">
	<div class="card flex items-center gap-3 border border-warning-500/30 p-4 variant-soft-warning">
		<Construction size={22} class="shrink-0" />
		<div>
			<p class="font-semibold">Coming soon</p>
			<p class="text-sm opacity-80">
				This workflow is still being developed. The existing QuickBooks export is available below.
			</p>
		</div>
	</div>

	<div class="text-center">
		<h1 class="h2">Price Changes</h1>
		<p class="mt-1 text-surface-500 dark:text-surface-300">
			Review and export price changes for QuickBooks.
		</p>
	</div>

	<section class="card p-4">
		<h2 class="h4 pb-3 font-semibold">QuickBooks Exports</h2>
		<Form
			action={{ query: client.qb.priceChanges.query }}
			queryMode
			res={handlePriceChangesResult}
			class="card flex flex-col items-center justify-center gap-4 p-4"
		>
			<h3 class="h5 text-center font-semibold">Export Price Changes</h3>
			<div class="flex flex-wrap items-center justify-center gap-8">
				<label class="flex flex-col items-center gap-2 text-sm font-medium">
					<span>Max Increase</span>
					<span class="flex items-center justify-center">
						<input
							name="maxIncreasePercent"
							type="number"
							bind:value={maxIncreasePercent}
							min="0"
							max="1000"
							class="input input-sm w-20 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
						/>
						<span class="pl-1">%</span>
					</span>
				</label>

				<label class="flex flex-col items-center gap-2 text-sm font-medium">
					<span>Max Decrease</span>
					<span class="flex items-center justify-center">
						<input
							name="maxDecreasePercent"
							type="number"
							bind:value={maxDecreasePercent}
							min="0"
							max="1000"
							class="input input-sm w-20 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
						/>
						<span class="pl-1">%</span>
					</span>
				</label>
			</div>

			<button type="submit" class="btn variant-ghost-primary">Download JSON</button>

			{#if priceChangesData}
				<div class="text-center text-sm text-surface-500 dark:text-surface-300">
					<p>
						Total changes: {priceChangesData.summary.filtered} / {priceChangesData.summary.total}
					</p>
					<p>
						Filtered by: ≤{priceChangesData.summary.maxIncreasePercent}% increase, ≤{priceChangesData
							.summary.maxDecreasePercent}% decrease
					</p>
				</div>
			{/if}
		</Form>
	</section>
</div>
