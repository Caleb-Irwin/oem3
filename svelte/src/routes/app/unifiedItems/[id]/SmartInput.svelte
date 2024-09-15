<script lang="ts">
	import type { getSmartChangeset, SmartChangesetKeys } from './smartChangeset';

	export let smartChangeset: Awaited<ReturnType<typeof getSmartChangeset>>, key: SmartChangesetKeys;
	const value = smartChangeset.fields[key].value,
		original = smartChangeset.fields[key].original;
</script>

<input
	type="text"
	class="input text-center ml-1 {$original != ($value === '' ? null : $value)
		? 'border-success-600 bg-success-300 dark:border-success-500 dark:bg-success-800'
		: ''}"
	bind:value={$value}
	placeholder="null"
/>
