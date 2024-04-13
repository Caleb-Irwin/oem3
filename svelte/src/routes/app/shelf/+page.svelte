<script lang="ts">
	import type { Label } from './types';
	import GenPages from './GenPages.svelte';
	import { client, sub } from '$lib/client';
	import AddSheet from './AddSheet.svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import Plus from 'lucide-svelte/icons/plus';
	import Trash_2 from 'lucide-svelte/icons/trash-2';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Button from '$lib/Button.svelte';
	import ChangeSheetName from './ChangeSheetName.svelte';
	import Download from './Download.svelte';

	$: labels = (() => {
		const arr = new Array<Label>(250);
		arr.fill({
			barcode: '123456789012',
			name: 'Test Tag Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test A B C D E F G H I J K L M N O P',
			price: 0.99
		});
		return arr;
	})();

	const allSheets = sub(client.labels.sheet.all, client.labels.sheet.onUpdate);
	const modalStore = getModalStore();
	let sheetId: number = -1,
		newSheet: number | undefined;
	$: currentSheet = ($allSheets || []).filter(({ id }) => id === sheetId)[0];
	$: {
		if (
			$allSheets &&
			$allSheets.length > 0 &&
			(sheetId === -1 || !$allSheets.map(({ id }) => id).includes(sheetId))
		)
			sheetId = $allSheets[$allSheets.length - 1].id;
	}
	$: {
		if (newSheet && $allSheets && $allSheets.map(({ id }) => id).includes(newSheet)) {
			sheetId = newSheet;
			newSheet = undefined;
		}
	}
</script>

<div class="h-full w-full p-4 flex flex-col items-center">
	<div class="flex w-full max-w-lg card p-3">
		<div class="pr-2 grid place-content-center">
			<button
				class="btn btn-icon variant-glass-primary text-primary-500"
				on:click={() =>
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
					<option value={sheet.id}>{sheet.name} ({sheet.owner})</option>
				{/each}
			{:else}
				<option value={-1}>Loading...</option>
			{/if}
		</select>
		<div class="pl-2 grid place-content-center">
			<button
				class="btn btn-icon variant-glass-secondary text-secondary-500"
				on:click={() =>
					modalStore.trigger({
						type: 'component',
						component: { ref: ChangeSheetName, props: { id: sheetId, current: currentSheet.name } }
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
	<Download {labels} name={currentSheet?.name ?? ''} />
</div>
