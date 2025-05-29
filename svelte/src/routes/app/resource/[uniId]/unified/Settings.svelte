<script lang="ts" module>
	const openSettings = $state<{ [compoundId: string]: { [col: string]: boolean } }>({});

	export function toggleSettings(compoundId: string, col: string) {
		if (!openSettings[compoundId]) {
			openSettings[compoundId] = {};
		}
		openSettings[compoundId][col] = !openSettings[compoundId][col];
	}
</script>

<script lang="ts">
	import BreakableText from '$lib/helpers/BreakableText.svelte';
	import type { Cell, CellConfigData } from './types';

	interface Props {
		cell: Cell;
		extraClass?: string;
	}
	let { cell, extraClass }: Props = $props();

	let newSetting = $derived(cell.setting);

	const cellSettingData = $derived(
		cell.cellSettingConf?.data ? JSON.parse(cell.cellSettingConf.data) : null
	) as CellConfigData | null;

	let customValue = $derived(cellSettingData?.value),
		approveThreshold = $derived(
			cell.setting === 'setting:approve' ? ((cellSettingData?.value as number) ?? 15) : 15
		),
		approveCustomValue = $derived(newSetting === 'setting:approveCustom');

	$effect(() => {
		if (approveCustomValue && newSetting !== 'setting:approveCustom') {
			newSetting = 'setting:approveCustom';
		} else if (!approveCustomValue && newSetting === 'setting:approveCustom') {
			newSetting = 'setting:custom';
		}
	});
</script>

{#if openSettings[cell.compoundId]?.[cell.col]}
	<div class="flex-grow w-full min-h-16 place-content-center min-w-52 p-0.5 {extraClass ?? ''}">
		<div class="card p-2">
			<p class="font-semibold text-center text-lg">Cell Setting</p>
			<div class="flex w-full items-center py-1">
				<button
					class="mx-0.5 w-full btn {!newSetting ? 'variant-filled-primary' : 'variant-filled'}"
					onclick={() => {
						newSetting = null;
					}}
				>
					Auto
				</button>
				{#if cell.type === 'number' && cell.connectionRow === undefined}
					<button
						class="mx-0.5 w-full btn {newSetting === 'setting:approve'
							? 'variant-filled-primary'
							: 'variant-filled'}"
						onclick={() => {
							newSetting = 'setting:approve';
						}}
					>
						Approve
					</button>
				{/if}
				<button
					class="mx-0.5 w-full btn {newSetting === 'setting:custom' ||
					newSetting === 'setting:approveCustom'
						? 'variant-filled-primary'
						: 'variant-filled'}"
					onclick={() => {
						newSetting = 'setting:custom';
					}}
				>
					Custom
				</button>
			</div>
			<div class="text-center">
				{#if newSetting === null}
					<p>Cell <span class="font-semibold">{cell.col}</span> is set automatically</p>
				{:else if newSetting === 'setting:approve'}
					<p>
						Cell <span class="font-semibold">{cell.col}</span> is set to approve mode
					</p>
					<label class="label py-2">
						<span class="label-text font-bold">Approval Threshold (by % change)</span>
						<input
							type="number"
							class="input"
							placeholder="Percent Change"
							bind:value={approveThreshold}
						/>
					</label>
					<p>
						Last approved value is <span class="font-semibold"
							><BreakableText
								text={cellSettingData?.lastValue?.toString() ?? cell.value?.toString() ?? 'Null'}
							/></span
						>
					</p>
				{:else}
					<p>Cell <span class="font-semibold">{cell.col}</span> is set to a custom value</p>
					<label class="label pt-2">
						<label class="label">
							<span class="label-text font-bold"
								>Custom Value (must be {`${
									{ string: 'text', number: 'a number', boolean: 'true or false' }[cell.type]
								}${cell.nullable ? ' or Null' : ''}`})</span
							>
							<textarea
								class="textarea"
								rows={cell.value && cell.value.toString().length > 100 ? 4 : 1}
								placeholder="Value"
								bind:value={customValue}
							></textarea>
						</label>
					</label>
					<label class="flex justify-center items-center p-2 w-full">
						<input class="checkbox" type="checkbox" bind:checked={approveCustomValue} />
						<p class="pl-2">Approve custom value on underlying value change</p>
					</label>
					<p class="pt-1">
						Current value is <span class="font-semibold"
							><BreakableText text={cell.value === null ? 'Null' : cell.value.toString()} /></span
						>
					</p>
					<p class="pt-1">
						Last auto (underlying) value is <span class="font-semibold"
							><BreakableText
								text={cellSettingData?.lastValue?.toString() ?? cell.value?.toString() ?? 'Null'}
							/></span
						>
					</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
