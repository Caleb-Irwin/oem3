<script lang="ts">
	import '../app.postcss';

	// Floating UI for Popups
	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
	import { AppShell, storePopup } from '@skeletonlabs/skeleton';
	import Bar from './shell/Bar.svelte';
	import Footer from './shell/Footer.svelte';
	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
</script>

<AppShell>
	<svelte:fragment slot="header"><Bar /></svelte:fragment>
	<slot />
	<svelte:fragment slot="footer"><Footer /></svelte:fragment>
</AppShell>
