<script lang="ts">
	import '../app.postcss';
	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
	import { Modal, Toast, getToastStore, storePopup } from '@skeletonlabs/skeleton';
	import { initializeStores } from '@skeletonlabs/skeleton';
	import { setToastTrigger } from '$lib/client';

	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
	initializeStores();
	const toastStore = getToastStore();
	setToastTrigger((message) => toastStore.trigger({ message, background: 'variant-filled-error' }));
</script>

<Toast />
<Modal />

<slot />
