<script lang="ts">
	import type { T } from 'vitest/dist/reporters-1evA5lom.js';
	import { client as trpcClient } from './client';

	let formClass = '';
	export { formClass as class };
	export let action: (
		client: typeof trpcClient
	) => (input: { [k: string]: FormDataEntryValue }) => Promise<T>;
	export let res: (output: T) => Promise<void> | void = (ouput) => undefined;

	let disabled = false;
</script>

<form
	class={formClass}
	on:submit|preventDefault={async (e) => {
		disabled = true;
		try {
			await res(await action(trpcClient)(Object.fromEntries(new FormData(e.currentTarget))));
		} catch (e) {
			console.log(e);
		}
		disabled = false;
	}}
>
	<fieldset {disabled}>
		<slot />
	</fieldset>
</form>
