<script lang="ts">
	import Download from './Download.svelte';
	import { client, subVal } from '$lib/client';
	import { ProgressBar, getModalStore } from '@skeletonlabs/skeleton';
	import AddLabel from './AddLabel.svelte';
	import { formatPrice } from '$lib/formatPrice';
	import Trash_2 from 'lucide-svelte/icons/trash-2';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Plus from 'lucide-svelte/icons/plus';
	import Copy from 'lucide-svelte/icons/copy';
	import Button from '$lib/Button.svelte';
	import Search from '$lib/search/OldSearch.svelte';
	import { readable } from 'svelte/store';

	interface Props {
		sheetId: number;
		sheetName: string;
		init: Awaited<ReturnType<typeof client.labels.all.query>> | undefined;
	}

	let { sheetId, sheetName, init }: Props = $props();
	const _sheet = subVal(client.labels.allSub, {
			input: { sheetId },
			updateTopic: sheetId.toString(),
			sendInit: init === undefined
		}),
		modalStore = getModalStore();

	const sheet = $derived($_sheet === undefined ? readable(init) : _sheet);
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

	<div class="my-4 flex flex-wrap md:flex-nowrap justify-center">
		<Search
			quickAdd
			size="lg"
			quickAddQueryType="qb"
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
			onclick={() =>
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

	<ul class="w-full max-w-6xl overflow-hidden rounded-lg">
		{#each $sheet ?? [] as label, i}
			<li
				class="flex min-w-0 items-center px-2 py-1 {i % 2 === 0
					? 'bg-primary-50/60 dark:bg-primary-900/20'
					: 'bg-primary-50/25 dark:bg-primary-900/10'}"
			>
				<Button
					action={client.labels.duplicate}
					class="btn btn-icon btn-icon-sm shrink-0 text-surface-400 dark:text-surface-300"
					successMessage="Duplicated Label"
					input={{ id: label.id, sheetId }}><Copy /></Button
				>
				<button
					class="btn btn-icon btn-icon-sm shrink-0 text-surface-400 dark:text-surface-300"
					onclick={() =>
						modalStore.trigger({
							type: 'component',
							component: { ref: AddLabel, props: { sheetId, edit: true, label } }
						})}><Pencil /></button
				>
				<button
					class="grid min-w-0 flex-grow self-stretch grid-cols-2 items-center gap-x-2 px-2 lg:grid-cols-6"
					onclick={() =>
						modalStore.trigger({
							type: 'component',
							component: { ref: AddLabel, props: { sheetId, edit: true, label } }
						})}
				>
					<span
						class="col-span-2 flex min-h-full min-w-0 items-center justify-center text-center lg:col-span-4"
						>{label.name}</span
					>
					<span
						class="col-span-1 flex min-h-full items-center justify-center text-center font-semibold"
						>{formatPrice((label.priceCents ?? 0) / 100)}</span
					>
					<span
						class="col-span-1 flex min-h-full items-center justify-center text-center font-semibold text-gray-800 dark:text-gray-300"
						>{label.barcode}</span
					>
				</button>
				<div class="grid w-10 shrink-0 place-content-center">
					<Button
						action={client.labels.del}
						input={{ id: label.id, sheetId }}
						confirm="Delete?"
						class="btn btn-icon btn-icon-sm text-error-500"
					>
						<Trash_2 />
					</Button>
				</div>
			</li>
		{:else}
			<p class="text-center text-lg italic">Empty Sheet</p>
		{/each}
	</ul>
{/if}
