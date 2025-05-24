<script lang="ts">
	import { AppShell } from '@skeletonlabs/skeleton';
	import Bar from './Bar.svelte';
	import Footer from './Footer.svelte';
	import type { LayoutData } from './$types';
	import { browser } from '$app/environment';

	interface Props {
		data: LayoutData;
		children?: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();

	let timer: Timer;
	function updateTimer(exp: number) {
		clearTimeout(timer);
		timer = setTimeout(
			() => (browser ? window.location.reload() : null),
			exp * 1000 - Date.now() + 1000
		);
	}

	$effect(() => {
		updateTimer(data.user.exp);
	});
</script>

<svelte:head>
	<title>OEM3</title>
</svelte:head>

<AppShell>
	{#snippet header()}
		<Bar />
	{/snippet}
	{@render children?.()}
	{#snippet footer()}
		<Footer />
	{/snippet}
</AppShell>
