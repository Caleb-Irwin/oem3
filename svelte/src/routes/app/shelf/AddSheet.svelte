<script lang="ts">
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
</script>

<Form
	action={client.labels.sheet.add}
	class="card max-w-sm p-4 flex flex-col items-center"
	successMessage="Sheet Created"
	modalMode
>
	<h4 class="h4 font-semibold w-full">Sheet</h4>
	<label class="label w-full py-1">
		<span>Name</span>
		<input type="text" class="input" name="name" placeholder="Sheet Name" />
	</label>
	<label class="label w-full py-1">
		<span>Sharing</span>
		<select class="select" name="isPrivate">
			<option value="1">Public</option>
			<option value="0">Private</option>
		</select>
	</label>
	<button class="btn variant-filled-primary w-full">Add</button>
</Form>
