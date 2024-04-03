<script>
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
	import { AppBar } from '@skeletonlabs/skeleton';
</script>

<AppBar gridColumns="grid-cols-3" slotDefault="place-self-center" slotTrail="place-content-end">
	<svelte:fragment slot="lead">(icon)</svelte:fragment>
	(title)
	<svelte:fragment slot="trail">
		<Form action={client.user.logout} class="flex justify-center" invalidateAll>
			<button class="btn variant-filled-primary">Logout</button>
		</Form>
	</svelte:fragment>
</AppBar>
