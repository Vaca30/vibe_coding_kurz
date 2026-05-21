/**
 * 5 — Session memory (and how to persist it across runs).
 *
 * Concept
 * -------
 * A `CopilotSession` retains conversation history within its lifetime.
 * Better still, the SDK persists every session to disk: you can list past
 * sessions and resume any of them later — even in a fresh process — with
 * `client.resumeSession(...)`.
 *
 * Run:
 *   npx tsx src/1_single_agent/5_agent_with_memory.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

async function main(): Promise<void> {
    const client = new CopilotClient();

    // ---- Phase 1: multi-turn within one live session ---------------------
    const session = await client.createSession({
        onPermissionRequest: approveAll,
    });
    const sessionId = session.sessionId;
    console.log(`Session id: ${sessionId}\n`);

    let reply = await session.sendAndWait({ prompt: "My favourite colour is teal." }, 300_000);
    console.log(`A1: ${(reply?.data as { content: string })?.content ?? "(no reply)"}\n`);

    reply = await session.sendAndWait({
        prompt: "What did I just tell you was my favourite colour?",
    }, 300_000);
    console.log(`A2: ${(reply?.data as { content: string })?.content ?? "(no reply)"}\n`);

    // Disconnect releases in-memory resources but keeps the on-disk history.
    await session.disconnect();

    // ---- Phase 2: resume the same session -------------------------------
    console.log("\nResuming the same session by id...\n");
    const resumed = await client.resumeSession(sessionId, {
        onPermissionRequest: approveAll,
    });

    reply = await resumed.sendAndWait({
        prompt: "Suggest a colour that pairs well with the favourite I told you earlier.",
    }, 300_000);
    console.log(`A3: ${(reply?.data as { content: string })?.content ?? "(no reply)"}\n`);

    await resumed.disconnect();
    await client.stop();
}

main().catch(console.error);
