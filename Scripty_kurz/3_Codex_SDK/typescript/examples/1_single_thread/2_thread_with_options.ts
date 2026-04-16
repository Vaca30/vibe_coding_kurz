#!/usr/bin/env node

/**
 * Single Thread Example: Thread with Options
 *
 * Demonstrates using ThreadOptions to configure the thread with:
 * - Model selection
 * - Sandbox mode
 * - Model reasoning effort
 * - Approval policy
 * - Network access and web search
 */

import { Codex } from "@openai/codex-sdk";
import { codexPathOverride } from "../helpers.ts";

async function exampleCombinedOptions() {
	console.log("=== Example 4: Combined Options ===\n");

	const codex = new Codex({ codexPathOverride: codexPathOverride() });

	// Combine multiple options
	const thread = codex.startThread({
		model: "o4-mini",
		sandboxMode: "read-only",
		modelReasoningEffort: "medium",
		approvalPolicy: "never",
		skipGitRepoCheck: true,
	});

	const turn = await thread.run(
		"Explain what ThreadOptions configuration is in 2 sentences.",
	);

	console.log(`Codex: ${turn.finalResponse}\n`);

	if (turn.usage) {
		console.log(`Input tokens: ${turn.usage.input_tokens}`);
		console.log(`Output tokens: ${turn.usage.output_tokens}`);
	}

	console.log("\n");
}

async function main() {
	await exampleCombinedOptions();
}

main().catch(console.error);
