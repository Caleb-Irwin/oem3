import { describe, expect, test } from 'bun:test';
import { chmodSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildLftpScript, downloadEtilizeFile, quoteLftpArgument } from './lftp';

describe('SPR enhanced-content lftp transport', () => {
	test('quotes lftp arguments without allowing command injection', () => {
		expect(quoteLftpArgument("spaces ' ; $HOME \\ value")).toBe("'spaces '\\'' ; $HOME \\ value'");
		expect(() => quoteLftpArgument('line\nbreak')).toThrow('newline');
	});

	test('builds an explicit, verified FTPS script with bounded retries', () => {
		const script = buildLftpScript(
			{ user: "user'name", password: 'pa ss;$word' },
			{ type: 'download', remotePath: '/remote/file.zip', localPath: '/tmp/file.zip' }
		);

		expect(script).toContain('set ftp:passive-mode true');
		expect(script).toContain('set ftp:ssl-force true');
		expect(script).toContain('set ftp:ssl-protect-data true');
		expect(script).toContain('set ftp:ssl-data-use-keys true');
		expect(script).toContain('set ftp:ssl-use-ccc false');
		expect(script).toContain('set ssl:verify-certificate true');
		expect(script).toContain('set ssl:check-hostname true');
		expect(script).toContain('set net:timeout 30');
		expect(script).toContain('set net:max-retries 2');
		expect(script).toContain("--user 'user'\\''name'");
		expect(script).toContain("--password 'pa ss;$word'");
		expect(script).toContain("get '/remote/file.zip' -o '/tmp/file.zip'");
	});

	test('reports a missing lftp executable with installation guidance', async () => {
		await expect(
			downloadEtilizeFile(
				{ user: 'user', password: 'password' },
				'/remote/file.zip',
				'/tmp/file.zip',
				'definitely-missing-oem3-lftp'
			)
		).rejects.toThrow('Install it with `brew install lftp`');
	});

	test('propagates a non-zero lftp exit', async () => {
		await expect(
			downloadEtilizeFile(
				{ user: 'user', password: 'password' },
				'/remote/file.zip',
				'/tmp/file.zip',
				'/usr/bin/false'
			)
		).rejects.toThrow('exit 1');
	});

	test('keeps credentials out of argv and redacts them from failures', async () => {
		const directory = mkdtempSync(join(tmpdir(), 'oem3-lftp-test-'));
		const executable = join(directory, 'fake-lftp');
		await Bun.write(
			executable,
			'#!/bin/sh\ncat >/dev/null\nprintf "argv=%s; user=odd-user; password=odd-password" "$*" >&2\nexit 7\n'
		);
		chmodSync(executable, 0o700);

		try {
			await downloadEtilizeFile(
				{ user: 'odd-user', password: 'odd-password' },
				'/remote/file.zip',
				'/tmp/file.zip',
				executable
			);
			expect.unreachable();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			expect(message).toContain('exit 7');
			expect(message).toContain('argv=--norc');
			expect(message).not.toContain('odd-user');
			expect(message).not.toContain('odd-password');
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});
