<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	export let form: ActionData;

	let logingIn = false;
</script>

<div class="container h-full mx-auto flex justify-center items-center">
	<div class="space-y-5">
		<h1 class="h1 text-center">OEM3</h1>
		<form
			class="card p-4"
			method="POST"
			use:enhance={() => {
				logingIn = true;
				return async ({ update }) => {
					await update();
					logingIn = false;
				};
			}}
		>
			{#if form?.msg && !logingIn}
				<p class="card variant-soft-error p-2 text-center">{form.msg}</p>
			{/if}
			<label class="label my-1">
				<span>Username</span>
				<input
					class="input"
					type="text"
					placeholder="username"
					name="username"
					disabled={logingIn}
				/>
			</label>
			<label class="label my-1">
				<span>Password</span>
				<input class="input" type="text" placeholder="******" name="password" disabled={logingIn} />
			</label>
			<button type="submit" class="btn variant-filled-primary w-full mt-1" disabled={logingIn}
				>Login</button
			>
		</form>
	</div>
</div>
