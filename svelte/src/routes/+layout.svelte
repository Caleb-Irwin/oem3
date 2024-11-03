<script lang="ts">
	import '../app.postcss';
	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
	import { Modal, Toast, getModalStore, getToastStore, storePopup } from '@skeletonlabs/skeleton';
	import { initializeStores } from '@skeletonlabs/skeleton';
	import { setToastTrigger } from '$lib/client';
	import { onNavigate } from '$app/navigation';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
	initializeStores();
	const toastStore = getToastStore();
	setToastTrigger((message) =>
		toastStore.trigger({ message, hoverable: true, background: 'variant-filled-error' })
	);
	const modalStore = getModalStore();
	onNavigate(() => {
		modalStore.clear();
	});
</script>

<Modal />
<Toast zIndex="z-[1000]" />

{@render children?.()}
