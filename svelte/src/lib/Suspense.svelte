<script lang="ts" generics="P extends object">
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import type { Component } from 'svelte';

	interface Props {
		promise: Promise<P>;
		Comp: Component<P>;
		modal?: boolean;
		minimal?: boolean;
		err?: import('svelte').Snippet;
	}

	let { promise, Comp, modal = true, minimal = false, err }: Props = $props();
</script>

<div class="w-full h-full {modal ? 'max-h-[90vh] overflow-scroll' : ''} ">
	{#await promise}
		<div
			class="w-full h-full place-content-center grid {minimal
				? 'animate-pulse bg-surface-200 dark:bg-surface-600'
				: ''}"
		>
			{#if !minimal}
				<ProgressRadial
					meter="stroke-primary-500"
					track="stroke-primary-900"
					width="w-24"
					stroke={100}
				/>
			{/if}
		</div>
	{:then value}
		<Comp {...value}></Comp>
	{:catch error}
		{#if err}{@render err()}{:else}
			<p>Error: {JSON.stringify(error)}</p>
		{/if}
	{/await}
</div>
