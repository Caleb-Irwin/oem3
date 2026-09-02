<script lang="ts">
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import ClipboardPenLine from 'lucide-svelte/icons/clipboard-pen-line';
	import Send from 'lucide-svelte/icons/send';
	import type { OrderPlannerOrder } from './types';

	interface Props {
		status: OrderPlannerOrder['status'];
		onChange: (status: OrderPlannerOrder['status']) => void;
	}

	let { status, onChange }: Props = $props();

	const steps = [
		{
			status: 'draft' as const,
			label: '1. Open',
			hint: 'Still being prepared',
			icon: ClipboardPenLine,
			activeClass:
				'border-warning-500 bg-warning-100 text-warning-950 ring-1 ring-warning-500 dark:bg-warning-900/40 dark:text-warning-50'
		},
		{
			status: 'sent' as const,
			label: '2. Sent',
			hint: 'Sent to the vendor',
			icon: Send,
			activeClass:
				'border-primary-500 bg-primary-100 text-primary-950 ring-1 ring-primary-500 dark:bg-primary-900/40 dark:text-primary-50'
		},
		{
			status: 'completed' as const,
			label: '3. Completed',
			hint: 'Finished and saved in history',
			icon: CircleCheck,
			activeClass:
				'border-success-500 bg-success-100 text-success-950 ring-1 ring-success-500 dark:bg-success-900/40 dark:text-success-50'
		}
	];
</script>

<div class="mt-4 border-t border-surface-200 pt-4 dark:border-surface-700">
	<h3 class="font-semibold">Change order status</h3>
	<p class="mt-0.5 text-sm text-surface-600 dark:text-surface-300">
		Choose the step that matches what has happened with this order.
	</p>
	<div class="mt-3 grid gap-2 sm:grid-cols-3">
		{#each steps as step (step.status)}
			{@const active = status === step.status}
			<button
				class="rounded-lg border p-3 text-left transition {active
					? step.activeClass
					: 'border-surface-300 hover:bg-surface-100 dark:border-surface-600 dark:hover:bg-surface-700'}"
				onclick={() => onChange(step.status)}
				aria-pressed={active}
			>
				<span class="flex items-center gap-2 font-semibold">
					<step.icon size={18} />
					{step.label}
				</span>
				<span class="mt-1 block text-xs opacity-80">{step.hint}</span>
			</button>
		{/each}
	</div>
</div>
