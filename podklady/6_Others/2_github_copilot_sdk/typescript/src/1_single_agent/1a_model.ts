/**
 * 1a — Pick a model.
 *
 * Concept
 * -------
 * List the models the Copilot CLI exposes, then create a session pinned to a
 * specific one. Sessions can also switch models mid-conversation via
 * `session.setModel(...)`.
 *
 * Run:
 *   npx tsx src/1_single_agent/1a_model.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

async function main(): Promise<void> {
    const client = new CopilotClient();
    await client.start();

    // Discover what's available at runtime (depends on your subscription).
    const models = await client.listModels();
    console.log("Available models:");
    for (const m of models) {
        console.log(`  - ${m.id}  (${m.name ?? ""})`);
    }
    console.log();

    // Pick one — adjust if the id below isn't in your account.
    const chosen = models.some((m) => m.id === "gpt-4.1") ? "gpt-4.1" : models[0].id;
    console.log(`Using model: ${chosen}\n`);

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        model: chosen,
    });

    let reply = await session.sendAndWait({ prompt: "What is 2 + 2?" }, 300_000);
    console.log(`Q1: ${(reply?.data as { content: string })?.content ?? "(no reply)"}\n`);

    // Sessions retain history, so "that result" works.
    reply = await session.sendAndWait({ prompt: "Double that result." }, 300_000);
    console.log(`Q2: ${(reply?.data as { content: string })?.content ?? "(no reply)"}\n`);

    // Models can be switched without losing conversation history.
    if (models.some((m) => m.id === "gpt-5")) {
        await session.setModel("gpt-5");
        reply = await session.sendAndWait({ prompt: "And one more time, double again." }, 300_000);
        console.log(`Q3: ${(reply?.data as { content: string })?.content ?? "(no reply)"}\n`);
    }

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
