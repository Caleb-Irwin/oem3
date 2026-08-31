<script lang="ts">
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
	import type { OrderPlannerOrder } from './types';

	interface Props {
		res: (order: OrderPlannerOrder) => Promise<void> | void;
	}

	let { res }: Props = $props();
</script>

<Form
	action={client.orderPlanner.order.create}
	successMessage="Order created"
	{res}
	modalMode
	class="w-[calc(100vw-2rem)]"
>
	<div class="w-full">
		<h2 class="h3 font-semibold">Create a new order</h2>
		<p class="mt-1 text-sm text-surface-600 dark:text-surface-300">
			Give the order a short name that employees will recognize.
		</p>

		<label class="label mt-4 block w-full">
			<span class="font-medium">Order name</span>
			<input
				class="input mt-1 w-full"
				name="name"
				maxlength="128"
				placeholder="For example, Weekly office supplies"
				required
			/>
		</label>

		<label class="label mt-3 block w-full">
			<span class="font-medium"
				>Notes <span class="font-normal text-surface-500">optional</span></span
			>
			<textarea
				class="textarea mt-1 h-24 w-full resize-y"
				name="notes"
				maxlength="4000"
				placeholder="Reference number, vendor contact, or delivery details"
			></textarea>
		</label>

		<button class="btn variant-filled-primary mt-4 w-full justify-center">Create order</button>
	</div>
</Form>
