<script lang="ts">
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
	import Footer from './app/Footer.svelte';
	import type { AfterNavigate } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';

	afterNavigate((params: AfterNavigate) => {
		const isNewPage = params.from?.url.pathname !== params.to?.url.pathname;
		const elemPage = document.querySelector('#page');
		if (isNewPage && elemPage !== null) {
			elemPage.scrollTop = 0;
		}
	});
</script>

<svelte:head>
	<title>OEM3 - Login</title>
</svelte:head>

<div class="container h-full mx-auto flex flex-col justify-center items-center">
	<div class="flex-grow"></div>
	<div class="space-y-5">
		<h1 class="h1 text-center">OEM3</h1>
		<Form class="card p-4" action={client.user.login} successMessage={'Welcome'} invalidateAll>
			<label class="label my-1">
				<span>Username</span>
				<input class="input" type="text" placeholder="username" name="username" />
			</label>
			<label class="label my-1">
				<span>Password</span>
				<input class="input" type="password" placeholder="******" name="password" />
			</label>
			<button type="submit" class="btn variant-filled-primary w-full mt-1">Login</button>
		</Form>
	</div>
	<div class="flex-grow"></div>
	<Footer />
</div>
