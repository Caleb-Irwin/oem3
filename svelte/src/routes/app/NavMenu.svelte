<script lang="ts">
	import { popup } from '@skeletonlabs/skeleton';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Menu from 'lucide-svelte/icons/menu';
	import LogOut from 'lucide-svelte/icons/log-out';
	import { page } from '$app/state';
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import type { NavItem } from '$lib/nav';

	interface Props {
		/** Unique popup target name. */
		id: string;
		label: string;
		sections: { heading?: string; items: NavItem[] }[];
		/** Collapses the trigger to a menu icon, for narrow screens. */
		iconOnly?: boolean;
		/** Adds the session action to the mobile navigation menu. */
		includeLogout?: boolean;
	}

	let { id, label, sections, iconOnly = false, includeLogout = false }: Props = $props();
</script>

<button
	type="button"
	aria-label={label}
	class="btn btn-sm {iconOnly
		? 'btn-icon btn-icon-sm text-surface-400 hover:variant-soft-surface dark:text-surface-300'
		: 'gap-1 px-3 font-medium hover:variant-soft-primary'}"
	use:popup={{ event: 'click', target: id, placement: 'bottom-start', closeQuery: 'a' }}
>
	{#if iconOnly}
		<Menu size={18} />
	{:else}
		<span>{label}</span>
		<ChevronDown size={16} class="opacity-60" />
	{/if}
</button>

<div class="card w-72 p-2 shadow-xl" data-popup={id}>
	{#each sections as section, i (section.heading ?? i)}
		{#if section.heading}
			<p
				class="px-3 pb-1 {i === 0
					? 'pt-1'
					: 'pt-3'} text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-300"
			>
				{section.heading}
			</p>
		{/if}
		<nav class="list-nav">
			<ul>
				{#each section.items as item (item.href)}
					{@const Icon = item.icon}
					{@const current = page.url.pathname === item.href}
					<li>
						<a
							href={item.href}
							class="!gap-3 {current ? 'variant-soft-primary' : ''}"
							aria-current={current ? 'page' : undefined}
						>
							<span class="text-surface-400 dark:text-surface-300"><Icon size={16} /></span>
							<span class="flex-auto">{item.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/each}
	{#if includeLogout}
		<div class="mt-2 border-t border-surface-300/60 pt-2 dark:border-surface-700">
			<Button
				action={client.user.logout}
				class="btn w-full justify-start gap-3 px-3 hover:variant-soft-error"
				res={() => {
					window.location.href = '/';
				}}
			>
				<LogOut size={16} />
				<span>Log out</span>
			</Button>
		</div>
	{/if}
</div>
