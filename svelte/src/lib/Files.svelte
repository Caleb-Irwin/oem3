<script lang="ts">
	import Trash_2 from 'lucide-svelte/icons/trash-2';
	import Upload from 'lucide-svelte/icons/upload';
	import Button from './Button.svelte';
	import UploadFile from '$lib/UploadFile.svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { client, sub } from './client';
	import type { FileRouterType } from '../../../server/src/utils/files';

	export let filesRouter: FileRouterType, title: string;

	const files = sub(filesRouter.get, filesRouter.onUpdate);

	const modalStore = getModalStore();
</script>

<div class="w-full card p-4">
	<div class="flex items-center pb-2">
		<h4 class="h4 font-semibold">Files: {title}</h4>
		<div class="flex-grow"></div>
		<button
			class="btn btn-sm variant-filled-primary max-w-48"
			on:click={() => {
				modalStore.trigger({
					type: 'component',
					component: {
						ref: UploadFile,
						props: {
							action: filesRouter,
							titleType: 'QuickBooks',
							accept: '.CSV'
						}
					}
				});
			}}
		>
			<span>
				<Upload />
			</span>
			<span>Upload</span>
		</button>
	</div>

	<ul class="rounded-lg">
		{#each $files ?? [] as file, i}
			<li class="py-0.5 px-2 flex items-center {i % 2 === 0 ? 'bg-surface-600' : 'bg-surface-800'}">
				<button class="btn btn-sm variant-filled-primary mr-3" on:click={() => alert('TODO')}
					>Apply</button
				>
				<p class="flex-grow">
					<span class="font-semibold"
						>#{file.id}
						<button
							on:click={async () => {
								const link = document.createElement('a');
								link.download = file.name ?? 'default file name';
								link.href = (await filesRouter.download.query({ fileId: file.id }))?.content ?? '';
								document.body.appendChild(link);
								link.click();
								document.body.removeChild(link);
							}}
							class="underline">{file.name}</button
						></span
					> <br />
					<span class="text-sm">
						uploaded by {file.author} at
						{new Date(file.uploadedTime ?? 0).toLocaleString()}</span
					>
				</p>
				<Button
					action={client.qb.files.del}
					input={{ fileId: file.id }}
					confirm
					class="btn-icon btn-icon-sm  text-error-600 ml-2"
				>
					<Trash_2 />
				</Button>
			</li>
		{:else}
			<p class="text-center">{$files ? 'No Files' : 'Loading...'}</p>
		{/each}
	</ul>
</div>
