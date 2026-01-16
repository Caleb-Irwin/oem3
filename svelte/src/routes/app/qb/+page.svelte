<script lang="ts">
	import Files from '$lib/Files.svelte';
	import ChangesetStatus from '$lib/ChangesetStatus.svelte';
	import { client, subVal } from '$lib/client';
	import type { PageProps } from './$types';
	import ModalSearchBar from '$lib/search/ModalSearchBar.svelte';
	import Form from '$lib/Form.svelte';

	let { data }: PageProps = $props();

	let maxIncreasePercent = $state(40);
	let maxDecreasePercent = $state(40);
	let priceChangesData = $state<{ summary: any; data: any[] } | null>(null);

	function handlePriceChangesResult(result: any) {
		priceChangesData = result;

		const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `price_changes_${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>OEM3 QuickBooks</title>
</svelte:head>

<h1 class="text-center h2 p-2 pt-4">QuickBooks</h1>
<ModalSearchBar queryType="qb" placeholder="Search QuickBooks" class="max-w-xl pb-2" />

<div class="w-full flex flex-col xl:grid xl:grid-cols-2 justify-center p-2">
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full max-w-xl mb-2">
			<ChangesetStatus
				name="QuickBooks"
				status={subVal(client.qb.worker.statusSub, { init: data.status })}
				changeset={subVal(client.qb.worker.changesetSub, {
					init: data.changeset
				})}
			/>
		</div>
		<div class="w-full max-w-xl">
			<Files
				filesRouter={client.qb.files}
				title="QuickBooks Items"
				applyMutation={client.qb.worker.run}
				acceptFileType=".CSV"
				initVal={data.files}
			/>
		</div>
	</div>
	<div class="w-full flex flex-col items-center p-2">
		<div class="w-full max-w-xl mb-2">
			<div class="card p-4 min-w-72">
				<div class="flex justify-between pb-2 items-center">
					<h4 class="pr-2 h4 font-semibold">QuickBooks Exports</h4>
				</div>
				<Form
					action={{ query: client.qb.priceChanges.query }}
					queryMode={true}
					res={handlePriceChangesResult}
					class="flex flex-col gap-4 gap-y-4 items-center justify-center card p-4"
				>
					<h6 class="h5 font-semibold text-center">Export Price Changes</h6>
					<div class="flex gap-8 items-center justify-center">
						<div class="flex flex-col gap-2">
							<label for="maxIncreasePercent" class="text-sm font-medium">Max Increase</label>
							<div class="justify-center flex items-center">
								<input
									id="maxIncreasePercent"
									name="maxIncreasePercent"
									type="number"
									value={maxIncreasePercent}
									min="0"
									max="1000"
									placeholder="100"
									class="text-right input input-bordered input-sm w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
								/>
								%
							</div>
						</div>
						<div class="flex items-center flex-col gap-2">
							<label for="maxDecreasePercent" class="text-sm font-medium">Max Decrease</label>
							<div class="justify-center flex items-center">
								<input
									id="maxDecreasePercent"
									name="maxDecreasePercent"
									type="number"
									value={maxDecreasePercent}
									min="0"
									max="1000"
									placeholder="100"
									class="text-right input input-bordered variant-outline-primary input-sm w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
								/>
								%
							</div>
						</div>
					</div>
					<div class="flex gap-2 pt-2 justify-center">
						<button type="submit" class="btn variant-filled-primary"> Download JSON </button>
					</div>
					{#if priceChangesData?.summary}
						<div class="text-sm text-gray-600 text-center">
							<div>
								Total changes: {priceChangesData.summary.filtered} / {priceChangesData.summary
									.total}
							</div>
							<div>
								Filtered by: ≤{priceChangesData.summary.maxIncreasePercent}% increase, ≤{priceChangesData
									.summary.maxDecreasePercent}% decrease
							</div>
						</div>
					{/if}
				</Form>
			</div>
		</div>
	</div>
</div>
