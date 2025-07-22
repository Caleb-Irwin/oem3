<script lang="ts">
	import { ERRORS_CONF, getErrorTitle, type CellError } from './errors/helpers';
	import type { Cell } from './types';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import Check from 'lucide-svelte/icons/check';
	import Info from 'lucide-svelte/icons/info';
	import X from 'lucide-svelte/icons/x';

	interface Props {
		cell: Cell;
	}
	let { cell }: Props = $props();
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

				<ul>
					<li>Value: {error.value ? error.value : 'No value set'}</li>
					<li>Last Value: {error.lastValue ? error.lastValue : 'No last value set'}</li>
					<li>Options: {error.options ? error.options : 'No options set'}</li>
				</ul>

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
			</div>
		{/each}
	</div>
{/if}
