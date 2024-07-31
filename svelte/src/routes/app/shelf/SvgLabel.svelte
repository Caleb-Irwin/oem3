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

	let lines: string[][] = [[], [], []],
		tooLong = false;

	const lineLength = async (line: string[]) =>
		(await Promise.all(line.map(async (w) => await wordWidth.get(w)))).reduce((a, b) => a + b, 0);

	const computeLines = async (): Promise<undefined> => {
		const phrase = label?.name
			.split(' ')
			.slice(0, 50)
			.reduce<string[]>((list, elem, i) => {
				list.push(elem);
				list.push(' ');
				return list;
			}, [])
			.filter((v) => v !== '');

		lines[0] = phrase;
		while (
			(await lineLength(lines[0])) > 180 ||
			(await lineLength(lines[1])) > 180 ||
			(await lineLength(lines[2])) > 180
		) {
			if ((await lineLength(lines[0])) > 180) {
				lines[1].unshift(lines[0].pop() as string);
			}
			if ((await lineLength(lines[1])) > 180) {
				lines[2].unshift(lines[1].pop() as string);
			}
			if ((await lineLength(lines[2])) > 180) {
				tooLong = true;
				console.log('too long', lines[2].pop());
			}
		}

		if (lines[1].length === 0) {
			lines.unshift([]);
		}
		if (lines[2].length === 0) {
			lines.unshift([]);
		}

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
			>{lines[0].join('')}</tspan
		>
		<tspan style="font-size: 10px;" x="50%" dominant-baseline="middle" text-anchor="middle" y="17">
			{lines[1].join('')}</tspan
		>
		<tspan style="font-size: 10px;" x="50%" dominant-baseline="middle" text-anchor="middle" y="28">
			{!tooLong
				? lines[2].join('')
				: lines[2].join('').substring(0, lines[2].join('').length - 3) + '...'}</tspan
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
