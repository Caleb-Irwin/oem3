<script lang="ts">
	import type { Cell } from './types';
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';
	import Image from '$lib/Image.svelte';
	import { imageRedirect } from '$lib/imageRedirector';
	import NullableText from './NullableText.svelte';

	interface Props {
		primary: Cell;
		primaryDescription: Cell;
		other: Cell;
	}

	let { primary, primaryDescription, other }: Props = $props();
</script>

<div class="p-2 w-full flex flex-col justify-center">
	<div class="w-full h-full card relative min-h-16">
		{@render primaryImageRenderer(primary.value)}

		<div class="flex flex-row flex-wrap">
			<div class="flex flex-1 p-2 items-center pt-1">
				<p class="text-lg font-bold flex-grow pl-1">Primary Image</p>
				<SettingButton cell={primary} />
			</div>

			<div class="flex flex-1 p-2 items-center pt-1">
				<p class="text-lg font-bold flex-grow pl-1">Description</p>
				<SettingButton cell={primaryDescription} />
			</div>
		</div>

		<Settings cell={primary} valueRenderer={primaryImageRenderer} extraClass="p-1 pt-0" />
		<Settings
			cell={primaryDescription}
			valueRenderer={primaryImageDescriptionRenderer}
			extraClass="p-1 pt-0"
		/>
	</div>

	<div class="mt-2 card">
		{@render otherImageRenderer(other.value)}
		<div
			class="flex p-2 items-center {other.value && JSON.parse(other.value as string).length > 0
				? 'pt-1'
				: ''}"
		>
			<p class="text-lg font-bold flex-grow pl-1">Other Images</p>
			<SettingButton cell={other} />
		</div>
		<Settings cell={other} extraClass="p-1" valueRenderer={otherImageRenderer} />
	</div>
</div>

{#snippet primaryImageRenderer(value: string | number | boolean | null)}
	{#if value}
		<a
			class="p-2 w-full flex justify-center aspect-square"
			href={imageRedirect(value as string)}
			target="_blank"
			rel="noopener noreferrer"
		>
			<Image
				src={value as string}
				alt={primaryDescription.value?.toString() ?? ''}
				class="rounded p-2 bg-white w-full"
			/>
		</a>
	{/if}
{/snippet}

{#snippet primaryImageDescriptionRenderer(value: string | number | boolean | null)}
	<p class="text-lg">
		<NullableText text={value === null ? 'Null' : value} />
	</p>
{/snippet}

{#snippet otherImageRenderer(value: string | number | boolean | null)}
	{#if value}
		<div class=" w-full grid grid-cols-2 p-1 px-2">
			{#each JSON.parse(value as string) as img, i}
				<a
					class="w-full flex justify-center py-1 {i % 2 === 0 ? 'pr-1' : 'pl-1'} aspect-square"
					href={imageRedirect(img.url)}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Image
						src={img.url}
						thumbnail={primary.compoundId.split(':')[0] === 'unifiedGuild'}
						alt={img.description}
						class="rounded bg-white w-full p-0.5"
					/>
				</a>
			{/each}
		</div>
	{/if}
{/snippet}
