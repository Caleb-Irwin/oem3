<script lang="ts">
	import { type ChangesType, readableKeys } from './smartChangeset';

	export let changes: ChangesType;
</script>

{#if $changes.length > 0}
	<div class="card variant-soft-primary m-2 p-4">
		<div class="flex items-center">
			<h3 class="h3">{$changes.length} unsaved change{$changes.length === 1 ? '' : 's'}</h3>
			<div class="flex-grow"></div>
			<button class="btn variant-ghost-primary" on:click={() => alert('TODO')}>Save</button>
		</div>
		<ul>
			{#each $changes as change}
				<li>
					<span class="font-semibold">{readableKeys[change.key]}</span>
					{change.original === null
						? 'null'
						: typeof change.original === 'string'
							? `"${change.original}"`
							: change.original} -> {change.value === null
						? 'null'
						: typeof change.value === 'string'
							? `"${change.value}"`
							: change.value}
				</li>
			{/each}
		</ul>
	</div>
{/if}
