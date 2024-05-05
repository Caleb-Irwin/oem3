<script lang="ts">
	import Files from '$lib/Files.svelte';
	import { client } from '$lib/client';
</script>

<h1 class="text-center h2 p-2 pt-4">QuickBooks</h1>
<div class="w-full flex place-content-center p-2">
	<div class="max-w-xl">
		<Files filesRouter={client.qb.files} />
	</div>
</div>
