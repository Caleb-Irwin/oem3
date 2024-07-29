<script lang="ts">
	import GenPages from './GenPages.svelte';
	import type { Label } from './types';
	import Settings from 'lucide-svelte/icons/settings';

	export let labels: Label[],
		name: string = 'labels';

	let auxText = `${new Date().getMonth() + 1}/${new Date().getFullYear().toString().slice(2)}`,
		sf = 3,
		fileTitle = 'labels',
		settingsOpen = false;

	$: {
		fileTitle = name;
	}
</script>

<div class="max-w-lg w-full card p-3 mt-2">
	{#if settingsOpen}
		<h4 class="h4 font-semibold w-full">Download Settings</h4>

		<label class="label w-full py-1">
			<span>Auxillary Text</span>
			<input type="text" bind:value={auxText} class="input" />
		</label>
		<label class="label w-full py-1">
			<span>Scale Factor</span>
			<input type="number" bind:value={sf} class="input" />
		</label>
		<label class="label w-full py-1 pb-4">
			<span>File Title</span>
			<input type="text" bind:value={fileTitle} class="input" />
		</label>
	{/if}

	<div class="flex w-full max-w-lg">
		<div class="pr-2 grid place-content-center">
			<button
				class="btn btn-icon variant-glass-secondary text-secondary-500"
				on:click={() => (settingsOpen = !settingsOpen)}><Settings /></button
			>
		</div>
		<GenPages {labels} {sf} {auxText} {fileTitle} />
	</div>
</div>
