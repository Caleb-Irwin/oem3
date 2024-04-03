<script lang="ts">
	import { client, query } from '$lib/client';

	const allUsers = query(client.users.all);
</script>

<div class="p-4">
	<ul>
		{#each $allUsers ?? [] as user}
			<li class="list-disc">{user.username}</li>
		{/each}
	</ul>
</div>
