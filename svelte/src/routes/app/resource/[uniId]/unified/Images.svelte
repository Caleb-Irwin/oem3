<script lang="ts">
	import type { Cell } from './types';
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';
	import Image from '$lib/Image.svelte';
	import { imageRedirect } from '$lib/imageRedirector';

	interface Props {
		primary: Cell;
		primaryDescription: Cell;
		other: Cell;
	}

	let { primary, other }: Props = $props();
</script>

<div class="p-2 w-full flex flex-col justify-center">
	<div class="w-full h-full card relative min-h-16">
		{#if primary.value}
			<a
				class="p-2 w-full flex justify-center aspect-square"
				href={imageRedirect(primary.value as string)}
				target="_blank"
				rel="noopener noreferrer"
			>
				<Image src={primary.value as string} alt="" class="rounded p-2 bg-white w-full" />
			</a>
		{/if}
		<div class="flex border-t-2 border-surface-200 p-2 items-center dark:border-surface-500">
			<p class="text-lg font-bold flex-grow pl-1">Primary Image</p>
			<SettingButton cell={primary} />
		</div>
		<Settings cell={primary} extraClass="p-2" />
	</div>

	<div class="mt-2 card">
		{#if other.value}
			<div class=" w-full grid grid-cols-2 p-1 px-2">
				{#each JSON.parse(other.value as string) as img, i}
					<a
						class="w-full flex justify-center py-1 {i % 2 === 0 ? 'pr-1' : 'pl-1'} aspect-square"
						href={imageRedirect(img.url)}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Image
							src={img.url}
							thumbnail
							alt={img.description}
							class="rounded bg-white w-full p-0.5"
						/>
					</a>
				{/each}
			</div>
		{/if}
		<div class="flex p-2 items-center border-t-2 border-surface-200 dark:border-surface-500">
			<p class="text-lg font-bold flex-grow pl-1">Other Images</p>
			<SettingButton cell={other} />
		</div>
		<Settings cell={other} extraClass="p-2" />
	</div>
</div>
