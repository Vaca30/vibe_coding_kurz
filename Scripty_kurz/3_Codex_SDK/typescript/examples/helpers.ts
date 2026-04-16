/**
 * Helper function to get the Codex executable path.
 *
 * Priority:
 * 1. CODEX_EXECUTABLE environment variable
 * 2. Otherwise let the SDK resolve the binary normally
 */
export function codexPathOverride(): string | undefined {
	return process.env.CODEX_EXECUTABLE;
}
