<script lang="ts">
	import Images from './Images.svelte';
	import Price from './Price.svelte';
	import Description from './Description.svelte';
	import Title from './Title.svelte';
	import Connection from './Connection.svelte';
	import type { Cell, NamedCell } from './types';
	import Text from './Text.svelte';
	import Deleted from './Deleted.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		tableName: string;
		id: Cell;
		lastUpdated: Cell;
		deleted: Cell;
		primaryConnection: NamedCell;
		secondaryConnection?: NamedCell;
		otherConnections: [NamedCell] | [NamedCell, NamedCell];
		primaryIds: [NamedCell, ...NamedCell[]];
		otherIds: [NamedCell, ...NamedCell[]];
		title: Cell;
		primaryImage: Cell;
		primaryImageDescription: Cell;
		otherImages: Cell;
		price: Cell;
		comparePrice?: Cell;
		description: Cell;
		children?: Snippet;
	}
	let {
		tableName,
		id,
		lastUpdated,
		deleted,
		primaryConnection,
		primaryImageDescription,
		secondaryConnection,
		otherConnections,
		primaryIds,
		otherIds,
		title,
		primaryImage,
		otherImages,
		price,
		comparePrice,
		description,
		children
	}: Props = $props();
</script>

<div class="w-full p-1 lg:p-3 pb-0 lg:pb-0 grid lg:grid-cols-6 grid-cols-1">
	<div
		class="lg:pr-1 flex flex-col {secondaryConnection || otherConnections.length === 1
			? 'lg:col-span-3'
			: 'lg:col-span-2'}"
	>
		<h3 class="h3 pt-1 text-center">
			<span class="font-semibold">Primary</span> Connection{secondaryConnection ? 's' : ''} and IDs
		</h3>
		<div class="flex-grow grid {secondaryConnection ? 'md:grid-cols-2' : ''}">
			<div class="p-1 flex">
				<Connection namedCell={primaryConnection} />
			</div>
			{#if secondaryConnection}
				<div class="p-1 flex">
					<Connection namedCell={secondaryConnection} />
				</div>
			{/if}
		</div>
		<div class="flex flex-row flex-wrap">
			{#each primaryIds as namedCell}
				<div class="p-1 flex flex-1 min-w-56">
					<Text {namedCell} />
				</div>
			{/each}
		</div>
	</div>
	<div
		class="lg:pl-1 flex flex-col {secondaryConnection || otherConnections.length === 1
			? 'lg:col-span-3'
			: 'lg:col-span-4'}"
	>
		<h3 class="h3 pt-1 text-center">
			<span class="font-semibold">Other</span> Connection{otherConnections.length > 1 ? 's' : ''} and
			IDs
		</h3>
		<div class="flex-grow grid {otherConnections.length > 1 ? 'md:grid-cols-2' : ''}">
			{#each otherConnections as namedCell}
				<div class="p-1 flex">
					<Connection {namedCell} />
				</div>
			{/each}
		</div>
		<div class="flex flex-row flex-wrap">
			{#each otherIds as namedCell}
				<div class="p-1 flex flex-1 min-w-56">
					<Text {namedCell} />
				</div>
			{/each}
		</div>
	</div>
</div>

<div class="lg:p-2 grid grid-cols-1 md:grid-cols-3 w-full">
	<div class="col-span-1">
		<Images
			primary={primaryImage}
			other={otherImages}
			primaryDescription={primaryImageDescription}
		/>
	</div>
	<div class="p-2 w-full col-span-1 md:col-span-2">
		<div class="flex w-full flex-col md:flex-row">
			<Title cell={title} />
			<Deleted cell={deleted} />
		</div>
		<div class="py-2">
			<Price {price} {comparePrice} />
			<span class="flex-grow"></span>
		</div>
		<Description cell={description} />
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-1 mx-[-4px]">
			{@render children?.()}
		</div>
		<p class="card mt-1 text-center p-1 italic">
			{tableName}#{id.value} was last updated {new Date(
				lastUpdated.value as number
			).toLocaleString()}
		</p>
	</div>
</div>
