/** The columns a customer export is expected to carry; anything else email-ish is a bonus. */
export const EXPECTED_EMAIL_COLUMNS = ['Main Email', 'CC Email', 'Alt. Email 1', 'Alt. Email 2'];

export interface EmailExtraction {
	/** Deduped emails in row order, columns left to right within each row. */
	emails: string[];
	/** Headers the emails were taken from, in file order. */
	columns: string[];
	/** Expected headers the file did not have. */
	missingColumns: string[];
	/** Email columns beyond the expected four, which get included anyway. */
	extraColumns: string[];
	rowCount: number;
	/** Entries dropped because an earlier row already had that address. */
	duplicateCount: number;
	/** Problems worth showing the user before they download. */
	warnings: string[];
}

/**
 * Header matching ignores punctuation and casing so "Alt. Email 1", "alt email 1" and
 * "ALT_EMAIL_1" all count as the same column.
 */
const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '');

const isEmailColumn = (header: string) => /email/i.test(header);

/**
 * Turns parsed CSV rows into the flat email list the .txt download holds. Kept free of the
 * DOM and of papaparse so the rules here can be read and tested on their own.
 */
export function extractEmails(
	rows: Record<string, string | undefined>[],
	headers: string[]
): EmailExtraction {
	const columns = headers.filter(isEmailColumn);
	const present = new Set(columns.map(normalizeHeader));
	const missingColumns = EXPECTED_EMAIL_COLUMNS.filter(
		(expected) => !present.has(normalizeHeader(expected))
	);
	const expected = new Set(EXPECTED_EMAIL_COLUMNS.map(normalizeHeader));
	const extraColumns = columns.filter((column) => !expected.has(normalizeHeader(column)));

	const emails: string[] = [];
	const seen = new Set<string>();
	let duplicateCount = 0;

	for (const row of rows)
		for (const column of columns) {
			const email = (row[column] ?? '').trim();
			if (!email) continue;
			const key = email.toLowerCase();
			if (seen.has(key)) {
				duplicateCount++;
				continue;
			}
			seen.add(key);
			emails.push(email);
		}

	const warnings: string[] = [];
	if (columns.length === 0)
		warnings.push(
			'No column with "email" in its name was found, so there is nothing to export. Check that the file has a header row.'
		);
	if (missingColumns.length > 0)
		warnings.push(
			`Missing expected ${missingColumns.length === 1 ? 'column' : 'columns'}: ${missingColumns
				.map((column) => `"${column}"`)
				.join(', ')}.`
		);
	if (columns.length > 0 && emails.length === 0)
		warnings.push('Every email column was empty, so the file would download with no addresses.');

	return {
		emails,
		columns,
		missingColumns,
		extraColumns,
		rowCount: rows.length,
		duplicateCount,
		warnings
	};
}
