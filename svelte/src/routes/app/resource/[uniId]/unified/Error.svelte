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
	import type { Snippet } from 'svelte';

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
				<div class="flex items-center">
					<span class="pr-2"><TriangleAlert /></span>
					<span class="font-semibold text-lg">
						{getErrorTitle(error.confType)}
					</span>
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
						{@render displayButton(action)}
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
				{@render displayButton('keepValue')}
			</div>
			<p class="text-sm font-semibold">Other Value</p>
			{@render renderDiff(error.value?.toString() ?? '', cell.value?.toString() ?? '')}
			<div class="flex w-full">
				{@render setCustomValue(error.value, 'w-full variant-soft')}
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
					{@render displayButton('keepValue')}
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
							{@render setCustomValue(item)}
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{:else if displayType === 'approval'}
		{@const percentChange =
			((parseInt(error.value as string) - (cell.value as number)) / (cell.value as number)) * 100}
		<div class="p-2 variant-glass">
			<div class="pt-2 flex">
				<div class="flex-1 text-center opacity-60">
					{@render valueRenderer(coerceString(cell.value?.toString() ?? 'Null', cell.type))}
				</div>
				<div class="grid place-content-center p-2 opacity-60">
					<ArrowRight size="28" />
				</div>
				<div class="flex-1 text-center">
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
	{:else if displayType !== 'none'}
		<p>This error type has not been implemented. This should not happen.</p>
	{/if}
{/snippet}

{#snippet displayButton(action: ErrorActions)}
	{#if action === 'markAsResolved'}
		<button class="btn variant-soft flex-1">
			<span>
				<Check />
			</span>
			<span> Mark As Resolved</span>
		</button>
	{:else if action === 'ignore'}
		<button class="btn variant-soft flex-1">
			<span>
				<X />
			</span>
			<span> Ignore </span>
		</button>
	{:else if action === 'approve'}
		<button class="btn variant-glass-primary flex-1">
			<span>
				<Check />
			</span>
			<span> Approve </span>
		</button>
	{:else if action === 'reject'}
		<button class="btn variant-glass-error flex-1">
			<span>
				<X />
			</span>
			<span> Reject </span>
		</button>
	{:else if action === 'keepCustom'}
		<button class="btn variant-glass-primary flex-1">
			<span>
				<Check />
			</span>
			<span> Keep Custom Value </span>
		</button>
	{:else if action === 'keepValue'}
		<button class="btn variant-glass-primary flex-1">
			<span>
				<Check />
			</span>
			<span> Keep Value </span>
		</button>
	{:else if action === 'setAuto'}
		<button class="btn variant-soft flex-1">
			<span>
				<X />
			</span>
			<span> Remove Custom Value </span>
		</button>
	{/if}
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
	<button class="btn {className}">
		<span>
			<Check />
		</span>
		<span> Set As Custom Value </span>
	</button>
{/snippet}
