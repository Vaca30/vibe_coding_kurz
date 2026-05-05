import { spawnSync } from "node:child_process";

/**
 * Helper function to get the Codex executable path.
 *
 * Priority:
 * 1. CODEX_EXECUTABLE environment variable
 * 2. A `codex` executable available on PATH
 * 3. Otherwise let the SDK resolve the binary normally
 */
export function codexPathOverride(): string | undefined {
	if (process.env.CODEX_EXECUTABLE) {
		return process.env.CODEX_EXECUTABLE;
	}

	const probe = spawnSync("codex", ["--version"], {
		stdio: "ignore",
	});

	if (!probe.error && probe.status === 0) {
		return "codex";
	}

	return undefined;
}
