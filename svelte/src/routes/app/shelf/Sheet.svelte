<script lang="ts">
	import Download from './Download.svelte';
	import { client, sub } from '$lib/client';
	import { ProgressBar, getModalStore } from '@skeletonlabs/skeleton';
	import AddLabel from './AddLabel.svelte';
	import { formatPrice } from '$lib/formatPrice';
	import Trash_2 from 'lucide-svelte/icons/trash-2';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Plus from 'lucide-svelte/icons/plus';
	import Button from '$lib/Button.svelte';
	import Search from '$lib/Search.svelte';

	export let sheetId: number, sheetName: string;
	const sheet = sub(client.labels.all, client.labels.onUpdate, { sheetId }, sheetId.toString()),
		modalStore = getModalStore();
</script>

{#if $sheet === undefined}
	<div class="w-full max-w-lg py-2">
		<ProgressBar />
	</div>
{:else}
	<Download
		labels={($sheet ?? []).map((l) => ({
			name: l.name ?? '',
			price: (l.priceCents ?? 0) / 100,
			barcode: l.barcode ?? '',
			qbId: l.qbId ?? undefined
		}))}
		name={sheetName}
	/>

	<ul class="w-full my-4 max-w-6xl">
		{#each $sheet ?? [] as label, i}
			<li class="m-0.5 rounded-sm flex {i % 2 === 0 ? 'bg-surface-600' : 'bg-surface-800'}">
				<button
					class="p-0.5 px-1 btn btn-icon btn-icon-sm text-gray-400"
					on:click={() =>
						modalStore.trigger({
							type: 'component',
							component: { ref: AddLabel, props: { sheetId, edit: true, label } }
						})}><Pencil /></button
				>
				<button
					class="grid place-content-center grid-cols-2 lg:grid-cols-6 flex-grow px-1"
					on:click={() =>
						modalStore.trigger({
							type: 'component',
							component: { ref: AddLabel, props: { sheetId, edit: true, label } }
						})}
				>
					<span class="col-span-2 lg:col-span-4 flex-grow text-center">{label.name}</span>
					<span class="col-span-1 text-center font-semibold"
						>{formatPrice((label.priceCents ?? 0) / 100)}</span
					>
					<span class="col-span-1 flex-grow text-center font-semibold text-gray-300"
						>{label.barcode}</span
					>
				</button>
				<Button
					action={client.labels.del}
					input={{ id: label.id, sheetId }}
					confirm="Delete?"
					class="btn btn-icon btn-icon-sm text-error-500"
				>
					<Trash_2 />
				</Button>
			</li>
		{:else}
			<p class="text-center text-lg italic">Empty Sheet</p>
		{/each}
	</ul>

	<div class="flex flex-wrap md:flex-nowrap justify-center">
		<Search
			microQB
			select={async (selection) => {
				const res = await client.resources.get.query({ uniId: selection.uniref });
				if (res?.qbData) {
					modalStore.trigger({
						type: 'component',
						component: {
							ref: AddLabel,
							props: {
								sheetId,
								label: {
									barcode: res.qbData.qbId.includes(':')
										? res.qbData.qbId.split(':')[1]
										: res.qbData.qbId,
									name: res.qbData.desc,
									priceCents: res.qbData.priceCents,
									qbId: res.qbData.qbId
								}
							}
						}
					});
				}
			}}
		/>
		<button
			class="btn variant-ghost-primary mx-2 mt-1 md:mt-0 text-primary-500 h-14"
			on:click={() =>
				modalStore.trigger({
					type: 'component',
					component: { ref: AddLabel, props: { sheetId } }
				})}
		>
			<span><Plus /></span>
			<span>Add Label</span>
		</button>
		<Button
			class="btn variant-ghost-error text-error-500 mt-1 md:mt-0 h-14"
			action={client.labels.sheet.clear}
			input={{ id: sheetId }}
			confirm={'Delete All Labels?'}
		>
			<span><Trash_2 /></span>
			<span>Clear Sheet</span>
		</Button>
	</div>
{/if}
