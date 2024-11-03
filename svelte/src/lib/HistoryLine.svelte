<script lang="ts">
	import type { history as historyType } from '../../../server/src/db.schema';
	interface Props {
		entry: typeof historyType.$inferSelect;
	}

	let { entry }: Props = $props();

	let data = entry.data ? JSON.parse(entry.data) : undefined,
		createData: { [key: string]: string | number } =
			entry.entryType === 'create' ? data : undefined,
		updateData: [key: string, prev: string | number, cur: string | number][] =
			entry.entryType === 'update' ? data : undefined;
</script>

<li class="flex items-stretch py-0.5">
	<div class="hidden lg:flex items-center">
		<p class="min-w-[50px] lg:min-w-[200px] text-right pr-2">
			{new Date(entry.created).toLocaleString()}
		</p>
	</div>
	<div
		class="flex items-center min-w-24 lg:min-w-40 px-2 border-l-8 {entry.entryType === 'create'
			? 'border-primary-500'
			: entry.entryType === 'update'
				? 'border-secondary-600'
				: 'border-error-700'}"
	>
		<div>
			<p class="font-semibold">
				{entry.entryType === 'delete'
					? 'Deleted'
					: entry.entryType === 'update'
						? 'Update'
						: 'Create'}
			</p>
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
				<span class="chip hover:cursor-default whitespace-break-spaces variant-filled-surface m-0.5"
					>{change[0]}: {change[1]} -> {change[2]}</span
				>
			{/each}
		{/if}
		{#if createData}
			{#each Object.entries(createData) as [key, value]}
				<span class="chip hover:cursor-default whitespace-break-spaces variant-filled-surface m-0.5"
					>{key}: {value}</span
				>
			{/each}
		{/if}
	</div>
</li>
