<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { Label } from './types';
	import Barcode from './Barcode.svelte';
	import type { WordWidth } from './wordWidth';

	export let label: Label,
		auxText: string = '',
		x: number,
		y: number,
		loadedCB: () => void,
		wordWidth: WordWidth;

	let lines: string[] = [];

	const computeLines = async (): Promise<undefined> => {
		const phrase = label?.name
			.split(' ')
			.slice(0, 50)
			.reduce<string[]>((list, elem, i) => {
				list.push(elem);
				list.push(' ');
				return list;
			}, []);

		let line: string[] = [];
		await phrase.reduce(async (totalProm, elem) => {
			const total = await totalProm;
			const newTotal = total + (await wordWidth.get(elem));
			if (total < 185 && newTotal >= 185) {
				lines.push(line.join(''));
				line = [];
				return 0;
			}
			line.push(elem);
			return newTotal;
		}, Promise.resolve(0));

		if (lines.length > 3) lines[2] = lines[2].slice(0, lines[2].length - 3) + '...';
		if (lines.length < 3) lines.unshift('');
		if (lines.length < 3) lines.unshift('');
		if (lines.length < 3) lines.unshift('');

		lines = lines;

		await tick();
		loadedCB();
	};

	onMount(computeLines);
</script>

<svg {x} {y} width="197" height="73">
	<rect x="0" y="0" width="197" height="73" fill="white" />
	<Barcode barcode={label?.barcode} />

	<rect x="0" y="0" width="197" height="50" fill="white" />

	<text
		x="50%"
		y="5"
		dominant-baseline="middle"
		text-anchor="middle"
		style="font-size: 10px; fill: black;"
	>
		<tspan style="font-size: 10px;" x="50%" dominant-baseline="middle" text-anchor="middle" y="6"
			>{lines[0]}</tspan
		>
		<tspan style="font-size: 10px;" x="50%" dominant-baseline="middle" text-anchor="middle" y="17">
			{lines[1]}</tspan
		>
		<tspan style="font-size: 10px;" x="50%" dominant-baseline="middle" text-anchor="middle" y="28">
			{lines[2]}</tspan
		>
		<tspan
			x="50%"
			dominant-baseline="middle"
			text-anchor="middle"
			y="42"
			style="font-size: 14px; font-weight: bold;"
			>{(label ? '$' : '') +
				(label?.price.toString().split('.')[0] ?? '') +
				'.' +
				(label?.price.toString().split('.')[1] ?? '').padEnd(2, '0') ?? ''}</tspan
		>
	</text>
	<text
		x="15%"
		y="58"
		dominant-baseline="middle"
		text-anchor="middle"
		style="font-size: 10px; fill: grey;">{auxText}</text
	>
</svg>
