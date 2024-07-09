<script lang="ts">
	import CircleAlert from 'lucide-svelte/icons/circle-alert';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import { ProgressBar } from '@skeletonlabs/skeleton';
	import type { Readable } from 'svelte/store';

	export let status: Readable<
		| {
				message: string;
				error: boolean;
				running: boolean;
				progress: number;
		  }
		| undefined
	>;
</script>

<div class="card p-4">
	<div class="flex items-center">
		<h4 class="pr-2 h4 font-semibold">Worker</h4>

		{#if $status?.error}
			<div class="text-error-600">
				<CircleAlert height="28px" />
			</div>
		{:else if $status?.running}
			<div class="animate-spin text-primary-600">
				<LoaderCircle height="28px" />
			</div>
		{:else}
			<div class="text-primary-600">
				<CircleCheck height="28px" />
			</div>
		{/if}
	</div>
	{#if $status?.running}
		<div class="py-2">
			<ProgressBar
				meter="bg-primary-500"
				value={$status.progress >= 0 ? $status.progress * 100 : 0}
			/>
		</div>
	{:else}
		<p class="">
			{$status?.message ?? 'Loading...'}
		</p>
	{/if}
</div>
