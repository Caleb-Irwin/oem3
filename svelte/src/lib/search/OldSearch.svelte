<script lang="ts">
	import { client } from '../client';
	import Form from '../Form.svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import SearchRes from './SearchRes.svelte';
	import SearchField from './SearchField.svelte';
	import { onMount, tick } from 'svelte';
	import type { QueryType } from '../../../../server/src/routers/search';
	import type { SelectFunc } from '$lib/ItemRow.svelte';

	interface Props {
		select?: undefined | SelectFunc;
		quickAdd?: boolean;
		quickAddQueryType?: QueryType;
		initQuery?: string;
		altRes?: (res: Awaited<ReturnType<typeof client.search.search.query>>) => void;
		size?: 'sm' | 'lg';
		/** Overrides the form wrapper, whose default centres the field at a readable width. */
		class?: string;
		/** Overrides the prompt in the field, which otherwise reflects `quickAdd`. */
		placeholder?: string;
	}

	let {
		select = undefined,
		quickAdd = false,
		quickAddQueryType = 'all',
		initQuery = '',
		altRes,
		size,
		class: className = 'mx-auto min-w-0 w-full max-w-3xl',
		placeholder
	}: Props = $props();

	const modalStore = getModalStore();
	const fieldSize = $derived(size ?? (quickAdd ? 'sm' : 'lg'));
	let query = $state(initQuery),
		queryType: QueryType = $state(quickAdd ? quickAddQueryType : 'all'),
		formRef: { submit?: () => void } | undefined = $state();

	const response = async (previous: { query: string; queryType: QueryType }) => {
		if (!previous) return;
		query = previous.query;
		queryType = previous.queryType;
		await tick();
	};

	onMount(async () => {
		if (initQuery.trim().length > 0) {
			await tick();
			formRef?.submit?.();
		}
	});
</script>

<Form
	bind:this={formRef}
	action={{ mutate: client.search.search.query }}
	res={(res) => {
		if (altRes) return altRes(res);
		modalStore.trigger({
			type: 'component',
			response,
			component: {
				ref: SearchRes,
				props: {
					searchPages: [res],
					select,
					editSearchQuery: (next: { query: string; queryType: QueryType }) => {
						query = next.query;
						queryType = next.queryType;
						modalStore.close();
					}
				}
			}
		});
	}}
	class={className}
	noReset
>
	<SearchField
		size={fieldSize}
		bind:query
		bind:queryType
		queryTypes={quickAdd ? [quickAddQueryType] : undefined}
		placeholder={placeholder ?? (quickAdd ? 'Quick Add' : 'Search items…')}
	/>
</Form>
