<script>
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
</script>

<div class="">
	<h2 class="h2 pt-4 p-2 text-center">Unified Items</h2>
	<Button action={client.unifiedItems.worker.run}>Run Worker</Button>
</div>
