<script lang="ts">
	import { client } from '$lib/client';
	import Form from '$lib/Form.svelte';
	interface Props {
		username: string;
	}

	let { username }: Props = $props();
</script>

<Form action={client.users.changePassword} successMessage="Password Changed" modalMode>
	<h4 class="h4 font-semibold w-full">Change Password</h4>
	<input type="hidden" name="username" value={username} />
	<input class="input my-2" type="password" name="password" placeholder="New Password" />
	<button class="btn variant-filled-primary w-full">Save</button>
</Form>
