<script lang="ts">
	import '../app.postcss';
	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
	import { Modal, Toast, getModalStore, getToastStore, storePopup } from '@skeletonlabs/skeleton';
	import { initializeStores } from '@skeletonlabs/skeleton';
	import { setToastTrigger } from '$lib/client';
	import { onNavigate } from '$app/navigation';
	import type { AfterNavigate } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';

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

	afterNavigate((params: AfterNavigate) => {
		const isNewPage = params.from?.url.pathname !== params.to?.url.pathname;
		const elemPage = document.querySelector('#page');
		if (isNewPage && elemPage !== null) {
			elemPage.scrollTop = 0;
		}
	});
</script>

<Modal />
<Toast zIndex="z-[1000]" />

{@render children?.()}
