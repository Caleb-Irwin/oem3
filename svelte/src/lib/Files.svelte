<script lang="ts">
	import Trash_2 from 'lucide-svelte/icons/trash-2';
	import Upload from 'lucide-svelte/icons/upload';
	import CloudDownload from 'lucide-svelte/icons/cloud-download';
	import Button from './Button.svelte';
	import UploadFile from '$lib/UploadFile.svelte';
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import { client, subVal } from './client';
	import type { FileRouterType } from '../../../server/src/utils/files';
	import type { Resolver } from '@trpc/client';

	interface Props {
		filesRouter: FileRouterType;
		title: string;
		applyMutation: {
			mutate: Resolver<{
				input: {
					fileId?: number;
				};
				output: never;
				errorShape: any;
				transformer: false;
			}>;
		};
		cloudSyncMutation?:
			| {
					mutate: Resolver<{
						input: {};
						output: { message: string };
						errorShape: any;
						transformer: false;
					}>;
			  }
			| undefined;
		acceptFileType: string;
		initVal: Awaited<ReturnType<FileRouterType['get']['query']>> | undefined;
		embedded?: boolean;
	}

	let {
		filesRouter,
		title,
		applyMutation,
		cloudSyncMutation = undefined,
		acceptFileType,
		initVal,
		embedded = false
	}: Props = $props();

	const _files = subVal(filesRouter.getSub, { init: initVal });
	const files = $derived($_files);

	const modalStore = getModalStore(),
		toastStore = getToastStore();
</script>

<div
	class="w-full p-4 {embedded ? 'border-t border-surface-300/80 dark:border-surface-600' : 'card'}"
>
	<div class="flex items-center pb-2">
		<h4 class="h4 font-semibold">Files: {title}</h4>
		<div class="flex-grow min-w-2"></div>
		{#if cloudSyncMutation}
			<Button
				action={cloudSyncMutation}
				res={({ message }) => {
					toastStore.trigger({ message, background: 'variant-filled-success' });
				}}
				class="btn btn-icon btn-icon-sm variant-ghost-primary mr-1.5"
			>
				<CloudDownload />
			</Button>
		{/if}
		<button
			class="btn btn-sm variant-ghost-primary max-w-48"
			onclick={() => {
				modalStore.trigger({
					type: 'component',
					component: {
						ref: UploadFile,
						props: {
							action: filesRouter,
							titleType: title,
							accept: acceptFileType
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

	<ul class="max-h-64 overflow-y-auto overflow-x-hidden rounded-lg">
		{#each files ?? [] as file, i}
			<li
				class="flex min-w-0 items-center gap-2 px-2 py-1 {i % 2 === 0
					? 'bg-primary-50/60 dark:bg-primary-900/20'
					: 'bg-primary-50/25 dark:bg-primary-900/10'}"
			>
				<Button
					action={applyMutation}
					input={{ fileId: file.id }}
					successMessage="Processing Started"
					class="btn btn-sm shrink-0 variant-ghost-primary">Apply</Button
				>
				<p class="min-w-0 flex-1">
					<span class="flex min-w-0 items-start font-semibold">
						<span class="shrink-0">#{file.id}</span>
						<button
							onclick={async () => {
								toastStore.trigger({
									message: 'Downloading',
									background: 'variant-filled-success'
								});
								const link = document.createElement('a');
								const url = (await filesRouter.download.query({ fileId: file.id }))?.url;
								if (!url) {
									toastStore.trigger({
										message: 'Download Failed',
										background: 'variant-filled-error'
									});
									return;
								}
								link.href = url;
								document.body.appendChild(link);
								link.click();
								document.body.removeChild(link);
							}}
							class="min-w-0 break-words pl-1.5 text-left underline [overflow-wrap:anywhere]"
							>{file.name}</button
						>
					</span>
					<span class="block break-words text-sm">
						uploaded {file.author === null ? 'automatically' : 'by ' + file.author} at
						{new Date(file.uploadedTime ?? 0).toLocaleString()}</span
					>
				</p>
				<Button
					action={client.qb.files.del}
					input={{ fileId: file.id }}
					confirm
					successMessage="Deleted"
					class="btn-icon btn-icon-sm ml-1 shrink-0 text-error-600"
				>
					<Trash_2 />
				</Button>
			</li>
		{:else}
			<p class="text-center">{files ? 'No Files' : 'Loading...'}</p>
		{/each}
	</ul>
</div>
