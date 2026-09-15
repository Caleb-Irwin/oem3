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
