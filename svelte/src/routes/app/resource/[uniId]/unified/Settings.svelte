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
	import Search from 'lucide-svelte/icons/search';
	import Info from 'lucide-svelte/icons/info';
	import CompactSearch from '$lib/search/CompactSearch.svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { ColToTableName, type Cell, type CellConfigRowInsert } from './types';
	import type { CellSetting } from '../../../../../../../server/src/db.schema';
	import { coerceString, objectsEqual, validateCustomValue } from './utils';
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
	import Error from './Error.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		cell: Cell;
		valueRenderer: Snippet<[string | number | boolean | null]>;
		extraClass?: string;
	}
	let { cell, extraClass, valueRenderer }: Props = $props();

	let newSetting = $derived(cell.setting);

	let customValue = $derived(
			cell.setting === 'setting:custom' || cell.setting === 'setting:approveCustom'
				? cell.cellSettingConf?.value === null
					? 'Null'
					: cell.cellSettingConf?.value
				: cell.value?.toString()
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

{#if cell.setting !== null || openSettings[cell.compoundId]?.[cell.col] || cell.activeErrors?.length > 0}
	<div class="flex flex-col {extraClass ?? ''}">
		<div>
			{#if cell.setting !== null}
				<div class="card bg-surface-200 dark:bg-surface-700 p-2 m-0.5 text-sm">
					<div class="flex items-center">
						<span class="pr-2"><Info /></span>
						<span>
							{#if cell.setting === 'setting:approve'}
								Manual approval required for changes exceeding threshold
							{:else if cell.setting === 'setting:custom'}
								Custom value override is active
							{:else if cell.setting === 'setting:approveCustom'}
								Custom value override is active with approval on underlying value change
							{/if}
						</span>
					</div>
				</div>
			{/if}
		</div>

		{#if openSettings[cell.compoundId]?.[cell.col]}
			<Form
				class="flex-grow w-full min-h-16 place-content-center min-w-52 p-0.5"
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
					<p class="font-semibold text-center text-lg">
						<span class="code text-lg">{cell.col}</span> Cell Setting
					</p>
					<div class="flex w-full items-center my-1 p-1 variant-glass-secondary rounded-full">
						<button
							class="m-0.5 btn flex-1 {!newSetting ? 'variant-glass-primary' : 'variant-glass'}"
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
									? 'variant-glass-primary'
									: 'variant-glass'}"
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
								? 'variant-glass-primary'
								: 'variant-glass'}"
							onclick={(e) => {
								newSetting = 'setting:custom';
								e.preventDefault();
							}}
						>
							Custom
						</button>
					</div>
					<div class="text-center px-0.5">
						{#if newSetting === 'setting:approve'}
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
						{:else if newSetting === 'setting:custom' || newSetting === 'setting:approveCustom'}
							<label class="label pt-2">
								<span class="label-text font-bold"
									>Custom Value (must be {`${
										{ string: 'text', number: 'a number', boolean: 'true or false' }[cell.type]
									}${cell.nullable ? ' or Null' : ''}`})</span
								>
								<div class="flex flex-col items-center gap-y-1">
									{#if isConnection}
										<button
											class="w-full btn variant-glass-secondary"
											onclick={(e) => {
												e.preventDefault();
												openSearchModal();
											}}>Find Item <Search class="ml-1" /></button
										>
									{/if}
									<textarea
										class="textarea {customValueError ? 'variant-ghost-error' : ''} w-full"
										rows={cell.value && cell.value.toString().length > 100 ? 4 : 1}
										placeholder="Value"
										bind:value={customValue}
									></textarea>
								</div>
							</label>
							{#if customValueError}
								<p class="font-bold text-error-600 pt-1">{customValueError}</p>
							{/if}

							<div class="py-2">
								<p class="label-text font-bold">Preview</p>
								<div class="w-full text-left variant-glass-secondary rounded-md p-2">
									{@render valueRenderer(coerceString(customValue ?? 'Null', cell.type))}
								</div>
							</div>

							<label class="flex justify-center items-center p-2 w-full">
								<input class="checkbox" type="checkbox" bind:checked={approveCustomValue} />
								<p class="pl-2">Approve custom value on underlying value change</p>
							</label>
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

		<Error {cell} {valueRenderer} />
	</div>
{/if}
