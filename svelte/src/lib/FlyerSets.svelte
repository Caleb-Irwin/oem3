<script lang="ts">
	import Trash_2 from 'lucide-svelte/icons/trash-2';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';
	import Button from './Button.svelte';
	import { client, handleTRPCError, subVal } from './client';
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';

	type FlyerSet = Awaited<ReturnType<typeof client.guild.flyer.sets.get.query>>[number];

	interface Props {
		initVal: FlyerSet[] | undefined;
		embedded?: boolean;
	}

	let { initVal, embedded = false }: Props = $props();

	const _sets = subVal(client.guild.flyer.sets.getSub, { init: initVal });
	const sets = $derived($_sets);

	const modalStore = getModalStore(),
		toastStore = getToastStore();

	const statusLabels: { [key in FlyerSet['status']]: string } = {
		active: 'Active',
		upcoming: 'Upcoming',
		expired: 'Expired',
		forcedOn: 'Active (Forced)',
		forcedOff: 'Off (Forced)'
	};

	const statusClasses: { [key in FlyerSet['status']]: string } = {
		active: 'variant-filled-success',
		upcoming: 'variant-soft-warning',
		expired: 'variant-soft-surface',
		forcedOn: 'variant-filled-success',
		forcedOff: 'variant-soft-error'
	};

	const formatDate = (date: number | null) =>
		date === null
			? '?'
			: new Date(date).toLocaleDateString('en-CA', { dateStyle: 'medium', timeZone: 'UTC' });

	const setOverride = async (id: number, override: FlyerSet['override']) => {
		try {
			await client.guild.flyer.sets.setOverride.mutate({ id, override });
			toastStore.trigger({ message: 'Flyers Updating', background: 'variant-filled-success' });
		} catch (e) {
			handleTRPCError(e);
		}
	};

	const del = async (set: FlyerSet) => {
		const confirmed = await new Promise((response) =>
			modalStore.trigger({
				type: 'confirm',
				title: `Remove flyer ${set.flyerNumber === null ? set.key : '#' + set.flyerNumber}?`,
				body: 'Its items stop being on sale unless another active flyer includes them. Re-applying the file brings it back.',
				response
			})
		);
		if (!confirmed) return;

		try {
			await client.guild.flyer.sets.del.mutate({ id: set.id });
			toastStore.trigger({ message: 'Flyer Removed', background: 'variant-filled-success' });
		} catch (e) {
			handleTRPCError(e);
		}
	};
</script>

<div
	class="w-full p-4 {embedded ? 'border-t border-surface-300/80 dark:border-surface-600' : 'card'}"
>
	<div class="flex items-center pb-2">
		<h4 class="h4 font-semibold">Flyers</h4>
		<div class="flex-grow min-w-2"></div>
		<Button
			action={client.guild.flyer.sets.resolve}
			successMessage="Flyers Updating"
			class="btn btn-icon btn-icon-sm variant-ghost-primary"
		>
			<RefreshCw />
		</Button>
	</div>

	<p class="pb-2 text-sm opacity-70">
		Flyers turn on and off by their own dates. Items in more than one active flyer use the lowest
		flyer price.
	</p>

	<ul class="max-h-64 overflow-y-auto overflow-x-hidden rounded-lg">
		{#each sets ?? [] as set, i}
			<li
				class="flex min-w-0 items-center gap-2 px-2 py-1 {i % 2 === 0
					? 'bg-primary-50/60 dark:bg-primary-900/20'
					: 'bg-primary-50/25 dark:bg-primary-900/10'}"
			>
				<span class="badge shrink-0 {statusClasses[set.status]}">{statusLabels[set.status]}</span>
				<p class="min-w-0 flex-1">
					<span class="block font-semibold [overflow-wrap:anywhere]">
						{set.flyerNumber === null ? 'Flyer' : 'Flyer #' + set.flyerNumber}
					</span>
					<span class="block break-words text-sm">
						{formatDate(set.startDate)} to {formatDate(set.endDate)} · {set.itemCount.toLocaleString()}
						items
					</span>
					<span class="block break-words text-sm opacity-70 [overflow-wrap:anywhere]">
						{set.sourceFile === null
							? 'File deleted'
							: `File #${set.sourceFile}${set.sourceFileName ? ' ' + set.sourceFileName : ''}`}
					</span>
				</p>
				<select
					class="select select-sm w-28 shrink-0 text-sm"
					value={set.override}
					onchange={(e) => setOverride(set.id, e.currentTarget.value as FlyerSet['override'])}
				>
					<option value="auto">Auto</option>
					<option value="active">Force On</option>
					<option value="inactive">Force Off</option>
				</select>
				<button
					class="btn-icon btn-icon-sm ml-1 shrink-0 text-error-600"
					aria-label="Remove flyer"
					onclick={() => del(set)}
				>
					<Trash_2 />
				</button>
			</li>
		{:else}
			<p class="text-center">{sets ? 'No Flyers' : 'Loading...'}</p>
		{/each}
	</ul>
</div>
