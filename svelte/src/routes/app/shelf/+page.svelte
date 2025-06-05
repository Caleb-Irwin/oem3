<script lang="ts">
	import { client, subVal } from '$lib/client';
	import AddSheet from './AddSheet.svelte';
	import { ProgressBar, getModalStore } from '@skeletonlabs/skeleton';
	import Plus from 'lucide-svelte/icons/plus';
	import Trash_2 from 'lucide-svelte/icons/trash-2';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Button from '$lib/Button.svelte';
	import ChangeSheetName from './ChangeSheetName.svelte';
	import Sheet from './Sheet.svelte';
	import { browser } from '$app/environment';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const allSheets = subVal(client.labels.sheet.allSub, { init: data.allSheets });
	const modalStore = getModalStore();

	let sheetId: number = $state(data.lastAccessed?.id ?? -1),
		newSheet: number | undefined = $state(),
		currentSheet = $derived(($allSheets || []).filter(({ id }) => id === sheetId)[0]),
		mounted = $state(false);
	$effect(() => {
		if (
			$allSheets &&
			$allSheets.length > 0 &&
			(!mounted || !$allSheets.map(({ id }) => id).includes(sheetId))
		)
			if (!mounted && browser && localStorage.getItem('lastSheetId')) {
				const sheetIdStore = parseInt(localStorage.getItem('lastSheetId') ?? '0');
				if ($allSheets.map(({ id }) => id).includes(sheetIdStore)) sheetId = sheetIdStore;
				else sheetId = $allSheets[$allSheets.length - 1].id;
			} else {
				sheetId = $allSheets[$allSheets.length - 1].id;
			}
	});
	$effect(() => {
		if (newSheet && $allSheets && $allSheets.map(({ id }) => id).includes(newSheet)) {
			sheetId = newSheet;
			newSheet = undefined;
		}
	});
	$effect(() => {
		if (browser && sheetId !== -1) localStorage.setItem('lastSheetId', sheetId.toString());
	});
</script>

<div class="h-full w-full p-4 flex flex-col items-center">
	<div class="flex w-full max-w-lg card p-3">
		<div class="pr-2 grid place-content-center">
			<button
				class="btn btn-icon variant-glass-primary text-primary-500"
				onclick={() =>
					modalStore.trigger({
						type: 'component',
						component: {
							ref: AddSheet,
							props: {
								res:
									//@ts-ignore
									(n) => {
										newSheet = n;
									}
							}
						}
					})}><Plus /></button
			>
		</div>
		<select class="select" bind:value={sheetId} placeholder="Choose Sheet">
			{#if $allSheets}
				{#each $allSheets as sheet}
					<option value={sheet.id}
						>{sheet.name} ({sheet.owner + (sheet.public ? '' : '; private')})</option
					>
				{/each}
			{:else}
				<option value={-1}>Loading...</option>
			{/if}
		</select>
		<div class="pl-2 grid place-content-center">
			<button
				class="btn btn-icon variant-glass-secondary text-secondary-500"
				onclick={() =>
					modalStore.trigger({
						type: 'component',
						component: {
							ref: ChangeSheetName,
							props: {
								id: sheetId,
								current: currentSheet.name,
								isPublic: currentSheet.public ? 'public' : ''
							}
						}
					})}><Pencil /></button
			>
		</div>
		<div class="pl-2 grid place-content-center">
			<Button
				class="btn btn-icon variant-glass-error text-error-500"
				action={client.labels.sheet.del}
				input={{ id: sheetId }}
				confirm="Delete Forever?"><Trash_2 /></Button
			>
		</div>
	</div>

	{#if $allSheets !== undefined && $allSheets.length === 0}
		<p class="p-4 text-xl">No Label Sheets — Create One!</p>
	{/if}

	{#if currentSheet}
		{#key currentSheet}
			<Sheet
				sheetId={currentSheet.id}
				sheetName={currentSheet.name ?? ''}
				init={data.lastAccessed && data.lastAccessed.id === currentSheet.id
					? data.lastAccessed.labels
					: undefined}
			/>
		{/key}
	{:else if !($allSheets !== undefined && $allSheets.length === 0)}
		<div class="w-full max-w-lg py-2">
			<ProgressBar />
		</div>
		<p>Hello</p>
	{/if}
</div>
