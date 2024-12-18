<script>
	import Button from '$lib/Button.svelte';
	import { client, query } from '$lib/client';

	const res = query(client.unifiedItems.items);
</script>

<div class="">
	<h2 class="h2 pt-4 p-2 text-center">Unified Items</h2>
	<Button action={client.unifiedItems.worker.run}>Run Worker</Button>
</div>

<div class="grid grid-cols-8 gap-1 p-2">
	{#each $res ?? [] as item}
		<div class="">
			<a class="underline" href="/app/unifiedItems/{item.id}">{item.id}</a>
		</div>
	{/each}
</div>
