<script lang="ts">
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
	import Footer from './app/Footer.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>OEM3 Login</title>
</svelte:head>

<div class="container h-full mx-auto flex flex-col justify-center items-center">
	<div class="flex-grow"></div>
	<div class="space-y-5">
		<div class="flex flex-col items-center gap-3">
			<img src="/logo.svg" alt="Office Experts" class="h-20 w-20 rounded-xl shadow-sm" />
			<h1 class="h1 text-center">OEM3</h1>
		</div>
		<Form
			class="card p-4"
			action={client.user.login}
			successMessage={'Welcome'}
			res={() => {
				window.location.href = data.redirectTo;
			}}
		>
			<label class="label my-1">
				<span>Username</span>
				<input class="input" type="text" placeholder="username" name="username" />
			</label>
			<label class="label my-1">
				<span>Password</span>
				<input class="input" type="password" placeholder="******" name="password" />
			</label>
			<button type="submit" class="btn variant-ghost-primary w-full mt-1">Login</button>
		</Form>
	</div>
	<div class="flex-grow"></div>
	<Footer />
</div>
