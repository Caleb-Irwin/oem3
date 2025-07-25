<script lang="ts">
	import { ERRORS_CONF, getErrorTitle, type CellError, type ErrorConfType } from './errors/helpers';
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

				{@render displayValues(error)}

				{@render displayButtons(conf)}
			</div>
		{/each}
	</div>
{/if}

{#snippet displayValues(error: (typeof cell.activeErrors)[number])}
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
{/snippet}

{#snippet displayButtons(conf: ErrorConfType)}
	<div class="gap-1 flex flex-wrap flex-grow">
		{#if conf.actions.includes('markAsResolved')}
			<button class="btn variant-soft flex-1">
				<span>
					<Check />
				</span>
				<span> Mark As Resolved</span>
			</button>
		{/if}
		{#if conf.actions.includes('ignore')}
			<button class="btn variant-soft flex-1">
				<span>
					<X />
				</span>
				<span> Ignore </span>
			</button>
		{/if}
		{#if conf.actions.includes('approve')}
			<button class="btn variant-glass-primary flex-1">
				<span>
					<Check />
				</span>
				<span> Approve </span>
			</button>
		{/if}
		{#if conf.actions.includes('reject')}
			<button class="btn variant-glass-error flex-1">
				<span>
					<X />
				</span>
				<span> Reject </span>
			</button>
		{/if}
		{#if conf.actions.includes('keepCustom')}
			<button class="btn variant-glass-primary flex-1">
				<span>
					<Check />
				</span>
				<span> Keep Custom Value </span>
			</button>
		{/if}
	</div>
{/snippet}
