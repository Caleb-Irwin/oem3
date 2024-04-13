<script lang="ts" generics="T extends {[key: string]: string | number}[]">
	import type { Readable } from 'svelte/store';

	export let lines: Readable<T | undefined>;
</script>

<div class="">
	{#if $lines !== undefined}
		{#each $lines as line}
			<!-- content here -->
		{/each}
	{:else}
		<!-- else content here -->
	{/if}
</div>
