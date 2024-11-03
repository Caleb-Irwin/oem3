<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';

	interface Props {
		text: string;
	}

	let { text }: Props = $props();
	const toastStore = getToastStore();
</script>

<span
	class="hover:underline cursor-pointer"
	onclick={() =>
		navigator.clipboard.writeText(text).then(
			() =>
				toastStore.trigger({
					message: 'Copied',
					background: 'variant-filled-success'
				}),
			() =>
				toastStore.trigger({
					message: 'Failed to copy to clipboard',
					background: 'variant-filled-error'
				})
		)}
	onkeypress={(e) => {
		/* to make svelte happy */
	}}
	role="button"
	tabindex="0"
>
	{text}
</span>
