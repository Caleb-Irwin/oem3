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
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';

	interface Props {
		cell: Cell;
		extraClass?: string;
	}
	let { cell, extraClass }: Props = $props();

	let newSetting = $derived(cell.setting);

	let customValue = $derived(
			cell.setting === 'setting:custom' ? cell.cellSettingConf?.value : null
		),
		customValueError: string | null = $state(null),
		approveThreshold = $derived(
			cell.setting === 'setting:approve' ? parseInt(cell.cellSettingConf?.value ?? '15') : 15
		),
		approveCustomValue = $derived(newSetting === 'setting:approveCustom'),
		approveThresholdError: string | null = $state(null),
		isConnection = $derived(cell.connectionRow !== undefined);

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
				value: validation.res,
				lastValue: newSetting === 'setting:approveCustom' ? (cell.value?.toString() ?? null) : null
			} satisfies CellConfigRowInsert;
			return;
		}
		newCellSettingData = undefined;
	});
	const hasChanges = $derived(
		newCellSettingData !== undefined &&
			!(cell.cellSettingConf === null && newCellSettingData === null) &&
			(newCellSettingData === null ||
				!objectsEqual(newCellSettingData, cell.cellSettingConf, [
					'created',
					'id',
					'message',
					'notes',
					'options',
					'resolved',
					'otherData'
				]))
	);
</script>

{#if openSettings[cell.compoundId]?.[cell.col]}
	<Form
		class="flex-grow w-full min-h-16 place-content-center min-w-52 p-0.5 {extraClass ?? ''}"
		action={client.unified.updateSetting}
		input={{
			compoundId: cell.compoundId,
			col: cell.col,
			settingData: newCellSettingData ?? null
		}}
		noReset
		successMessage="Cell setting updated successfully"
	>
		<div class="card p-2">
			<p class="font-semibold text-center text-lg">Cell Setting</p>
			<div class="flex w-full items-center py-1 flex-wrap">
				<button
					class="m-0.5 btn flex-1 {!newSetting ? 'variant-filled-primary' : 'variant-filled'}"
					onclick={(e) => {
						newSetting = null;
						e.preventDefault();
					}}
				>
					Auto
				</button>
				{#if cell.type === 'number' && cell.connectionRow === undefined}
					<button
						class="m-0.5 btn flex-1 {newSetting === 'setting:approve'
							? 'variant-filled-primary'
							: 'variant-filled'}"
						onclick={(e) => {
							newSetting = 'setting:approve';
							e.preventDefault();
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
					onclick={(e) => {
						newSetting = 'setting:custom';
						e.preventDefault();
					}}
				>
					Custom
				</button>
			</div>
			<div class="text-center px-0.5">
				{#if newSetting === null}
					<!-- <p>Cell <span class="font-semibold">{cell.col}</span> is set automatically</p> -->
				{:else if newSetting === 'setting:approve'}
					<!-- <p>
						Cell <span class="font-semibold">{cell.col}</span> is set to approve mode
					</p> -->
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

					<p class="text-sm">
						Last approved value is <span class="font-semibold px-1 bg-primary-500/30"
							><BreakableText
								text={cell.cellSettingConf?.lastValue?.toString() ??
									cell.value?.toString() ??
									'Null'}
							/></span
						>
					</p>
				{:else}
					<!-- <p>Cell <span class="font-semibold">{cell.col}</span> is set to a custom value</p> -->
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
								<button
									class="ml-1 btn variant-filled-primary"
									onclick={(e) => {
										e.preventDefault();
										openSearchModal();
									}}>Find Item <Search class="ml-1" /></button
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
					<p class="text-sm">
						Current value is <span class="font-semibold px-1 bg-primary-500/30 mr-0.5"
							><BreakableText text={cell.value === null ? 'Null' : cell.value.toString()} /></span
						>
						| Last auto (underlying) value is
						<span class="font-semibold px-1 bg-primary-500/30 ml-0.5">
							<BreakableText
								text={cell.cellSettingConf?.lastValue?.toString() ??
									cell.value?.toString() ??
									'Null'}
							/></span
						>
					</p>
				{/if}
			</div>
			<div class="w-full pt-2">
				<button class="btn variant-filled-primary w-full" disabled={!hasChanges}>
					Save Setting
				</button>
			</div>
		</div>
	</Form>
{/if}
