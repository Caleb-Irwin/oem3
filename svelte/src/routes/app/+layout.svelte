<script lang="ts">
	import { AppShell } from '@skeletonlabs/skeleton';
	import Bar from './Bar.svelte';
	import Footer from './Footer.svelte';
	import type { LayoutData } from './$types';
	import { invalidateAll } from '$app/navigation';

	export let data: LayoutData;

	$: {
		updateTimer(data.user.exp);
	}
	let timer: Timer;
	function updateTimer(exp: number) {
		clearTimeout(timer);
		timer = setTimeout(() => invalidateAll(), exp * 1000 - Date.now() + 1000);
	}
</script>

<svelte:head>
	<title>OEM3</title>
</svelte:head>

<AppShell>
	<svelte:fragment slot="header"><Bar /></svelte:fragment>
	<slot />
	<svelte:fragment slot="footer"><Footer /></svelte:fragment>
</AppShell>
