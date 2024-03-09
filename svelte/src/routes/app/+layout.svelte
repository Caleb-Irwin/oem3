<script lang="ts">
	import { AppShell } from '@skeletonlabs/skeleton';
	import Bar from './Bar.svelte';
	import Footer from './Footer.svelte';
</script>

<svelte:head>
	<title>OEM3</title>
</svelte:head>

<AppShell>
	<svelte:fragment slot="header"><Bar /></svelte:fragment>
	<slot />
	<svelte:fragment slot="footer"><Footer /></svelte:fragment>
</AppShell>
