<script lang="ts">
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import type { ComponentType } from 'svelte';

	export let promise: Promise<object>,
		component: ComponentType,
		modal = true;
</script>

<div class="w-full h-full {modal ? 'max-h-[90vh] overflow-scroll' : ''} ">
	{#await promise}
		<div class="w-full h-full place-content-center grid">
			<ProgressRadial
				meter="stroke-primary-500"
				track="stroke-primary-900"
				width="w-24"
				stroke={100}
			/>
		</div>
	{:then value}
		<svelte:component this={component} {...value} />
	{:catch error}
		<p>Error: {JSON.stringify(error)}</p>
	{/await}
</div>
