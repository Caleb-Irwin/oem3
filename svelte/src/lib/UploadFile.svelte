<script lang="ts">
	import Form from '$lib/Form.svelte';
	import { ProgressBar } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';

	export let action: {
			upload: {
				mutate: (input: any) => Promise<never>;
			};
		},
		titleType: string,
		accept: string | undefined = undefined;

	let fileInput: HTMLInputElement;

	onMount(() => {
		fileInput.click();
	});
</script>

<Form action={action.upload} modalMode successMessage="Uploaded File">
	<h4 class="h4 font-semibold w-full">Upload {titleType} File</h4>
	<input class="input p-1 my-1" type="file" name="file" bind:this={fileInput} {accept} />
	<label class="label my-1">
		<span>Mode</span>
		<select class="select" name="processFile" id="">
			<option value="1">Apply File</option>
			<option value="">Only Upload</option>
		</select>
	</label>
	<button class="btn variant-filled-primary w-full flex flex-col justify-center group"
		>Upload <div class="w-full flex-grow hidden group-disabled:block pt-1"><ProgressBar /></div>
	</button>
</Form>
