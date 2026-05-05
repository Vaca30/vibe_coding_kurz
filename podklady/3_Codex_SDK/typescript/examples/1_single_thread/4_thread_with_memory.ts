#!/usr/bin/env node
/**
 * Single Thread Example: Thread with Memory (Multi-Turn Conversations)
 *
 * Demonstrates continuing conversations on the same thread - the agent remembers
 * previous exchanges and can reference them in subsequent turns.
 */

import { Codex } from "@openai/codex-sdk";
import { codexPathOverride } from "../helpers.ts";

async function exampleConversationMemory() {
	console.log("=== Example 1: Conversation with Memory ===\n");

	const codex = new Codex({ codexPathOverride: codexPathOverride() });
	const thread = codex.startThread({ skipGitRepoCheck: true });

	// Turn 1: Tell the agent something to remember
	console.log("User: My favorite color is blue.\n");
	const turn1 = await thread.run("My favorite color is blue.");
	console.log(`Codex: ${turn1.finalResponse}\n`);

	// Turn 2: Ask about what we just said
	console.log("User: What color did I just tell you about?\n");
	const turn2 = await thread.run("What color did I just tell you about?");
	console.log(`Codex: ${turn2.finalResponse}\n`);

	// Turn 3: Build on the conversation
	console.log("User: Can you suggest a complementary color to my favorite?\n");
	const turn3 = await thread.run(
		"Can you suggest a complementary color to my favorite?",
	);
	console.log(`Codex: ${turn3.finalResponse}\n`);

	// Print total usage
	const totalInput =
		(turn1.usage?.input_tokens ?? 0) +
		(turn2.usage?.input_tokens ?? 0) +
		(turn3.usage?.input_tokens ?? 0);
	const totalOutput =
		(turn1.usage?.output_tokens ?? 0) +
		(turn2.usage?.output_tokens ?? 0) +
		(turn3.usage?.output_tokens ?? 0);
	console.log(`Total input tokens: ${totalInput}`);
	console.log(`Total output tokens: ${totalOutput}`);
	console.log(`Total turns: 3`);
	console.log("\n");
}

async function main() {
	await exampleConversationMemory();

	console.log("\n=== Memory Examples Summary ===");
	console.log("- Multi-turn conversations on the same thread");
	console.log("- Context retention across turns");
	console.log("- Progressive refinement of responses");
	console.log("- Building on previous responses");
}

main().catch(console.error);
