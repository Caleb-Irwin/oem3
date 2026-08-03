import { afterEach, describe, expect, test } from 'bun:test';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { downloadSprFlatFile } from './download';

const testDirectories: string[] = [];

afterEach(() => {
	for (const directory of testDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

describe('SPR flat-file Etilize download', () => {
	test('returns the downloaded CSV as a data URL and removes its temporary file', async () => {
		const directory = mkdtempSync(join(tmpdir(), 'oem3-flat-file-test-'));
		testDirectories.push(directory);
		const executable = join(directory, 'fake-lftp');
		const targetRecord = join(directory, 'download-target');
		const csv = 'ProductId,SKU Type,SKU\n1,Novexco,ABC123\n';

		await Bun.write(
			executable,
			`#!/usr/bin/env bun
const script = await Bun.stdin.text();
const target = script.match(/ -o '([^']+)'/)?.[1];
if (!target) process.exit(2);
await Bun.write(${JSON.stringify(targetRecord)}, target);
await Bun.write(target, ${JSON.stringify(csv)});
`
		);
		chmodSync(executable, 0o700);

		const dataUrl = await downloadSprFlatFile(
			{ user: 'test-user', password: 'test-password' },
			executable
		);

		expect(dataUrl).toBe(`data:text/csv;base64,${Buffer.from(csv).toString('base64')}`);
		const downloadedPath = readFileSync(targetRecord, 'utf8');
		expect(existsSync(downloadedPath)).toBe(false);
	});
});
