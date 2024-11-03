<script lang="ts">
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';

	interface Props {
		id: number;
		current: string;
		isPublic: '' | 'public';
	}

	let { id, current, isPublic }: Props = $props();
</script>

<Form action={client.labels.sheet.rename} input={{ id }} successMessage="Renamed" modalMode>
	<h4 class="h4 font-semibold w-full">Rename</h4>
	<label class="label w-full py-1">
		<span>Name</span>
		<input type="text" class="input" name="name" placeholder="Sheet Name" value={current} />
	</label>
	<label class="label w-full py-1">
		<span>Sharing</span>
		<select class="select" name="isPublic" value={isPublic}>
			<option value="">Private</option>
			<option value="public">Public</option>
		</select>
	</label>

	<button class="btn variant-filled-primary w-full">Save</button>
</Form>
