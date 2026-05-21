#!/usr/bin/env node
/**
 * Single Thread Example: Capability Discovery
 *
 * Demonstrates how to ask Codex which capabilities are available in the current
 * environment. Skills and plugins are surfaced through Codex slash commands,
 * while subagent roles are queried directly because there is no dedicated
 * slash command for listing configured roles.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { Codex } from "@openai/codex-sdk";
import { codexPathOverride } from "../../helpers.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;

async function main() {
	console.log("=== Capability Discovery Example ===\n");
	console.log(`Working directory: ${projectRoot}`);
	console.log(
		"Asking Codex to list available skills, plugins, and subagent roles...\n",
	);

	const codex = new Codex({ codexPathOverride: codexPathOverride() });

	const runDiscovery = async (title: string, prompt: string) => {
		const thread = codex.startThread({
			skipGitRepoCheck: true,
			workingDirectory: projectRoot,
		});

		const turn = await thread.run(prompt);

		console.log(`=== ${title} ===\n`);
		console.log(`${turn.finalResponse}\n`);

		return turn;
	};

	const turns = await Promise.all([
		runDiscovery("Skills", "/skills"),
		runDiscovery("Plugins", "/plugins"),
		runDiscovery(
			"Subagents",
			[
				"List all configured or available subagent roles in this environment.",
				"For each role, include a short description if one is available.",
				"If no subagent roles are configured, say that explicitly.",
				"Return only the list.",
			].join(" "),
		),
	]);

	for (const [index, turn] of turns.entries()) {
		if (!turn.usage) {
			continue;
		}

		console.log(`Usage ${index + 1}:`);
		console.log(`Input tokens: ${turn.usage.input_tokens}`);
		console.log(`Cached input tokens: ${turn.usage.cached_input_tokens}`);
		console.log(`Output tokens: ${turn.usage.output_tokens}\n`);
	}
}

main().catch(console.error);
