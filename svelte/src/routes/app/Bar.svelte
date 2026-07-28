<script lang="ts">
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import NavSearch from '$lib/search/NavSearch.svelte';
	import { AppBar } from '@skeletonlabs/skeleton';
	import Home from 'lucide-svelte/icons/home';
	import LogOut from 'lucide-svelte/icons/log-out';
	import Search from 'lucide-svelte/icons/search';
	import type { jwtFields } from '../../../../server/src/routers/user';

	let { user }: { user: jwtFields } = $props();
</script>

<AppBar
	background="bg-surface-100-800-token"
	padding="px-3 py-2"
	gridColumns="grid-cols-[auto_1fr_auto]"
	gap="gap-2 sm:gap-4"
	slotDefault="place-self-center w-full"
	slotTrail="place-content-end !space-x-2"
>
	{#snippet lead()}
		<a href="/app" class="btn btn-icon btn-icon-sm variant-filled-primary" aria-label="Home">
			<Home size={18} />
		</a>
		<a href="/app" class="hidden sm:block font-semibold text-xl tracking-tight pl-3">OEM3</a>
	{/snippet}

	<div class="w-full flex justify-center">
		<div class="hidden sm:flex w-full justify-center">
			<NavSearch />
		</div>
		<a
			href="/app/search"
			class="sm:hidden btn btn-icon btn-icon-sm variant-soft-surface"
			aria-label="Search"
		>
			<Search size={18} />
		</a>
	</div>

	{#snippet trail()}
		<span
			class="hidden md:inline text-sm text-surface-400 dark:text-surface-300"
			title="Permission level: {user.permissionLevel}"
		>
			{user.username}
		</span>
		<Button
			action={client.user.logout}
			class="btn btn-icon btn-icon-sm variant-filled-primary"
			res={() => {
				window.location.href = '/';
			}}
		>
			<LogOut size={18} />
		</Button>
	{/snippet}
</AppBar>
