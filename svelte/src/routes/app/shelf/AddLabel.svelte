<script lang="ts">
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
	import type { Label } from '../../../../../server/src/db.schema';

	export let sheetId: number,
		edit = false,
		label: Label | undefined = undefined;
</script>

<Form
	action={edit ? client.labels.edit : client.labels.add}
	modalMode
	input={{ sheetId, id: label?.id }}
>
	<h4 class="h4 font-semibold w-full">{edit ? 'Edit' : 'New'} Label</h4>
	<label class="label w-full py-1">
		<span>Name</span>
		<input
			type="text"
			class="input"
			name="name"
			placeholder="Product Name"
			value={label?.name ?? ''}
		/>
	</label>
	<label class="label w-full py-1">
		<span>Price</span>
		<input
			type="text"
			class="input"
			name="price"
			placeholder="9.99"
			value={label?.priceCents ? label?.priceCents / 100 : ''}
		/>
	</label>
	<label class="label w-full py-1">
		<span>Barcode</span>
		<input
			type="text"
			class="input"
			name="barcode"
			placeholder="123456789012"
			value={label?.barcode ?? ''}
		/>
	</label>
	<button class="btn variant-filled-primary w-full mt-1">{edit ? 'Save' : 'Add'}</button>
</Form>
