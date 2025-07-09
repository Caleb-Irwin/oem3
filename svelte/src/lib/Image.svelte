<script lang="ts">
	import type { HTMLImgAttributes } from 'svelte/elements';
	import { imageRedirect } from './imageRedirector';

	interface Props extends HTMLImgAttributes {
		src: string;
		thumbnail?: boolean;
	}

	let { src, thumbnail, ...rest }: Props = $props();

	let loading = $state(true);
	let error = $state(false);
	let imgElement: HTMLImageElement | undefined = $state();

	let url = $derived(imageRedirect(src, thumbnail));

	$effect(() => {
		src;
		loading = true;
		error = false;

		if (imgElement) {
			if (imgElement.complete) {
				if (imgElement.naturalWidth > 0) {
					loading = false;
					error = false;
				} else {
					loading = false;
					error = true;
				}
			}
		}
	});

	function handleLoad() {
		loading = false;
		error = false;
	}

	function handleError() {
		loading = false;
		error = true;
	}
</script>

{#if loading}
	<div
		class="bg-transparent animate-pulse flex items-center justify-center rounded-sm {rest.class ??
			''}"
		style="aspect-ratio: 1;"
	>
		<svg
			class="w-8 h-8 text-surface-300 dark:text-surface-600"
			fill="currentColor"
			viewBox="0 0 20 20"
		>
			<path
				fill-rule="evenodd"
				d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
				clip-rule="evenodd"
			/>
		</svg>
	</div>
{:else if error}
	<div
		class="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 flex items-center justify-center rounded-sm {rest.class ??
			''}"
		style="aspect-ratio: 1;"
	>
		<svg class="w-8 h-8 text-error-500" fill="currentColor" viewBox="0 0 20 20">
			<path
				fill-rule="evenodd"
				d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
				clip-rule="evenodd"
			/>
		</svg>
	</div>
{/if}

<img
	bind:this={imgElement}
	{...rest}
	src={url}
	class:hidden={loading || error}
	onload={handleLoad}
	onerror={handleError}
/>
