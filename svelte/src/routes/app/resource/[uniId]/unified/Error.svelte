<script lang="ts">
	import {
		ERRORS_CONF,
		getErrorTitle,
		type CellError,
		type ErrorActions,
		type ErrorDisplay
	} from './errors/helpers';
	import type { Cell } from './types';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import Check from 'lucide-svelte/icons/check';
	import Info from 'lucide-svelte/icons/info';
	import X from 'lucide-svelte/icons/x';
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
					{@render valueRenderer(error.value)}
				{:else}
					<span class="text-error-500">No value to render. This should not happen.</span>
				{/if}
			</div>
		</div>
	{:else if displayType === 'contradictorySources'}
		<div>
			<p class="text-sm font-semibold">Current Value</p>
			{@render renderDiff(cell.value?.toString() ?? '', error.value?.toString() ?? '')}
			<p class="text-sm font-semibold">Other Value</p>
			{@render renderDiff(error.value?.toString() ?? '', cell.value?.toString() ?? '')}
		</div>
	{:else}
		<p>TODO</p>
		<ul>
			<li>
				Value
				{#if error.value}
					{@render valueRenderer(error.value)}
				{:else}
					<span class="text-gray-500">No value to render</span>
				{/if}
			</li>
			<li>
				Last Value
				{#if error.lastValue}
					{@render valueRenderer(error.lastValue)}
				{:else}
					<span class="text-gray-500">No last value to render</span>
				{/if}
			</li>
			<li>
				Options
				{#if error.options}
					{#each JSON.parse(error.options) as item}
						{@render valueRenderer(item)}
					{/each}
				{:else}
					<span class="text-gray-500">No options to render</span>
				{/if}
			</li>
		</ul>
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
