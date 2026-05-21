/**
 * 4c — MCP tools (external).
 *
 * Concept
 * -------
 * Custom tools (4b) live in your process. MCP servers run *out of process*
 * and speak the Model Context Protocol over stdio or HTTP. The Copilot SDK
 * can spawn or connect to them and merge their tools into the session.
 *
 * This example wires up the official Playwright MCP server so the agent can
 * drive a browser. You'll need npx in your PATH.
 *
 * Run:
 *   npx tsx src/1_single_agent/4c_agent_with_mcp_tools.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

async function main(): Promise<void> {
    const client = new CopilotClient();

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        mcpServers: {
            playwright: {
                type: "stdio",
                command: "npx",
                args: ["@playwright/mcp@latest"],
                // "*" exposes every tool; you can also pin to a subset like
                // ["browser_navigate", "browser_snapshot"].
                tools: ["*"],
            },
        },
    });

    const reply = await session.sendAndWait({
        prompt:
            "Open https://example.com, take a snapshot of the page, " +
            "and tell me in one sentence what's on it.",
    }, 300_000);
    if (reply) {
        console.log((reply.data as { content: string }).content);
    }

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
