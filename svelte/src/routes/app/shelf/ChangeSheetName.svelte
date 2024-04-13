<script lang="ts">
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';

	export let id: number, current: string;
</script>

<Form
	action={client.labels.sheet.rename}
	input={{ id }}
	class="card max-w-sm p-4 flex flex-col items-center"
	successMessage="Renamed"
	modalMode
>
	<h4 class="h4 font-semibold w-full">Rename</h4>
	<label class="label w-full py-1">
		<span>Name</span>
		<input type="text" class="input" name="name" placeholder="Sheet Name" value={current} />
	</label>

	<button class="btn variant-filled-primary w-full">Save</button>
</Form>
