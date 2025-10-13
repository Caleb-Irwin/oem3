<script lang="ts">
	import {
		ERRORS_CONF,
		getErrorTitle,
		type CellError,
		type ErrorActions,
		type ErrorDisplay
	} from './errors/helpers';
	import type { Cell } from './types';
	import { coerceString } from './utils';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import Check from 'lucide-svelte/icons/check';
	import Info from 'lucide-svelte/icons/info';
	import X from 'lucide-svelte/icons/x';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';
	import ArrowDown from 'lucide-svelte/icons/arrow-down';
	import type { Snippet } from 'svelte';
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import RotateCw from 'lucide-svelte/icons/rotate-cw';

	interface Props {
		cell: Cell;
		valueRenderer: Snippet<[string | number | boolean | null]>;
	}
	let { cell, valueRenderer }: Props = $props();
</script>

{#if cell.activeErrors?.length > 0}
	<div>
		{#each cell.activeErrors as error}
			{@const conf = ERRORS_CONF[error.confType as CellError]}
			<div class="card variant-ghost-error p-2 m-0.5 text-sm flex flex-col gap-y-2">
				<div class="flex items-center justify-center flex-wrap gap-2">
					<div class="flex gap-x-2 items-center justify-center flex-grow">
						<span class=""><TriangleAlert /></span>
						<span class="font-semibold text-lg text-center">
							{getErrorTitle(error.confType)}
						</span>
						<div class="flex-grow"></div>
					</div>

					<Button
						class="btn btn-sm variant-glass"
						action={client.unified.refresh}
						input={{
							table: cell.compoundId.split(':')[0],
							refId: parseInt(cell.compoundId.split(':')[1])
						}}
						successMessage="Refreshed"
					>
						<RotateCw size="16" /> <span> Refresh</span>
					</Button>
				</div>

				<div class="card p-2 flex gap-x-2 items-center variant-glass">
					<div>
						<Info />
					</div>
					<p>{conf.instructions}</p>
				</div>

				{#if error.message}
					<p>
						<span class="font-semibold">Message: </span>
						{error.message}
					</p>
				{/if}

				{@render displayValues(conf.display, error)}

				<div class="gap-1 flex flex-wrap flex-grow">
					{#each conf.actions as action}
						<div class="flex-1 w-full">
							{@render displayButton(action, error.id)}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}

{#snippet displayValues(displayType: ErrorDisplay, error: (typeof cell.activeErrors)[number])}
	{#if displayType === 'valueOnly'}
		<div class="">
			<p class="label-text font-bold">Value</p>
			<div class="w-full variant-glass rounded-md p-2">
				{#if error.value}
					{@render valueRenderer(coerceString(error.value ?? 'Null', cell.type))}
					<p class="font-semibold flex-grow p-1 pb-0 pt-2">
						Raw Value: <span class="font-normal">{error.value}</span>
					</p>
				{:else}
					<span class="text-error-500">No value to render. This should not happen.</span>
				{/if}
			</div>
		</div>
	{:else if displayType === 'contradictorySources'}
		<div>
			<p class="text-sm font-semibold">Current Value</p>
			{@render renderDiff(cell.value?.toString() ?? '', error.value?.toString() ?? '')}
			<div class="flex w-full pb-2">
				{@render displayButton('keepValue', error.id)}
			</div>
			<p class="text-sm font-semibold">Other Value</p>
			{@render renderDiff(error.value?.toString() ?? '', cell.value?.toString() ?? '')}
			<div class="flex w-full">
				{@render setCustomValue(error.value, 'w-full variant-soft flex-grow')}
			</div>
		</div>
	{:else if displayType === 'multipleOptions'}
		<div>
			<h4 class="font-semibold pt-0 p-1">Current Value</h4>

			<div class="p-2 rounded-md variant-glass">
				{@render valueRenderer(coerceString(error.value ?? 'Null', cell.type))}
				<div class="flex items-center px-1 pt-2 pb-0">
					<span class=" font-semibold flex-grow"
						>Raw Value: <span class="font-normal">{error.value}</span></span
					>
				</div>

				<div class="flex w-full pt-2">
					{@render displayButton('keepValue', error.id)}
				</div>
			</div>

			<h4 class="font-semibold pt-2 p-1">Other Options</h4>
			<ul class="flex flex-col gap-x-2">
				{#each JSON.parse(error.options ?? '[]') as item}
					<li class="p-2 rounded-md variant-glass">
						{@render valueRenderer(coerceString(item?.toString() ?? 'Null', cell.type))}
						<div class="flex items-center px-1 pt-2 pb-0">
							<span class=" font-semibold flex-grow">
								Raw Value: <span class="font-normal">{item}</span>
							</span>
							<div>
								{@render setCustomValue(item)}
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{:else if displayType === 'approval'}
		{@const percentChange =
			((parseInt(error.value as string) - ((error.lastValue ?? cell.value) as number)) /
				((error.lastValue ?? cell.value) as number)) *
			100}
		<div class="p-2 variant-glass">
			<div class="pt-2 flex flex-wrap">
				<div class="flex-1 text-center opacity-60">
					<p class="text-sm pb-0.5">Last Approved</p>
					{@render valueRenderer(
						coerceString(error.lastValue ?? cell.value?.toString() ?? 'Null', cell.type)
					)}
				</div>
				<!-- <div class="grid place-content-center p-2 opacity-60">
					<ArrowRight size="28" />
				</div> -->
				<div class="flex-1 text-center">
					<p class="text-sm pb-0.5">New Value</p>
					{@render valueRenderer(coerceString(error.value ?? 'Null', cell.type))}
				</div>
			</div>

			<p
				class="text-center text-xl font-bold {percentChange > 0
					? 'text-success-800 dark:text-success-400'
					: 'text-error-800 dark:text-error-400'}"
			>
				{percentChange > 0 ? '+' : '-'}{Math.abs(percentChange).toFixed(2)}%
			</p>
		</div>
	{:else if displayType === 'customApproval'}
		<div class="p-2 variant-glass">
			<div class="pt-2 flex">
				<div class="flex-1 text-center opacity-60">
					<p class="text-sm pb-0.5">Old Underlying Value</p>
					{@render valueRenderer(coerceString(error.lastValue ?? 'Null', cell.type))}
				</div>
				<div class="grid place-content-center p-2 opacity-60">
					<ArrowRight size="28" />
				</div>
				<div class="flex-1 text-center">
					<p class="text-sm pb-0.5">New Underlying Value</p>
					{@render valueRenderer(coerceString(error.value ?? 'Null', cell.type))}
				</div>
			</div>
		</div>

		<div class="p-2 variant-glass text-center">
			<div class="pt-2 flex">
				<div class="flex-1 text-center">
					<p class="text-sm pb-0.5">Custom Value</p>
					{@render valueRenderer(cell.value)}
					<div class="flex items-center px-1 pt-0.5 pb-0">
						<span class=" font-semibold flex-grow"
							>Raw Value: <span class="font-normal">{error.value}</span></span
						>
					</div>
				</div>
			</div>
		</div>
	{:else if displayType !== 'none'}
		<p>This error type has not been implemented. This should not happen.</p>
	{/if}
{/snippet}

{#snippet displayButton(action: ErrorActions, errorId: number)}
	{@const conf = {
		markAsResolved: { label: 'Mark As Resolved', icon: Check, variant: 'variant-soft' },
		ignore: { label: 'Ignore', icon: X, variant: 'variant-soft' },
		approve: { label: 'Approve', icon: Check, variant: 'variant-glass-primary' },
		reject: { label: 'Reject', icon: X, variant: 'variant-glass-error' },
		keepCustom: { label: 'Keep Custom Value', icon: Check, variant: 'variant-glass-primary' },
		keepValue: { label: 'Keep Value', icon: Check, variant: 'variant-glass-primary' },
		setAuto: { label: 'Remove Custom Value', icon: X, variant: 'variant-soft' }
	}[action]}
	<Button
		class="btn {conf.variant} flex-1"
		action={client.unified.updateError}
		input={{
			compoundId: cell.compoundId,
			col: cell.col,
			errorAction: action,
			errorId
		}}
		flexible
	>
		<span>
			<conf.icon />
		</span>
		<span>{conf.label}</span>
	</Button>
{/snippet}

{#snippet renderDiff(val: string, otherVal: string)}
	{@const valArr = val.split('')}
	{@const otherValArr = otherVal.split('')}
	{@const isEmpty = val.trim().length === 0}
	<p class="text-lg">
		{#if isEmpty}
			<span class="opacity-60"> Empty Value </span>
		{/if}
		{#each valArr as char, idx}
			{#if char !== otherValArr[idx]}
				<span class="font-semibold text-error-700">{char}</span>
			{:else}
				{char}
			{/if}
		{/each}
	</p>
{/snippet}

{#snippet setCustomValue(
	value: string | number | boolean | null,
	className: string = 'btn-sm variant-glass-primary'
)}
	<Button
		class="btn {className}"
		action={client.unified.updateSetting}
		input={{
			compoundId: cell.compoundId,
			col: cell.col,
			settingData: {
				col: cell.col,
				confType: 'setting:custom',
				refId: Number(cell.compoundId.split(':')[1]),
				value,
				created: Date.now()
			}
		}}
		flexible
	>
		<span>
			<Check />
		</span>
		<span> Set As Custom Value </span>
	</Button>
{/snippet}
