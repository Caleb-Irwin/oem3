<script lang="ts">
	import '../app.postcss';

	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
	import { Toast, storePopup } from '@skeletonlabs/skeleton';
	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
	import { initializeStores } from '@skeletonlabs/skeleton';
	initializeStores();
</script>

<Toast />

<slot />
