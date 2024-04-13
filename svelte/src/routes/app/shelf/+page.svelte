<script lang="ts">
	import type { Label } from './types';
	import GenPages from './GenPages.svelte';

	let total = 50,
		auxText = 'test',
		sf = 3,
		fileTitle = 'labels';

	$: labels = (() => {
		const arr = new Array<Label>(total);
		arr.fill({
			barcode: '123456789012',
			name: 'Test Tag Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test A B C D E F G H I J K L M N O P',
			price: 0.99
		});
		return arr;
	})();
</script>

<div class="h-full w-full grid place-content-center">
	<div class="card max-w-sm p-4 flex flex-col items-center">
		<h4 class="h4 font-semibold w-full">Generate Labels</h4>
		<label class="label w-full py-1">
			<span>Dummy Label Count</span>
			<input type="number" bind:value={total} class="input" />
		</label>
		<label class="label w-full py-1">
			<span>Auxillary Text</span>
			<input type="text" bind:value={auxText} class="input" />
		</label>
		<label class="label w-full py-1">
			<span>Scale Factor</span>
			<input type="number" bind:value={sf} class="input" />
		</label>
		<label class="label w-full py-1 pb-4">
			<span>File Title</span>
			<input type="text" bind:value={fileTitle} class="input" />
		</label>

		<GenPages {labels} {sf} {auxText} {fileTitle} />
	</div>
</div>
