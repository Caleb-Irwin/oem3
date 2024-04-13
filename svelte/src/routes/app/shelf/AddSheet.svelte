<script lang="ts">
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';

	export let res: (id: number) => void;
</script>

<Form
	action={client.labels.sheet.add}
	class="card max-w-sm p-4 flex flex-col items-center"
	successMessage="Sheet Created"
	res={({ id }) => res(id)}
	modalMode
>
	<h4 class="h4 font-semibold w-full">Sheet</h4>
	<label class="label w-full py-1">
		<span>Name</span>
		<input type="text" class="input" name="name" placeholder="Sheet Name" />
	</label>
	<label class="label w-full py-1">
		<span>Sharing</span>
		<select class="select" name="isPublic">
			<option value="public">Public</option>
			<option value="">Private</option>
		</select>
	</label>
	<button class="btn variant-filled-primary w-full">Add</button>
</Form>
