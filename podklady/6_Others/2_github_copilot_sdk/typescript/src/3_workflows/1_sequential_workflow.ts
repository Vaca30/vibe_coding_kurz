/**
 * Workflow — Sequential.
 *
 * Concept
 * -------
 * Linear pipeline: research → analyse → summarise. Each stage's output is
 * fed into the next stage's prompt. No branching, no parallelism.
 *
 * Run:
 *   npx tsx src/3_workflows/1_sequential_workflow.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

async function runStage(
    client: CopilotClient,
    rolePrompt: string,
    userPrompt: string,
): Promise<string> {
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: { mode: "replace", content: rolePrompt },
    });
    try {
        const reply = await session.sendAndWait({ prompt: userPrompt }, 300_000);
        return (reply?.data as { content: string })?.content ?? "";
    } finally {
        await session.disconnect();
    }
}

async function main(): Promise<void> {
    const client = new CopilotClient();
    try {
        const topic = "the practical benefits of async/await for I/O-bound Node services";

        console.log("=== stage 1: research ===");
        const findings = await runStage(
            client,
            "You are a research analyst. Produce a dense bullet list of relevant facts.",
            `Research: ${topic}`,
        );
        console.log(findings);

        console.log("\n=== stage 2: analysis ===");
        const analysis = await runStage(
            client,
            "You are a technical analyst. Identify trade-offs, risks, and key insights.",
            `Analyse these findings:\n\n${findings}`,
        );
        console.log(analysis);

        console.log("\n=== stage 3: summary ===");
        const summary = await runStage(
            client,
            "You are an executive writer. Produce a 5-line summary aimed at engineering managers.",
            `Summarise this analysis:\n\n${analysis}`,
        );
        console.log(summary);
    } finally {
        await client.stop();
    }
}

main().catch(console.error);
