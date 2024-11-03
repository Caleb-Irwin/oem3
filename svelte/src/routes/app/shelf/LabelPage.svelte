<script lang="ts">
	import { tick } from 'svelte';
	import SvgLabel from './SvgLabel.svelte';
	import divideArray from './divideArray';
	import type { Label } from './types';
	import type { WordWidth } from './wordWidth';

	interface Props {
		page: Label[];
		auxText?: string;
		sf?: number;
		wordWidth: WordWidth;
		svgCallback: (string: string) => unknown;
	}

	let { page, auxText = '', sf = 1, wordWidth, svgCallback }: Props = $props();

	let loaded = 0;
	const loadedCB = () => {
		loaded++;
		if (loaded === page.length) tick().then(() => svgCallback(divEl.innerHTML));
	};

	let divEl: HTMLDivElement;
	let rows = $derived(
		divideArray(
			page.map((v): Label => {
				if (v.barcode.length === 0 && v.name.length === 0 && v.price === 0)
					return { barcode: '123456789012', name: 'Empty Tag', price: 0 };
				return v;
			}),
			3
		)
	);
</script>

<div bind:this={divEl}>
	<svg
		height={792 * sf}
		width={612 * sf}
		viewBox="0 0 612 792"
		fill="none"
		font-family="Sans,Arial"
		xmlns="http://www.w3.org/2000/svg"
	>
		<rect width="612" height="792" fill="#F5F5F5" />
		{#each rows as row, i}
			<SvgLabel x={5} y={78 * i + 5} {auxText} label={row[0]} {loadedCB} {wordWidth} />
			{#if row[1]}
				<SvgLabel x={207} y={78 * i + 5} {auxText} label={row[1]} {loadedCB} {wordWidth} />
			{/if}
			{#if row[2]}
				<SvgLabel x={409} y={78 * i + 5} {auxText} label={row[2]} {loadedCB} {wordWidth} />
			{/if}
		{/each}
	</svg>
</div>
