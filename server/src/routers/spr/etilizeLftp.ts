const ETILIZE_HOST = 'ftp.etilize.com';
const NETWORK_TIMEOUT_SECONDS = 30;
const MAX_RETRIES = 2;
const PROCESS_TIMEOUT_MS = 30 * 60 * 1000;

export type EtilizeCredentials = {
	user: string;
	password: string;
};

type LftpOperation =
	| { type: 'check'; remotePath: string }
	| { type: 'download'; remotePath: string; localPath: string };

export function getEtilizeCredentials(): EtilizeCredentials {
	const user = process.env['ETILIZE_USER'];
	const password = process.env['ETILIZE_PASSWORD'];

	if (!user || !password) {
		throw new Error('ETILIZE_USER and ETILIZE_PASSWORD must be set for SPR Etilize downloads');
	}

	return { user, password };
}

export function quoteLftpArgument(value: string): string {
	if (/[\0\r\n]/.test(value)) {
		throw new Error('lftp arguments cannot contain NUL or newline characters');
	}

	return `'${value.replaceAll("'", "'\\''")}'`;
}

export function buildLftpScript(credentials: EtilizeCredentials, operation: LftpOperation): string {
	const command =
		operation.type === 'check'
			? `cls --quiet --directory ${quoteLftpArgument(operation.remotePath)}`
			: `get ${quoteLftpArgument(operation.remotePath)} -o ${quoteLftpArgument(operation.localPath)}`;

	return (
		[
			'set cmd:fail-exit true',
			'set cmd:interactive false',
			`set net:timeout ${NETWORK_TIMEOUT_SECONDS}`,
			`set net:max-retries ${MAX_RETRIES}`,
			'set net:reconnect-interval-base 5',
			'set net:reconnect-interval-max 15',
			'set ftp:passive-mode true',
			'set ftp:ssl-allow true',
			'set ftp:ssl-auth TLS',
			'set ftp:ssl-force true',
			'set ftp:ssl-protect-data true',
			'set ftp:ssl-protect-list true',
			'set ftp:ssl-data-use-keys true',
			'set ftp:ssl-use-ccc false',
			'set ssl:verify-certificate true',
			'set ssl:check-hostname true',
			`open --user ${quoteLftpArgument(credentials.user)} --password ${quoteLftpArgument(credentials.password)} ${quoteLftpArgument(`ftp://${ETILIZE_HOST}`)}`,
			command,
			'exit'
		].join('\n') + '\n'
	);
}

export async function checkEtilizeFile(
	credentials: EtilizeCredentials,
	remotePath: string,
	executable = 'lftp'
): Promise<void> {
	await runLftp(credentials, { type: 'check', remotePath }, executable);
}

export async function downloadEtilizeFile(
	credentials: EtilizeCredentials,
	remotePath: string,
	localPath: string,
	executable = 'lftp'
): Promise<void> {
	await runLftp(credentials, { type: 'download', remotePath, localPath }, executable);
}

async function runLftp(
	credentials: EtilizeCredentials,
	operation: LftpOperation,
	executable: string
): Promise<void> {
	const script = buildLftpScript(credentials, operation);
	let subprocess: ReturnType<typeof Bun.spawn>;

	try {
		subprocess = Bun.spawn([executable, '--norc'], {
			stdin: 'pipe',
			stdout: 'pipe',
			stderr: 'pipe',
			env: childEnvironment()
		});
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		if (/executable not found|enoent/i.test(detail)) {
			throw new Error(
				'lftp is required for SPR Etilize downloads but was not found in PATH. ' +
					'Install it with `brew install lftp` on macOS or `sudo apt-get install lftp` on Debian/Ubuntu.'
			);
		}
		throw new Error(`Unable to start lftp for SPR Etilize downloads: ${detail}`);
	}

	const stdout = new Response(subprocess.stdout).text();
	const stderr = new Response(subprocess.stderr).text();
	subprocess.stdin.write(script);
	subprocess.stdin.end();

	let timedOut = false;
	const timeout = setTimeout(() => {
		timedOut = true;
		subprocess.kill();
	}, PROCESS_TIMEOUT_MS);

	const exitCode = await subprocess.exited.finally(() => clearTimeout(timeout));
	const [, errorOutput] = await Promise.all([stdout, stderr]);

	if (timedOut) {
		throw new Error('lftp timed out during an SPR Etilize download');
	}

	if (exitCode !== 0) {
		const safeError = redactSecrets(errorOutput.trim(), credentials).slice(0, 4_000);
		throw new Error(
			`lftp failed during an SPR Etilize download (exit ${exitCode})${safeError ? `: ${safeError}` : ''}`
		);
	}
}

function childEnvironment(): Record<string, string> {
	const environment: Record<string, string> = {
		PATH: process.env['PATH'] ?? '/usr/local/bin:/usr/bin:/bin'
	};

	for (const name of ['LANG', 'LC_ALL', 'SSL_CERT_DIR', 'SSL_CERT_FILE'] as const) {
		const value = process.env[name];
		if (value) environment[name] = value;
	}

	return environment;
}

function redactSecrets(output: string, credentials: EtilizeCredentials): string {
	let redacted = output;
	for (const secret of [credentials.user, credentials.password]) {
		const quotedSecret = quoteLftpArgument(secret);
		redacted = redacted.replaceAll(quotedSecret, '[redacted]');
		redacted = redacted.replaceAll(quotedSecret.slice(1, -1), '[redacted]');
		redacted = redacted.replaceAll(secret, '[redacted]');
	}
	return redacted;
}
