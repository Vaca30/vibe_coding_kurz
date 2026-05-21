/**
 * 7 — Custom (sub-)agents.
 *
 * Concept
 * -------
 * A "custom agent" is a specialised persona attached to a session: its own
 * prompt, its own tool allowlist, optionally its own MCP servers. The runtime
 * selects the best one for a given task based on each agent's `description`,
 * or you can pin one with the `agent` parameter.
 *
 * This is the Copilot SDK equivalent of `AgentDefinition` in the Claude
 * Agent SDK.
 *
 * Run:
 *   npx tsx src/1_single_agent/7_agent_with_subagents.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

const CUSTOM_AGENTS = [
    {
        name: "code-reviewer",
        displayName: "Code Reviewer",
        description:
            "Reviews source files for bugs, security issues, and style problems. " +
            "Read-only — never modifies files.",
        tools: ["view", "grep", "glob"],
        prompt:
            "You are a senior code reviewer. Read the relevant files, then give a " +
            "bullet list of issues in order of severity (critical → minor). Do not " +
            "modify anything.",
    },
    {
        name: "doc-writer",
        displayName: "Documentation Writer",
        description: "Writes or updates Markdown documentation.",
        tools: ["view", "edit", "write", "glob"],
        prompt:
            "You are a technical writer. Produce clear, concise Markdown. " +
            "Each section has a heading; examples use fenced code blocks.",
    },
    {
        name: "test-writer",
        displayName: "Test Writer",
        description: "Generates jest test cases for TypeScript source files.",
        tools: ["view", "edit", "write", "glob"],
        prompt:
            "You are a TypeScript testing expert. Produce small, fast jest tests " +
            "that cover happy path and at least one edge case.",
    },
];

async function main(): Promise<void> {
    const client = new CopilotClient();

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        customAgents: CUSTOM_AGENTS,
    });

    session.on("subagent.selected", (event) => {
        console.log(`  [router] selected sub-agent: ${event.data.agentDisplayName}`);
    });
    session.on("subagent.started", (event) => {
        console.log(`  [router] sub-agent started: ${event.data.agentDisplayName}`);
    });
    session.on("assistant.message", (event) => {
        console.log(`  [assistant] ${event.data.content}`);
    });

    console.log("> Asking for a code review (should pick code-reviewer):");
    await session.sendAndWait({
        prompt:
            "Review the file src/1_single_agent/4b_agent_with_custom_tools.ts and " +
            "list any issues you find.",
    }, 300_000);

    console.log("\n> Asking for tests (should pick test-writer):");
    await session.sendAndWait({
        prompt:
            "Write a couple of jest tests for the `add` tool defined in " +
            "src/1_single_agent/4b_agent_with_custom_tools.ts.",
    }, 300_000);

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
