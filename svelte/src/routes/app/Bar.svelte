<script lang="ts">
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import NavSearch from '$lib/search/NavSearch.svelte';
	import { adminItems, dataSources, workflows } from '$lib/nav';
	import NavMenu from './NavMenu.svelte';
	import { AppBar } from '@skeletonlabs/skeleton';
	import LogOut from 'lucide-svelte/icons/log-out';
	import type { jwtFields } from '../../../../server/src/routers/user';

	let { user }: { user: jwtFields } = $props();

	const isAdmin = $derived(user.permissionLevel === 'admin');

	const menuSections = $derived([
		{ heading: 'Workflows', items: workflows },
		{ heading: 'Data Sources', items: dataSources },
		...(isAdmin ? [{ heading: 'Administration', items: adminItems }] : [])
	]);
</script>

<AppBar
	background="bg-surface-100-800-token"
	padding="px-3 py-2"
	gridColumns="grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
	gap="gap-2"
	slotLead="!justify-start gap-1"
	slotDefault="place-self-center"
	slotTrail="place-content-end !space-x-2"
>
	{#snippet lead()}
		<div class="md:hidden">
			<NavMenu id="mobileMenu" label="Menu" sections={menuSections} iconOnly includeLogout />
		</div>
		<div class="hidden items-center gap-1 md:flex">
			<a href="/app" class="mr-2 text-xl font-semibold tracking-tight">OEM3</a>
			<NavMenu id="workflowsMenu" label="Workflows" sections={[{ items: workflows }]} />
			<NavMenu id="dataSourcesMenu" label="Data Sources" sections={[{ items: dataSources }]} />
		</div>
	{/snippet}

	<a href="/app" aria-label="Home">
		<img src="/logo.svg" alt="" class="h-8 w-8 rounded-md" />
	</a>

	{#snippet trail()}
		<NavSearch />
		{#if isAdmin}
			<a
				href="/app/admin"
				class="hidden btn btn-sm px-3 font-medium hover:variant-soft-primary md:inline-flex"
			>
				Admin
			</a>
		{/if}
		<Button
			action={client.user.logout}
			class="hidden btn-icon btn-icon-sm text-surface-400 hover:variant-soft-surface dark:text-surface-300 md:inline-flex"
			res={() => {
				window.location.href = '/';
			}}
		>
			<LogOut size={18} />
		</Button>
	{/snippet}
</AppBar>
