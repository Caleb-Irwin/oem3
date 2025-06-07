<script lang="ts">
	import NullableText from './NullableText.svelte';
	import type { NamedCell } from './types';
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';
	import { formatPrice } from '$lib/formatPrice';

	interface Props {
		namedCell: NamedCell;
		class?: string;
		price?: boolean;
	}

	let { namedCell: nc, class: className, price }: Props = $props();
	let val = $derived(
		typeof nc.cell.value === 'boolean'
			? nc.cell.value
				? 'True'
				: 'False'
			: price && nc.cell.value !== null
				? formatPrice((nc.cell.value as number) / 100)
				: nc.cell.value
	);
</script>

<div class="card p-2 w-full {className ?? ''}">
	<div class="flex flex-row items-center justify-between">
		<div>
			<p class="text-lg font-bold flex-grow">{nc.name}</p>
			<p class="text-lg">
				<NullableText text={val} />
			</p>
		</div>
		<div class="pl-4">
			<SettingButton cell={nc.cell} />
		</div>
	</div>
	<Settings cell={nc.cell} />
</div>
