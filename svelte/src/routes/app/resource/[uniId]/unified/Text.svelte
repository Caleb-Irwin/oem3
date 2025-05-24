<script lang="ts">
	import NullableText from './NullableText.svelte';
	import type { NamedCell } from './types';
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';

	interface Props {
		namedCell: NamedCell;
	}

	let { namedCell: nc }: Props = $props();
</script>

<div class="card p-2 w-full">
	<div class="flex flex-row items-center justify-between">
		<div>
			<p class="text-lg font-bold flex-grow">{nc.name}</p>
			<p class="text-lg">
				<NullableText text={nc.cell.value} />
			</p>
		</div>
		<div class="pl-4">
			<SettingButton cell={nc.cell} />
		</div>
	</div>
	<Settings cell={nc.cell} />
</div>
