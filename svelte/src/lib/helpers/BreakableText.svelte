<script lang="ts">
	interface Props {
		text: string;
	}
	let { text }: Props = $props();
</script>

{#if text.length <= 20 || text.split(' ').reduce((prev, val) => prev || val.length > 20, true)}
	{text}
{:else}
	{#each text.split(' ') as t}
		{#if t.length > 20}
			<span class="break-all">{t}</span>
		{:else}
			{t}
		{/if}{' '}
	{/each}
{/if}
