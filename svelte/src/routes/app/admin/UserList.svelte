<script lang="ts">
	import Button from '$lib/Button.svelte';
	import { client, sub } from '$lib/client';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import ChangePassword from './ChangePassword.svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';

	const allUsers = sub(client.users.all, client.users.onUpdate, { init: undefined });
	const modalStore = getModalStore();
</script>

<div class="card p-4">
	<h4 class="h4 font-semibold">Users</h4>
	<ul>
		{#each $allUsers ?? [] as user}
			<li class="variant-glass p-2 rounded-sm my-1 flex items-center">
				<span class="font-semibold text-surface-800 dark:text-surface-100">{user.username}</span>
				<span class="text-surface-600 dark:text-surface-200 pl-2"> {user.permissionLevel}</span>
				<span class="flex-grow"></span>
				<button
					class="btn btn-icon"
					disabled={user.username === 'admin'}
					onclick={() =>
						modalStore.trigger({
							type: 'component',
							component: { ref: ChangePassword, props: { username: user.username } }
						})}
				>
					<Pencil />
				</button>
				<Button
					class="btn btn-icon"
					action={client.users.delete}
					successMessage={`Removed "${user.username}"`}
					input={{ username: user.username }}
					disabled={user.username === 'admin'}
					confirm="Delete user and all accompanying date?"
				>
					<Trash2 />
				</Button>
			</li>
		{/each}
	</ul>
	{#if $allUsers === undefined}
		<div class="variant-glass h-16 w-full animate-pulse"></div>
	{/if}
</div>
