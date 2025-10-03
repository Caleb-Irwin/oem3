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

	function transformText(value: string | number | boolean | null): string {
		if (typeof value === 'boolean') {
			return value ? 'True' : 'False';
		} else if (typeof value === 'number') {
			return price ? formatPrice(value / 100) : String(value);
		} else if (value === null) {
			return 'Null';
		}
		return value;
	}
</script>

<div class="card p-2 w-full {className ?? ''}">
	<div class="flex flex-row items-center justify-between">
		<div>
			<p class="text-lg font-bold flex-grow">{nc.name}</p>
			{@render valueRenderer(nc.cell.value)}
		</div>
		<div class="pl-4">
			<SettingButton cell={nc.cell} />
		</div>
	</div>
	<Settings cell={nc.cell} {valueRenderer} />
</div>

{#snippet valueRenderer(value: string | number | boolean | null)}
	<p class="text-lg">
		<NullableText text={transformText(value)} />
	</p>
{/snippet}
