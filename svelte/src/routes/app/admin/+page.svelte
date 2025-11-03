<script lang="ts">
	import Button from '$lib/Button.svelte';
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
	import UserList from './UserList.svelte';
</script>

<svelte:head>
	<title>OEM3 Admin</title>
</svelte:head>

<div class="container h-full mx-auto flex justify-center items-center flex-col">
	<div class="flex flex-col">
		<UserList />
		<Form class="mt-2 card p-4" action={client.users.create} successMessage="User Created">
			<h4 class="h4 font-semibold">Create User</h4>
			<label class="label">
				<span>Username</span>
				<input class="input" type="text" placeholder="user1234" id="username" name="username" />
			</label>
			<label class="label">
				<span>Password</span>
				<input class="input" type="password" placeholder="********" id="password" name="password" />
			</label>
			<label class="label">
				<span>Permission Level</span>
				<select class="select" id="permissionLevel" name="permissionLevel">
					<option value="general">General</option>
					<option value="viewer">Viewer</option>
				</select>
			</label>
			<button class="btn variant-filled-primary w-full mt-2">Create New User</button>
		</Form>
		<Button
			action={client.users.invalidateAll}
			confirm
			successMessage="All Sessions Invalidated"
			class="btn variant-filled-secondary flex mt-4"
		>
			Invalidate All Sessions
		</Button>
	</div>
</div>
