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
	import Search from 'lucide-svelte/icons/search';
	import CompactSearch from '$lib/search/CompactSearch.svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { ColToTableName, type Cell, type CellConfigRowInsert } from './types';
	import type { CellSetting } from '../../../../../../../server/src/db.schema';
	import { objectsEqual, validateCustomValue } from './utils';

	interface Props {
		cell: Cell;
		extraClass?: string;
	}
	let { cell, extraClass }: Props = $props();

	let newSetting = $derived(cell.setting);

	let customValue = $derived(cell.cellSettingConf?.value),
		customValueError: string | null = $state(null),
		approveThreshold = $derived(
			cell.setting === 'setting:approve' ? ((cell.value as number) ?? 15) : 15
		),
		approveCustomValue = $derived(newSetting === 'setting:approveCustom'),
		approveThresholdError: string | null = $state(null),
		isConnection = $derived(cell.connectionRow !== undefined);

	// Search for connections
	const modalStore = getModalStore();
	function openSearchModal() {
		modalStore.trigger({
			type: 'component',
			component: {
				ref: CompactSearch,
				props: {
					queryType: ColToTableName[cell.col as keyof typeof ColToTableName],
					select: async (selection: { uniref: number; id: number }) => {
						// Set the customValue to the selected item's ID
						customValue = selection.id.toString();
						modalStore.close();
					}
				}
			}
		});
	}

	$effect(() => {
		if (approveCustomValue && newSetting !== 'setting:approveCustom') {
			newSetting = 'setting:approveCustom';
		} else if (!approveCustomValue && newSetting === 'setting:approveCustom') {
			newSetting = 'setting:custom';
		}
	});

	let newCellSettingData: CellConfigRowInsert | undefined | null = $state(undefined);
	$effect(() => {
		const partialSetting = {
			col: cell.col as CellConfigRowInsert['col'],
			confType: newSetting as CellSetting,
			refId: Number(cell.compoundId.split(':')[1]),
			created: Date.now()
		} satisfies Partial<CellConfigRowInsert>;

		if (newSetting === null) {
			newCellSettingData = null;
			return;
		} else if (newSetting === 'setting:approve') {
			if (approveThreshold === null || approveThreshold < 0) {
				newCellSettingData = undefined;
				approveThresholdError =
					approveThreshold === null ? 'Cannot be empty' : 'Threshold must be a non-negative number';
				return;
			}
			approveThresholdError = null;
			newCellSettingData = {
				...partialSetting,
				value: approveThreshold?.toString() ?? 0,
				lastValue: cell.value?.toString() ?? null
			} satisfies CellConfigRowInsert;
			return;
		} else if (newSetting === 'setting:custom' || newSetting === 'setting:approveCustom') {
			const validation = validateCustomValue(customValue, cell.type, cell.nullable);
			customValueError = validation.error;
			if (validation.res === undefined) {
				newCellSettingData = undefined;
				return;
			}
			newCellSettingData = {
				...partialSetting,
				value: validation.res
			} satisfies CellConfigRowInsert;
			return;
		}
		newCellSettingData = undefined;
	});
	const hasChanges = $derived(
			newCellSettingData !== undefined &&
				!(cell.cellSettingConf === null && newCellSettingData === null) &&
				(newCellSettingData === null ||
					!objectsEqual(newCellSettingData, cell.cellSettingConf, ['created', 'id']))
		),
		showSaveButton = $derived(
			newCellSettingData === undefined || hasChanges || newSetting !== cell.setting
		);
</script>

{#if openSettings[cell.compoundId]?.[cell.col]}
	<div class="flex-grow w-full min-h-16 place-content-center min-w-52 p-0.5 {extraClass ?? ''}">
		<div class="card p-2">
			<p class="font-semibold text-center text-lg">Cell Setting</p>
			<div class="flex w-full items-center py-1 flex-wrap">
				<button
					class="m-0.5 btn flex-1 {!newSetting ? 'variant-filled-primary' : 'variant-filled'}"
					onclick={() => {
						newSetting = null;
					}}
				>
					Auto
				</button>
				{#if cell.type === 'number' && cell.connectionRow === undefined}
					<button
						class="m-0.5 btn flex-1 {newSetting === 'setting:approve'
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
					class="m-0.5 btn flex-1 {newSetting === 'setting:custom' ||
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
							class="input {approveThresholdError ? 'variant-ghost-error' : ''}"
							placeholder="Percent Change"
							bind:value={approveThreshold}
						/>
					</label>
					{#if approveThresholdError}
						<p class="font-bold text-error-600 -mt-1">{approveThresholdError}</p>
					{/if}

					<p>
						Last approved value is <span class="font-semibold"
							><BreakableText
								text={cell.cellSettingConf?.lastValue?.toString() ??
									cell.value?.toString() ??
									'Null'}
							/></span
						>
					</p>
				{:else}
					<p>Cell <span class="font-semibold">{cell.col}</span> is set to a custom value</p>
					<label class="label pt-2">
						<span class="label-text font-bold"
							>Custom Value (must be {`${
								{ string: 'text', number: 'a number', boolean: 'true or false' }[cell.type]
							}${cell.nullable ? ' or Null' : ''}`})</span
						>
						<div class="flex items-center">
							<textarea
								class="textarea {customValueError ? 'variant-ghost-error' : ''} w-full"
								rows={cell.value && cell.value.toString().length > 100 ? 4 : 1}
								placeholder="Value"
								bind:value={customValue}
							></textarea>
							{#if isConnection}
								<button class="ml-1 btn variant-filled-secondary" onclick={openSearchModal}
									>Find Item <Search class="ml-1" /></button
								>
							{/if}
						</div>
					</label>
					{#if customValueError}
						<p class="font-bold text-error-600 pt-1">{customValueError}</p>
					{/if}

					<label class="flex justify-center items-center p-2 w-full">
						<input class="checkbox" type="checkbox" bind:checked={approveCustomValue} />
						<p class="pl-2">Approve custom value on underlying value change</p>
					</label>
					<p>
						Current value is <span class="font-semibold"
							><BreakableText text={cell.value === null ? 'Null' : cell.value.toString()} /></span
						>
					</p>
					<p class="pt-1">
						Last auto (underlying) value is <span class="font-semibold"
							><BreakableText
								text={cell.cellSettingConf?.lastValue?.toString() ??
									cell.value?.toString() ??
									'Null'}
							/></span
						>
					</p>
				{/if}
			</div>
			{#if showSaveButton}
				<div class="w-full px-0.5 pt-2">
					<button class="btn variant-filled-primary w-full" disabled={!hasChanges}> Save </button>
				</div>
				<p class="pre m-2">
					{newCellSettingData ? JSON.stringify(newCellSettingData, null, 2) : newCellSettingData}
				</p>
			{/if}
		</div>
	</div>
{/if}
