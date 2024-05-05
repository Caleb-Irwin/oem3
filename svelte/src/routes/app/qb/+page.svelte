<script lang="ts">
	import UploadFile from '$lib/UploadFile.svelte';
	import { client } from '$lib/client';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import Upload from 'lucide-svelte/icons/upload';

	const modalStore = getModalStore();
</script>

<div class="w-full flex place-content-center p-10">
	<button
		class="btn variant-filled-primary btn-icon"
		on:click={() => {
			modalStore.trigger({
				type: 'component',
				component: {
					ref: UploadFile,
					props: {
						action: client.qb.upload,
						titleType: 'QuickBooks',
						accept: '.CSV'
					}
				}
			});
		}}
	>
		<Upload />
	</button>
</div>
