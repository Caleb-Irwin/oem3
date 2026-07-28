<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import type { QueryType } from '../../../../server/src/routers/search';
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
	import SearchField from './SearchField.svelte';
	import SearchRes from './SearchRes.svelte';

	interface Props {
		queryType: QueryType;
		queryTypes?: QueryType[];
		placeholder: string;
		class?: string;
	}

	let {
		queryType = $bindable(),
		queryTypes = [queryType],
		placeholder,
		class: wrapperClass = ''
	}: Props = $props();

	let query = $state('');

	const modalStore = getModalStore();
</script>

<Form
	action={{ mutate: client.search.search.query }}
	res={(res) => {
		modalStore.trigger({
			type: 'component',
			component: {
				ref: SearchRes,
				props: {
					searchPages: [res],
					editSearchQuery: (next: { query: string; queryType: QueryType }) => {
						query = next.query;
						queryType = next.queryType;
						modalStore.close();
					}
				}
			}
		});
	}}
	class="mx-auto w-full px-3 {wrapperClass}"
	noReset
>
	<SearchField size="lg" bind:query bind:queryType {queryTypes} {placeholder} />
</Form>
