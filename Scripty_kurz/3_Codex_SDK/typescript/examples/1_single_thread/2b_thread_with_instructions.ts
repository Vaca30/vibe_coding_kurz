#!/usr/bin/env node
/**
 * Single Thread Example: Thread with Developer Instructions
 *
 * Demonstrates how to pass developer instructions (system prompts) to the agent
 * using the CodexOptions.config with developer_instructions.
 *
 * This is the Codex equivalent of Claude's systemPrompt option.
 */

import { Codex } from "@openai/codex-sdk";
import { codexPathOverride } from "../helpers.ts";

async function examplePirateAccent() {
	console.log("=== Example 1: Custom Developer Instructions ===\n");

	// Pass developer_instructions via config to set the system prompt
	const codex = new Codex({
		codexPathOverride: codexPathOverride(),
		config: {
			developer_instructions:
				"You are a helpful assistant that always responds in a pirate accent. " +
				"Use nautical terms and pirate slang throughout your responses.",
		},
	});

	const thread = codex.startThread({ skipGitRepoCheck: true });

	const turn = await thread.run("Tell me about TypeScript programming.");

	console.log(`Codex: ${turn.finalResponse}\n`);

	if (turn.usage) {
		console.log(`Input tokens: ${turn.usage.input_tokens}`);
		console.log(`Output tokens: ${turn.usage.output_tokens}`);
	}

	console.log("\n");
}

async function main() {
	await examplePirateAccent();

	console.log("\n=== Developer Instructions Summary ===");
	console.log(
		"- Use CodexOptions.config.developer_instructions for system prompts",
	);
	console.log("- Instructions are inserted as a 'developer' role message");
	console.log(
		"- Instructions persist across all turns from the same Codex client",
	);
	console.log("- Different Codex instances can have different instructions");
}

main().catch(console.error);
