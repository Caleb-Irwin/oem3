<script lang="ts">
	import LabelPage from './LabelPage.svelte';
	import divideArray from './divideArray';
	import type { Label } from './types';
	import { tick } from 'svelte';
	import { WordWidth } from './wordWidth';
	import { genPDF } from './genPdf';
	import { ProgressBar } from '@skeletonlabs/skeleton';
	import Download from 'lucide-svelte/icons/download';

	export let labels: Label[],
		auxText = '',
		sf = 4,
		fileTitle = 'labels';

	let pages: Label[][],
		index: number,
		page: Label[] | undefined,
		running = false,
		pdf: ReturnType<typeof genPDF>,
		c: HTMLCanvasElement,
		tspanEl: SVGTSpanElement,
		measureText = '';

	const wordWidth = new WordWidth(async (word: string) => {
		measureText = word;
		await tick();
		return tspanEl.getComputedTextLength();
	});
</script>

<button
	class="btn variant-glass-primary w-full flex-grow text-secondary-500"
	on:click={() => {
		page = undefined;
		running = true;
		pdf = genPDF(c);
		pages = divideArray(labels, 30);
		index = 0;
		page = pages[index];
	}}
	disabled={running || labels.length === 0}
>
	{#if running}
		<ProgressBar height="h-6" value={index} max={pages.length} track="bg-primary-900" />
	{:else}
		<span><Download /></span><span>Download</span>
	{/if}
</button>
<svg width="0" height="0">
	<rect x="0" y="0" width="197" height="73" fill="white" />
	<text
		x="50%"
		y="5"
		dominant-baseline="middle"
		text-anchor="middle"
		style="font-size: 10px; fill: black;"
		font-family="Sans,Arial"
		>ß
		<tspan
			style="font-size: 10px;"
			x="50%"
			dominant-baseline="middle"
			text-anchor="middle"
			y="6"
			bind:this={tspanEl}>{measureText}</tspan
		>
	</text>
</svg>
<div class="hidden">
	{#if running && page}
		{#key page}
			<LabelPage
				{page}
				{auxText}
				{sf}
				{wordWidth}
				svgCallback={async (svg) => {
					await pdf.addPage(svg);
					index++;
					await ((ms) => new Promise((res) => setTimeout(res, ms)))(50);
					if (index !== pages.length) page = pages[index];
					else {
						running = false;
						page = undefined;
						pdf.save(fileTitle);
					}
				}}
			/>
		{/key}
	{/if}
	<canvas bind:this={c} />
</div>
