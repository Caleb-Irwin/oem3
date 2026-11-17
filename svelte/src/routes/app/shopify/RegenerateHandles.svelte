<script lang="ts">
	import { client, handleTRPCError } from '$lib/client';
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import type { HandleResult } from '../../../../../server/src/routers/shopify/handles';

	const modalStore = getModalStore(),
		toastStore = getToastStore();

	let text = $state(''),
		busy = $state(false),
		// What the rows below describe: a preview, or the outcome of a run
		applied = $state(false),
		rows: HandleResult[] = $state([]);

	const codes = $derived(
		text
			.split(/[\s,;]+/)
			.map((c) => c.trim())
			.filter(Boolean)
	);
	const toChange = $derived(rows.filter((r) => r.status === 'change').length);

	const notes: Record<Exclude<HandleResult['status'], 'change' | 'unchanged'>, string> = {
		notFound: 'No product has this code or handle',
		ambiguous: 'More than one product has this code',
		noListing: 'No Shopify listing',
		noTitle: 'The product has no title'
	};

	async function preview() {
		busy = true;
		try {
			rows = await client.shopify.handles.preview.query({ codes });
			applied = false;
		} catch (e) {
			handleTRPCError(e);
		}
		busy = false;
	}

	async function regenerate() {
		const confirmed = await new Promise((response) =>
			modalStore.trigger({
				type: 'confirm',
				title: `Change the URL of ${toChange} Shopify listing${toChange === 1 ? '' : 's'}?`,
				body: 'The old URLs will redirect to the new ones.',
				response
			})
		);
		if (!confirmed) return;
		busy = true;
		try {
			rows = await client.shopify.handles.regenerate.mutate({ codes });
			applied = true;
			const failed = rows.filter((r) => r.error).length,
				changed = rows.filter((r) => r.handle).length;
			toastStore.trigger({
				message: `Changed ${changed} handle${changed === 1 ? '' : 's'}${failed ? `; ${failed} failed` : ''}.`,
				background: failed ? 'variant-filled-warning' : 'variant-filled-success'
			});
		} catch (e) {
			handleTRPCError(e);
		}
		busy = false;
	}
</script>

<div class="card p-4 min-w-72 mt-2">
	<div class="flex flex-col gap-2">
		<h5 class="h4 font-semibold">Regenerate Handles</h5>
		<p class="text-sm opacity-80">
			A listing keeps the handle made from its first title. Use this after a product's content was
			corrected, so its URL names the right product. Old URLs redirect to the new ones.
		</p>
		<textarea
			class="textarea font-mono text-sm"
			rows="3"
			placeholder="Novexco, SPR or Guild codes, or current handles"
			bind:value={text}
			oninput={() => (rows = [])}
		></textarea>
		<div class="flex gap-2">
			<button
				class="btn variant-ghost-primary flex-grow"
				disabled={busy || codes.length === 0}
				onclick={preview}>Preview</button
			>
			<button
				class="btn variant-ghost-warning flex-grow"
				disabled={busy || applied || toChange === 0}
				onclick={regenerate}>Regenerate{toChange > 0 && !applied ? ` ${toChange}` : ''}</button
			>
		</div>
		{#if rows.length > 0}
			<ul class="flex flex-col gap-2 text-sm">
				{#each rows as row (row.code)}
					<li class="border-t border-surface-500/30 pt-2">
						<p class="font-semibold">
							{row.code}
							{#if 'title' in row && row.title}
								<span class="font-normal opacity-80">{row.title}</span>
							{/if}
						</p>
						{#if row.status === 'change' || row.status === 'unchanged'}
							{#if row.error}
								<p class="text-error-500">Failed: {row.error}</p>
							{:else if row.status === 'unchanged'}
								<p class="opacity-80">Handle already matches</p>
							{:else}
								<p class="font-mono break-all line-through opacity-60">{row.currentHandle}</p>
								<p class="font-mono break-all">{row.handle ?? row.newHandle}</p>
								{#if row.handle && row.handle !== row.newHandle}
									<p class="text-warning-500">Shopify adjusted the handle</p>
								{/if}
							{/if}
						{:else}
							<p class="text-warning-500">{notes[row.status]}</p>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
