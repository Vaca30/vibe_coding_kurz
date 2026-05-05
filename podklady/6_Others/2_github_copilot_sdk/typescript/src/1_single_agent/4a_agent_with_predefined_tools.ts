/**
 * 4a — Predefined tools.
 *
 * Concept
 * -------
 * The Copilot CLI ships with a generous set of built-in tools (file ops,
 * shell, search, etc.). By default the SDK runs in "approve-all" mode, but
 * you usually want to scope what the agent can touch via `availableTools`
 * (allowlist) or `excludedTools` (blocklist).
 *
 * This example also shows how to *observe* tool calls in real time by
 * subscribing to `tool.execution_start` events.
 *
 * Run:
 *   npx tsx src/1_single_agent/4a_agent_with_predefined_tools.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

async function main(): Promise<void> {
    const client = new CopilotClient();

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        availableTools: ["bash", "view", "edit", "write", "grep", "glob"],
    });

    session.on("tool.execution_start", (event) => {
        const args = event.data.arguments ?? {};
        console.log(`  [tool] ${event.data.toolName}(${JSON.stringify(args)})`);
    });

    session.on("assistant.message", (event) => {
        console.log(`  [assistant] ${event.data.content}`);
    });

    console.log("> Create /tmp/copilot_demo.txt with 'hello from copilot'.");
    await session.sendAndWait({
        prompt:
            "Create a file at /tmp/copilot_demo.txt containing the text 'hello from copilot'.",
    }, 300_000);

    console.log("\n> Read it back.");
    await session.sendAndWait({
        prompt: "Now read /tmp/copilot_demo.txt and tell me what's inside.",
    }, 300_000);

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
