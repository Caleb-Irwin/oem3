<script lang="ts">
	import Form from '$lib/Form.svelte';
	import { client, sub } from '$lib/client';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	const allUsers = sub(client.users.all, client.users.onUpdate);
</script>

<div class="card p-4">
	<h4 class="h4 font-semibold">Users</h4>
	<ul>
		{#each $allUsers ?? [] as user}
			<li class="variant-glass p-2 rounded-sm my-1 flex items-center">
				<span class="font-semibold text-surface-100">{user.username}</span>
				<span class="text-surface-200 pl-2">
					{user.permissionLevel === 'general' ? '' : user.permissionLevel}</span
				>
				<span class="flex-grow"></span>
				<Form action={client.users.delete} successMessage={`Removed "${user.username}"`}>
					<input type="hidden" value={user.username} name="username" />
					<button class="btn btn-icon">
						<Trash2 />
					</button>
				</Form>
			</li>
		{/each}
	</ul>
	{#if $allUsers === undefined}
		<div class="variant-glass h-16 w-full animate-pulse"></div>
	{/if}
</div>
