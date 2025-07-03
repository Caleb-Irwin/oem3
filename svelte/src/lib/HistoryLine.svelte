<script lang="ts">
	import Settings from 'lucide-svelte/icons/settings';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import type { history as historyType } from '../../../server/src/db.schema';
	import HistoryChip from './HistoryChip.svelte';
	interface Props {
		entry: typeof historyType.$inferSelect;
	}

	let { entry }: Props = $props();

	let data = entry.data ? JSON.parse(entry.data) : undefined,
		createData: { [key: string]: string | number } =
			entry.entryType === 'create' ? data : undefined,
		updateData: [key: string, prev: string | number, cur: string | number][] =
			entry.entryType === 'update' ? data : undefined,
		deleteData: { [key: string]: string | number } =
			entry.entryType === 'delete' ? data : undefined;
</script>

<li class="flex items-stretch py-0.5">
	<div class="hidden lg:flex items-center">
		<p class="min-w-[50px] lg:min-w-[200px] text-right pr-2">
			{new Date(entry.created).toLocaleString()}
		</p>
	</div>
	<div
		class="flex items-center w-32 lg:w-60 px-2 border-l-8 {entry.entryType === 'create'
			? 'border-primary-500'
			: entry.entryType === 'update'
				? 'border-secondary-600'
				: 'border-error-700'}"
	>
		<div>
			<div
				class="flex items-center font-semibold {entry.confType === 'setting'
					? 'text-secondary-500'
					: entry.confType === 'error'
						? 'text-error-700'
						: ''}"
			>
				<p class="">
					{entry.entryType === 'delete'
						? 'Deleted'
						: entry.entryType === 'update'
							? 'Update'
							: 'Create'}
				</p>
				{#if entry.confType === 'setting'}
					<Settings size="16" class="ml-1" />
				{:else if entry.confType === 'error'}
					<TriangleAlert size="16" class="ml-1" />
				{/if}
			</div>

			{#if entry.confType}
				<p
					class="text-xs font-semibold {entry.confType === 'setting'
						? 'text-secondary-500'
						: 'text-error-700'}"
				>
					{entry.confType === 'setting' ? 'Setting for' : 'Error in'} column
					<span class="code text-xs">{entry.confCell}</span>
				</p>
			{/if}

			{#if entry.changeset}
				<a href="/app/resource/redirect/changeset-{entry.changeset}" class=" underline"
					>Changeset #{entry.changeset}</a
				>
			{/if}
			<p class="block lg:hidden">{new Date(entry.created).toLocaleString()}</p>
		</div>
	</div>
	<div class="w-full flex flex-wrap items-center">
		{#if updateData}
			{#each updateData as change}
				<HistoryChip key={change[0]} value={change[2]} prev={change[1]} />
			{/each}
		{/if}
		{#if createData || deleteData}
			{#each Object.entries(createData ?? deleteData) as [key, value]}
				<HistoryChip {key} {value} create />
			{/each}
		{/if}
	</div>
</li>
