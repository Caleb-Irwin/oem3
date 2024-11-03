<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';

	export let text: string;
	const toastStore = getToastStore();
</script>

<span
	class="hover:underline cursor-pointer"
	on:click={() =>
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
	role="button"
>
	{text}
</span>
