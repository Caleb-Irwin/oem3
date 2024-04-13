<script lang="ts">
	import LabelPage from './LabelPage.svelte';
	import divideArray from './divideArray';
	import type { Label } from './types';
	import { tick } from 'svelte';
	import { WordWidth } from './wordWidth';
	import { genPDF } from './genPdf';
	import { ProgressBar, ProgressRadial } from '@skeletonlabs/skeleton';

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
	class="btn variant-filled-primary w-full"
	on:click={() => {
		page = undefined;
		running = true;
		pdf = genPDF(c);
		pages = divideArray(labels, 30);
		index = 0;
		page = pages[index];
	}}
	disabled={running}
>
	{#if running}
		<ProgressBar height="h-6" value={index} max={pages.length} track="bg-primary-900" />
	{:else}
		Download
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
	>
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
					console.log('svgCallback');

					await pdf.addPage(svg);
					index++;
					await ((ms) => new Promise((res) => setTimeout(res, ms)))(50);
					if (index !== pages.length) page = pages[index];
					else {
						pdf.save(fileTitle);
						running = false;
					}
				}}
			/>
		{/key}
	{/if}
	<canvas bind:this={c} />
</div>
