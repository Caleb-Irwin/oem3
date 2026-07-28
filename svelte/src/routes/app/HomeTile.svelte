<script lang="ts">
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import type { ComponentType } from 'svelte';

	interface Props {
		href: string;
		title: string;
		description: string;
		icon: ComponentType;
	}

	let { href, title, description, icon: Icon }: Props = $props();
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
		<span class="block font-semibold leading-tight">{title}</span>
		<span class="block text-sm text-surface-400 dark:text-surface-300">{description}</span>
	</span>
	<ChevronRight
		size={18}
		class="shrink-0 text-surface-400 dark:text-surface-300 transition-transform duration-150 group-hover:translate-x-0.5"
	/>
</a>
