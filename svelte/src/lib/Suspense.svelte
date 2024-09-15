<script lang="ts">
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import type { ComponentType } from 'svelte';

	export let promise: Promise<object>,
		component: ComponentType,
		modal = true,
		minimal = false;
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
		<svelte:component this={component} {...value} />
	{:catch error}
		<slot name="error">
			<p>Error: {JSON.stringify(error)}</p>
		</slot>
	{/await}
</div>
