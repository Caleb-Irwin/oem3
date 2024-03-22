<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="container h-full mx-auto flex justify-center items-center">
	<div class="space-y-5">
		<h1 class="h1 text-center">App Home</h1>
		<p class="text-center">Welcome <span class="font-semibold">{data.user.username}</span></p>
		<form action="/?/logout" method="post" class="flex justify-center">
			<button class="btn variant-filled-primary">Logout</button>
		</form>
	</div>
</div>
