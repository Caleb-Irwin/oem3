<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import SearchField from './SearchField.svelte';
	import { DEFAULT_QUERY_TYPE } from './queryTypes';
	import type { QueryType } from '../../../../server/src/routers/search';

	interface Props {
		query?: string;
		queryType?: QueryType;
	}

	let props: Props = $props();

	let query = $state(props.query ?? ''),
		queryType: QueryType = $state(props.queryType ?? DEFAULT_QUERY_TYPE),
		loading = $state(false);

	afterNavigate(() => (loading = false));
</script>

<form class="w-full max-w-3xl" action="/app/search" onsubmit={() => (loading = true)}>
	<SearchField size="lg" bind:query bind:queryType {loading} />
</form>
