<script lang="ts">
	import { readableKeys, type getSmartChangeset, type SmartChangesetKeys } from './smartChangeset';

	export let smartChangeset: Awaited<ReturnType<typeof getSmartChangeset>>,
		key: SmartChangesetKeys,
		hasColumnSettings: boolean = true,
		example: string | undefined = undefined;
	const value = smartChangeset.fields[key].value,
		original = smartChangeset.fields[key].original,
		colSetValue = hasColumnSettings
			? smartChangeset.fields[(key + 'ColumnSettings') as SmartChangesetKeys].value
			: undefined,
		colSetOriginal = hasColumnSettings
			? smartChangeset.fields[(key + 'ColumnSettings') as SmartChangesetKeys].original
			: undefined;
</script>

{#if hasColumnSettings && colSetValue && colSetOriginal}
	<div class="w-full">
		<p>{readableKeys[key]}</p>
		<div
			class="input-group input-group-divider grid-cols-[1fr_auto] {$original !=
				($value === '' ? null : $value) || $colSetOriginal != $colSetValue
				? 'border-success-600 dark:border-success-500'
				: ''}"
		>
			<input
				class="text-center {$original != ($value === '' ? null : $value)
					? ' !border-success-600 !bg-success-300 dark:!border-success-500 dark:!bg-success-800'
					: ''}"
				type="text"
				bind:value={$value}
				placeholder={example ? `ex. ${example}` : 'null'}
			/>
			<select
				class="text-sm text-center {$colSetOriginal != $colSetValue
					? ' !border-success-600 !bg-success-300 dark:!border-success-500 dark:!bg-success-800'
					: ''}"
				bind:value={$colSetValue}
			>
				<option value="automatic">Automatic</option>
				<option value="automaticSmallChanges">Auto Small</option>
				<option value="approval">Approval</option>
				<option value="manual">Manual</option>
			</select>
		</div>
	</div>
{:else}
	<input
		type="text"
		class="input text-center ml-1 {$original != ($value === '' ? null : $value)
			? 'border-success-600 bg-success-300 dark:border-success-500 dark:bg-success-800'
			: ''}"
		bind:value={$value}
		placeholder="null"
	/>
{/if}
