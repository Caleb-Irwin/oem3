/**
 * Drizzle wraps driver errors in `DrizzleQueryError`, which carries the original
 * Postgres error on `cause` and has no `code` of its own. Walk the cause chain so
 * SQLSTATE checks keep working however deeply the error ends up wrapped.
 */
export function getPgErrorCode(error: unknown): string | undefined {
	let current: unknown = error;
	for (let depth = 0; current !== null && current !== undefined && depth < 10; depth++) {
		const code = (current as { code?: unknown }).code;
		if (typeof code === 'string') return code;
		current = (current as { cause?: unknown }).cause;
	}
	return undefined;
}

/**
 * Best human-readable message for a thrown value.
 *
 * `DrizzleQueryError.message` is the SQL text plus bound parameters — useless in the
 * UI and it leaks query values — while the driver's real message sits on `cause`, so
 * take the innermost one. Also handles plain strings, which `runWorker` rejects with.
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown Error Occurred'): string {
	let current: unknown = error;
	let message = fallback;
	for (let depth = 0; current !== null && current !== undefined && depth < 10; depth++) {
		if (typeof current === 'string') {
			if (current.trim() !== '') message = current;
			break;
		}
		const candidate = (current as { message?: unknown }).message;
		if (typeof candidate === 'string' && candidate.trim() !== '') message = candidate;
		current = (current as { cause?: unknown }).cause;
	}
	return message;
}
