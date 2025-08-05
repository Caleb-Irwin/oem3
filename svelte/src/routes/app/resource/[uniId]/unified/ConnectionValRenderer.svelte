<script lang="ts">
	import { client, subValReturnError } from '$lib/client';
	import ItemRow from '$lib/ItemRow.svelte';
	import { ColToTableName } from './types';

	interface Props {
		value: number;
		col: string;
		init?: any | undefined;
	}

	const props: Props = $props();

	const valSub = subValReturnError(client.resources.getResourceByColSub, {
		input: { col: props.col as any, value: props.value },
		sendInit: true,
		updateTopic: ColToTableName[props.col as keyof typeof ColToTableName],
		init: props.init ? props.init : undefined
	});

	const connectionRow = $derived($valSub);
</script>

{#if connectionRow === undefined}
	<p class="font-semibold p-2 w-full text-center animate-pulse">Loading Preview...</p>
{:else if connectionRow.error}
	<p class="text-lg font-semibold p-2 w-full text-center text-error-600">
		Error loading connection ({connectionRow.error})
	</p>
{:else}
	<ItemRow rawProduct={connectionRow as any} newTab />
{/if}
