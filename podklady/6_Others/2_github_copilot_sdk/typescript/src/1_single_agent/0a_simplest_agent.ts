/**
 * 0a — The simplest possible Copilot SDK session.
 *
 * Concept
 * -------
 * Spin up a CopilotClient, create a session, send one prompt, print the answer,
 * shut down. No tools, no streaming, no custom config.
 *
 * Run:
 *   npx tsx src/1_single_agent/0a_simplest_agent.ts
 */

import { approveAll, CopilotClient } from "@github/copilot-sdk";

async function main(): Promise<void> {
	const client = new CopilotClient();

	// Sessions are the unit of conversation. They are stateful by default,
	// which is the equivalent of `ClaudeSDKClient` in the Claude Agent SDK.
	const session = await client.createSession({
		onPermissionRequest: approveAll,
	});

	const reply = await session.sendAndWait(
		{ prompt: "What is 2 + 2?" },
		300_000,
	);

	if (reply) {
		// The final assistant message lives on `reply.data.content`.
		console.log((reply.data as { content: string }).content);
	}

	await session.disconnect();
	await client.stop();
}

main().catch(console.error);
