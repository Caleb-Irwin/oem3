<script lang="ts">
	import Papa from 'papaparse';
	import Download from 'lucide-svelte/icons/download';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import { downloadTextFile } from '$lib/downloadFile';
	import { EXPECTED_EMAIL_COLUMNS, extractEmails, type EmailExtraction } from './extractEmails';

	let fileName = $state(''),
		parseError: string | null = $state(null),
		parsing = $state(false),
		result: EmailExtraction | null = $state(null);

	/** The download keeps the upload's name so a batch of exports stays tellable apart. */
	const outputName = $derived(`${fileName.replace(/\.csv$/i, '') || 'customers'}.txt`);
	const previewLimit = 10;

	function onFile(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		result = null;
		parseError = null;
		fileName = file?.name ?? '';
		if (!file) return;

		parsing = true;
		Papa.parse<Record<string, string | undefined>>(file, {
			header: true,
			skipEmptyLines: 'greedy',
			transformHeader: (header) => header.trim(),
			complete: ({ data, meta, errors }) => {
				parsing = false;
				result = extractEmails(data, meta.fields ?? []);
				// Papa reports ragged rows per row; one summary line is enough for the user here.
				if (errors.length > 0)
					result.warnings.push(
						`${errors.length} ${errors.length === 1 ? 'row' : 'rows'} did not parse cleanly (first: ${errors[0].message}).`
					);
			},
			error: (error) => {
				parsing = false;
				parseError = error.message;
			}
		});
	}

	function download() {
		if (!result) return;
		downloadTextFile(outputName, result.emails.join('\n') + '\n', 'text/plain');
	}
</script>

<svelte:head>
	<title>OEM3 Customers</title>
</svelte:head>

<div class="mx-auto w-full max-w-2xl space-y-4 p-4">
	<header class="space-y-1">
		<h1 class="h3 font-semibold">Customers</h1>
		<p class="text-sm text-surface-500 dark:text-surface-300">
			Upload a customer CSV to get a .txt of every email address, one per line. Every column with
			"email" in its name is included; duplicates are dropped.
		</p>
	</header>

	<section class="card space-y-3 p-4">
		<label class="label">
			<span>Customer CSV</span>
			<input class="input p-1" type="file" accept=".csv,text/csv" onchange={onFile} />
		</label>

		{#if parsing}
			<p class="text-sm text-surface-500 dark:text-surface-300">Reading {fileName}…</p>
		{/if}

		{#if parseError}
			<aside class="alert variant-ghost-error flex items-start gap-2 p-3 text-sm">
				<TriangleAlert size={18} class="mt-0.5 shrink-0" />
				<span>Could not read that file: {parseError}</span>
			</aside>
		{/if}
	</section>

	{#if result}
		<section class="card space-y-3 p-4">
			<h2 class="font-semibold">{fileName}</h2>

			<p class="text-sm text-surface-500 dark:text-surface-300">
				<span class="font-medium tabular-nums text-surface-700 dark:text-surface-100">
					{result.emails.length.toLocaleString('en-CA')}
				</span>
				{result.emails.length === 1 ? 'email' : 'emails'}
				from
				<span class="font-medium tabular-nums text-surface-700 dark:text-surface-100">
					{result.rowCount.toLocaleString('en-CA')}
				</span>
				{result.rowCount === 1 ? 'row' : 'rows'}
				{#if result.duplicateCount > 0}
					· {result.duplicateCount.toLocaleString('en-CA')} duplicate{result.duplicateCount === 1
						? ''
						: 's'} dropped
				{/if}
			</p>

			{#if result.columns.length > 0}
				<div class="flex flex-wrap items-center gap-1.5">
					{#each result.columns as column (column)}
						<span
							class="badge {result.extraColumns.includes(column)
								? 'variant-soft-secondary'
								: 'variant-soft-primary'}">{column}</span
						>
					{/each}
					{#each result.missingColumns as column (column)}
						<span class="badge variant-soft-warning line-through">{column}</span>
					{/each}
				</div>
			{/if}

			{#each result.warnings as warning (warning)}
				<aside class="alert variant-ghost-warning flex items-start gap-2 p-3 text-sm">
					<TriangleAlert size={18} class="mt-0.5 shrink-0" />
					<span>{warning}</span>
				</aside>
			{/each}

			{#if result.missingColumns.length > 0}
				<p class="text-xs text-surface-500 dark:text-surface-300">
					Expected columns: {EXPECTED_EMAIL_COLUMNS.join(', ')}.
				</p>
			{/if}

			{#if result.emails.length > 0}
				<pre
					class="max-h-60 overflow-auto rounded bg-surface-200/60 p-3 text-xs dark:bg-surface-700">{result.emails
						.slice(0, previewLimit)
						.join('\n')}{result.emails.length > previewLimit
						? `\n… and ${(result.emails.length - previewLimit).toLocaleString('en-CA')} more`
						: ''}</pre>

				<button class="btn variant-ghost-primary w-full gap-2" onclick={download}>
					<Download size={18} />
					Download {outputName}
				</button>
			{/if}
		</section>
	{/if}
</div>
