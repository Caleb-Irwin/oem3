<script>
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import { AppBar } from '@skeletonlabs/skeleton';
	import Home from 'lucide-svelte/icons/home';
	import LogOut from 'lucide-svelte/icons/log-out';
</script>

<AppBar gridColumns="grid-cols-3" slotDefault="place-self-center" slotTrail="place-content-end">
	{#snippet lead()}
		<a href="/" class="btn btn-icon variant-filled-primary">
			<Home />
		</a>
	{/snippet}
	<a href="/" class="font-semibold text-2xl">OEM3</a>
	{#snippet trail()}
		<Button
			action={client.user.logout}
			class="btn btn-icon variant-filled-primary"
			res={() => {
				window.location.href = '/';
			}}
		>
			<LogOut />
		</Button>
	{/snippet}
</AppBar>
