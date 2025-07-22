<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import { focusTrap, getModalStore } from '@skeletonlabs/skeleton';
	import type { QueryType } from '../../../../server/src/routers/search';
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
	import SearchRes from './SearchRes.svelte';
	import { tick } from 'svelte';

	interface Props {
		queryType: QueryType;
		placeholder: string;
		class?: string;
	}

	let props: Props = $props();

	let query = $state(''),
		focus: boolean = $state(false),
		queryType: string | undefined = $state(props.queryType),
		loading = $state(false);

	let inputElement: HTMLInputElement;

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
					editSearchQuery: (res: { query: string }) => {
						focus = false;
						query = res.query;
						modalStore.close();
						tick().then(() => {
							focus = true;
						});
					}
				}
			}
		});
	}}
	class="w-full"
	center
>
	<div class="w-full flex flex-col justify-center content-center items-center {props.class ?? ''}">
		<div class="h-14 form w-full flex max-w-2xl">
			<div class="input-group input-group-divider grid-cols-[1fr_auto]" use:focusTrap={focus}>
				<input
					type="text"
					placeholder={props.placeholder}
					name="query"
					class="pl-4 {loading ? 'text-gray-500' : ''}"
					bind:value={query}
					bind:this={inputElement}
				/>
				<button
					class="variant-filled-primary w-16 {loading ? 'bg-primary-400 dark:bg-primary-800' : ''}"
				>
					<Search />
				</button>
			</div>
		</div>

		<label for="type" class="label hidden">
			<select class="max-w-40 select h-10 ml-2" name="type" value={queryType}>
				<option value={queryType}>QUERY TYPE</option>
			</select>
		</label>
	</div>
</Form>
