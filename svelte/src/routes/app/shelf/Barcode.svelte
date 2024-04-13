<script lang="ts">
	import { onMount } from 'svelte';
	import isValidBarcode from './isValidBarcode';
	import JsBarcode from 'jsbarcode';

	export let barcode: string | undefined;
	$: validBarcode = barcode ? isValidBarcode(barcode) : false;

	let el: SVGElement;

	onMount(() => {
		if (barcode) {
			JsBarcode(
				el,
				barcode,
				validBarcode
					? {
							format: 'upc',
							textMargin: 0,
							fontOptions: 'bold'
						}
					: {}
			);
			el.setAttribute('x', '50');
			el.setAttribute('y', '5');
			el.setAttribute('width', '96.8px');
			el.setAttribute('height', '84px');
			el.setAttribute('viewBox', '0 0 242 140');
		}
	});
</script>

<svg bind:this={el}> </svg>
