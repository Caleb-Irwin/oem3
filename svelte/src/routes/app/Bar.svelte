<script>
	import Bttn from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import { AppBar } from '@skeletonlabs/skeleton';
</script>

<AppBar gridColumns="grid-cols-3" slotDefault="place-self-center" slotTrail="place-content-end">
	<svelte:fragment slot="lead">(icon)</svelte:fragment>
	(title)
	<svelte:fragment slot="trail">
		<Bttn action={client.user.logout} invalidateAll>Logout</Bttn>
	</svelte:fragment>
</AppBar>
