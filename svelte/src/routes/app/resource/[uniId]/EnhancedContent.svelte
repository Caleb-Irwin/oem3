<script lang="ts">
	import { client, query } from '$lib/client';
	import CopyableText from '$lib/helpers/CopyableText.svelte';
	import Image from '$lib/Image.svelte';

	interface Props {
		etilizeId: string | undefined;
		gid: string | undefined;
	}
	let { etilizeId, gid }: Props = $props();

	const res = query(client.resources.sprEnhancedContent, { etilizeId, gid });
</script>

{#if $res}
	<div class="pt-2 w-full">
		<div
			class="flex flex-col rounded p-0.5 border-2 text-primary-800 dark:text-primary-200 border-primary-300 bg-primary-300 dark:border-primary-800 dark:bg-primary-800"
		>
			<p class="font-bold text-lg text-center py-0.5">Enhanced Content</p>
			{#if $res.spr}
				<h2 class="p-0.5 h2 font-semibold flex flex-wrap justify-center w-full">
					{#if $res.spr.sprc}
						<span class="cursor-default chip text-md variant-soft-tertiary m-1">
							SPRC: <CopyableText text={$res.spr.sprc} />
						</span>
					{/if}
					{#if $res.spr.cws}
						<span class="cursor-default chip text-md variant-soft-tertiary m-1">
							CWS: <CopyableText text={$res.spr.cws} />
						</span>
					{/if}
					{#if $res.spr.upc}
						<span class="cursor-default chip text-md variant-soft-tertiary m-1">
							UPC: <CopyableText text={$res.spr.upc} />
						</span>
					{/if}
					{#if $res.spr.gtin}
						<span class="cursor-default chip text-md variant-soft-tertiary m-1">
							GTIN: <CopyableText text={$res.spr.gtin} />
						</span>
					{/if}
				</h2>
			{:else}
				<p class="p-1">{@html $res.guild?.sanitizedDescription}</p>
			{/if}

			<a
				class="grid place-content-center p-0.5"
				href={$res.spr
					? `https://content.etilize.com/${$res.spr.primaryImage}/${etilizeId}.jpg`
					: JSON.parse($res.guild?.imageListJSON ?? '[]')[0]}
				target="_blank"
			>
				<Image
					src={$res.spr
						? `https://content.etilize.com/${$res.spr.primaryImage}/${etilizeId}.jpg`
						: JSON.parse($res.guild?.imageListJSON ?? '[]')[0]}
					alt=""
					class="rounded p-1 bg-white w-full"
				/>
			</a>
			<div class="w-full grid grid-cols-2">
				{#each $res.spr ? JSON.parse($res.spr.otherImagesJsonArr ?? '[]') : $res.guild ? JSON.parse($res.guild.imageListJSON ?? '[]').slice(1) : [] as image}
					<a
						class="p-0.5 w-full flex justify-center"
						href={$res.spr ? `https://content.etilize.com/${image}/${etilizeId}.jpg` : image}
						target="_blank"
					>
						<Image
							src={$res.spr ? `https://content.etilize.com/${image}/${etilizeId}.jpg` : image}
							thumbnail
							alt=""
							class="rounded bg-white w-full"
						/>
					</a>
				{/each}
			</div>
		</div>
	</div>
{/if}
