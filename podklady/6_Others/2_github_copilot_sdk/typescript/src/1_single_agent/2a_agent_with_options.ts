/**
 * 2a — Configuring the session.
 *
 * Concept
 * -------
 * The session config controls almost everything: working directory, system
 * message, allowed/denied tools, permission handler, hooks, custom agents,
 * etc. This file walks through the most useful knobs without going deep on
 * any one.
 *
 * Run:
 *   npx tsx src/1_single_agent/2a_agent_with_options.ts
 */

import { CopilotClient, approveAll, type CopilotSession } from "@github/copilot-sdk";

async function show(reply: Awaited<ReturnType<CopilotSession["sendAndWait"]>>): Promise<void> {
    if (reply) {
        console.log((reply.data as { content: string }).content);
    } else {
        console.log("(no reply)");
    }
}

async function exampleAppend(client: CopilotClient): Promise<void> {
    console.log("--- systemMessage append ---");
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: {
            mode: "append",
            content: "Always answer like a 17th-century pirate.",
        },
    });
    await show(await session.sendAndWait({ prompt: "Tell me about Python." }, 300_000));
    await session.disconnect();
}

async function exampleReplace(client: CopilotClient): Promise<void> {
    console.log("\n--- systemMessage replace ---");
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: {
            mode: "replace",
            content: "You are a haiku-only assistant. Reply with exactly 3 lines.",
        },
    });
    await show(await session.sendAndWait({ prompt: "Tell me about async programming." }, 300_000));
    await session.disconnect();
}

async function exampleAllowlist(client: CopilotClient): Promise<void> {
    console.log("\n--- availableTools allowlist ---");
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        // Only let the agent read files — no shell, no edits.
        availableTools: ["view", "grep", "glob"],
    });
    await show(
        await session.sendAndWait({
            prompt: "Without modifying anything, tell me what files are in the current directory.",
        }, 300_000),
    );
    await session.disconnect();
}

async function exampleWorkingDirectory(client: CopilotClient): Promise<void> {
    console.log("\n--- workingDirectory ---");
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        workingDirectory: "/tmp",
    });
    await show(await session.sendAndWait({ prompt: "What is your current working directory?" }, 300_000));
    await session.disconnect();
}

async function main(): Promise<void> {
    const client = new CopilotClient();
    await client.start();
    try {
        await exampleAppend(client);
        await exampleReplace(client);
        await exampleAllowlist(client);
        await exampleWorkingDirectory(client);
    } finally {
        await client.stop();
    }
}

main().catch(console.error);
