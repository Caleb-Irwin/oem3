<script lang="ts" module>
	export interface TileStat {
		/** Active items in the page's primary table, or null when no summary exists yet. */
		active: number | null;
		/** Items needing a fix, or null when the page has no error summary. */
		issues: number | null;
		/** Overrides the "errors" wording for pages whose issues are not errors. */
		issuesLabel?: string;
		/** Overrides the zero-issues wording to match the page's own language. */
		noIssuesLabel?: string;
		/** Any of the page's workers is running. */
		running: boolean;
		/** Any of the page's workers ended in an error. */
		errored: boolean;
	}
</script>

<script lang="ts">
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import type { ComponentType } from 'svelte';

	interface Props {
		href: string;
		title: string;
		icon: ComponentType;
		stat?: TileStat | undefined;
	}

	let { href, title, icon: Icon, stat = undefined }: Props = $props();

	const count = (value: number) => value.toLocaleString('en-CA');
	const showStat = $derived(!!stat && (stat.active !== null || stat.issues !== null));
</script>

<a
	{href}
	class="card group flex items-center gap-3 p-4 transition duration-150 hover:-translate-y-0.5 hover:bg-surface-200/60 dark:hover:bg-surface-500"
>
	<span
		class="grid h-10 w-10 shrink-0 place-content-center rounded-lg bg-primary-500/10 text-primary-700 dark:text-primary-400"
	>
		<Icon size={20} />
	</span>
	<span class="min-w-0 flex-1">
		<span class="flex items-center gap-2">
			<span class="truncate font-semibold leading-tight">{title}</span>
			{#if stat?.running}
				<span class="badge variant-soft-primary shrink-0 gap-1 px-2 py-0.5 text-xs">
					<LoaderCircle size={12} class="animate-spin" />
					Running
				</span>
			{/if}
			{#if stat?.errored}
				<span class="badge variant-soft-error shrink-0 gap-1 px-2 py-0.5 text-xs">
					<TriangleAlert size={12} />
					Worker error
				</span>
			{/if}
		</span>
		{#if stat && showStat}
			<span class="block text-sm text-surface-400 dark:text-surface-300">
				{#if stat.active !== null}
					<span class="font-medium tabular-nums text-surface-600 dark:text-surface-200">
						{count(stat.active)}
					</span>
					active
				{/if}
				{#if stat.active !== null && stat.issues !== null}
					<span class="px-0.5">·</span>
				{/if}
				{#if stat.issues !== null}
					{#if stat.issues > 0}
						<span class="font-medium tabular-nums text-error-700 dark:text-error-400">
							{count(stat.issues)}
							{stat.issuesLabel ?? 'errors'}
						</span>
					{:else}
						{stat.noIssuesLabel ?? 'No errors'}
					{/if}
				{/if}
			</span>
		{/if}
	</span>

	<ChevronRight
		size={18}
		class="shrink-0 text-surface-400 dark:text-surface-300 transition-transform duration-150 group-hover:translate-x-0.5"
	/>
</a>
