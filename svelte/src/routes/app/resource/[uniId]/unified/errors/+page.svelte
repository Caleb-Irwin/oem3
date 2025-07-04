<script lang="ts">
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import CircleAlert from 'lucide-svelte/icons/circle-alert';
	import Info from 'lucide-svelte/icons/info';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';

	// Mock items with errors - each item can have multiple errors
	const mockItems = [
		{
			id: 1,
			name: 'Office Chair Model X1',
			sku: 'CHAIR-X1-001',
			errors: [
				{
					id: 1,
					type: 'validation',
					severity: 'high',
					title: 'Invalid SKU Format',
					description: 'SKU must follow the pattern ABC-123-XYZ',
					field: 'sku',
					value: 'INVALID-SKU',
					timestamp: new Date('2024-01-15T10:30:00Z'),
					source: 'QuickBooks Import'
				},
				{
					id: 2,
					type: 'validation',
					severity: 'high',
					title: 'Duplicate UPC Code',
					description: 'UPC code already exists for another product',
					field: 'upc',
					value: '123456789012',
					timestamp: new Date('2024-01-15T06:30:00Z'),
					source: 'Shopify Sync'
				},
				{
					id: 4,
					type: 'data',
					severity: 'low',
					title: 'Price Discrepancy',
					description: 'Price differs between SPR and QB by more than 5%',
					field: 'price',
					value: '$45.99 vs $48.50',
					timestamp: new Date('2024-01-15T08:45:00Z'),
					source: 'SPR Price File'
				},
				{
					id: 5,
					type: 'image',
					severity: 'medium',
					title: 'Image Not Found',
					description: 'Primary image URL returns 404 error',
					field: 'primaryImage',
					value: 'https://example.com/missing-image.jpg',
					timestamp: new Date('2024-01-15T07:20:00Z'),
					source: 'Enhanced Content'
				}
			]
		},
		{
			id: 2,
			name: 'Standing Desk Pro',
			sku: 'DESK-PRO-500',
			errors: []
		},
		{
			id: 3,
			name: 'Monitor Stand Deluxe',
			sku: 'MON-STAND-DX',
			errors: [
				{
					id: 4,
					type: 'data',
					severity: 'low',
					title: 'Price Discrepancy',
					description: 'Price differs between SPR and QB by more than 5%',
					field: 'price',
					value: '$45.99 vs $48.50',
					timestamp: new Date('2024-01-15T08:45:00Z'),
					source: 'SPR Price File'
				},
				{
					id: 5,
					type: 'image',
					severity: 'medium',
					title: 'Image Not Found',
					description: 'Primary image URL returns 404 error',
					field: 'primaryImage',
					value: 'https://example.com/missing-image.jpg',
					timestamp: new Date('2024-01-15T07:20:00Z'),
					source: 'Enhanced Content'
				}
			]
		}
	];

	// Navigation state - navigating between items
	let currentItemIndex = $state(0);
	const totalItems = mockItems.length;
	let isExpanded = $state(false);

	// Get current item and its errors
	const currentItem = $derived(mockItems[currentItemIndex]);
	const currentErrors = $derived(currentItem?.errors || []);

	// Show collapsed view if more than 3 errors and not expanded
	const visibleErrors = $derived(isExpanded ? currentErrors : currentErrors.slice(0, 2));

	// Navigation functions - for navigating between items
	function goToPrevious() {
		if (currentItemIndex > 0) {
			currentItemIndex--;
			isExpanded = false; // Reset expansion when changing items
		}
	}

	function goToNext() {
		if (currentItemIndex < totalItems - 1) {
			currentItemIndex++;
			isExpanded = false; // Reset expansion when changing items
		}
	}

	// Get severity icon and color
	function getSeverityConfig(severity: string) {
		switch (severity) {
			case 'high':
				return { icon: TriangleAlert, color: 'text-error-600', bgColor: 'variant-ghost-error' };
			case 'medium':
				return { icon: CircleAlert, color: 'text-warning-600', bgColor: 'variant-ghost-warning' };
			case 'low':
				return { icon: Info, color: 'text-secondary-600', bgColor: 'variant-ghost-secondary' };
			default:
				return { icon: Info, color: 'text-surface-600', bgColor: 'variant-ghost' };
		}
	}
</script>

<div class="sticky top-0 z-10 p-2 md:px-4">
	<div class="w-full p-2 card variant-ghost-error backdrop-blur-md relative">
		<div class="flex items-center justify-between p-2">
			<div class="flex items-center space-x-2">
				<h3 class="h3 font-bold">Item Errors</h3>
				<span class="chip variant-glass-error text-sm">
					{currentErrors.length} Issue{currentErrors.length !== 1 ? 's' : ''}
				</span>
			</div>

			<div class="flex flex-wrap items-center gap-x-2 gap-y-2 justify-end">
				<button
					class="btn w-36 variant-soft-surface"
					disabled={currentItemIndex === 0}
					onclick={goToPrevious}
					title="Previous item"
				>
					<ChevronLeft />
					<span class="flex-grow">Previous</span>
				</button>
				<button
					class="btn w-36 {currentErrors.length === 0
						? 'variant-filled-primary'
						: 'variant-soft-surface'}"
					disabled={currentItemIndex === totalItems - 1}
					onclick={goToNext}
					title="Next item"
				>
					<span class="flex-grow">{currentErrors.length === 0 ? 'Continue' : 'Skip'}</span>
					<ChevronRight />
				</button>
			</div>
		</div>

		{#if visibleErrors.length > 0}
			<div class="space-y-1">
				{#each visibleErrors as error (error.id)}
					{@const config = getSeverityConfig(error.severity)}
					<div class="flex items-center space-x-2 px-2 py-1">
						<!-- Error Icon -->
						<div class="{config.color} flex-shrink-0">
							<svelte:component this={config.icon} size="14" />
						</div>

						<!-- Error Content -->
						<div class="flex-grow min-w-0">
							<div class="flex items-center justify-between">
								<div class="flex-grow min-w-0">
									<p class="font-semibold {config.color} text-xs truncate">
										{error.title}
									</p>
									<p class="text-xs text-surface-600 dark:text-surface-300 truncate opacity-75">
										{error.field}: {error.value === null ? 'null' : error.value}
									</p>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Expand/Collapse button positioned absolutely -->
		{#if currentErrors.length > 2}
			<button
				class="btn btn-sm variant-soft-error absolute bottom-2 right-4 z-20"
				onclick={() => (isExpanded = !isExpanded)}
			>
				{#if isExpanded}
					<ChevronUp />
					<span>Show Less</span>
				{:else}
					<ChevronDown />
					<span>Show {currentErrors.length - 2} More</span>
				{/if}
			</button>
		{/if}
	</div>
</div>
