/**
 * Workflow — Parallel (fan-out / fan-in).
 *
 * Concept
 * -------
 * Four specialists examine the same brief independently and concurrently. A
 * synthesis step then merges their reports into a single coherent output.
 *
 * Run:
 *   npx tsx src/3_workflows/2_parallel_workflow.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

const SPECIALISTS: Record<string, string> = {
    technical: "You are a technical lead. Focus on architecture, scaling, and engineering risk.",
    business:  "You are a business analyst. Focus on ROI, cost, and time-to-market.",
    security:  "You are a security architect. Focus on threats, attack surface, and compliance.",
    ux:        "You are a UX designer. Focus on user impact, accessibility, and DX.",
};

async function runSpecialist(
    client: CopilotClient,
    name: string,
    prompt: string,
    brief: string,
): Promise<[string, string]> {
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: { mode: "replace", content: prompt },
    });
    try {
        const reply = await session.sendAndWait({ prompt: brief }, 300_000);
        return [name, (reply?.data as { content: string })?.content ?? ""];
    } finally {
        await session.disconnect();
    }
}

async function main(): Promise<void> {
    const brief =
        "Our team is considering adopting AI-assisted code generation across the " +
        "engineering org. Give me your perspective in 5–7 bullets.";

    const client = new CopilotClient();
    try {
        // Fan out — all four specialists run concurrently.
        const results = await Promise.all(
            Object.entries(SPECIALISTS).map(([name, prompt]) =>
                runSpecialist(client, name, prompt, brief),
            ),
        );

        for (const [name, content] of results) {
            console.log(`\n=== ${name} ===\n${content}`);
        }

        // Fan in — synthesis stage.
        const joined = results.map(([n, c]) => `### ${n}\n${c}`).join("\n\n");
        const synth = await client.createSession({
            onPermissionRequest: approveAll,
            systemMessage: {
                mode: "replace",
                content:
                    "You are a chief of staff. Merge multiple specialist reports into " +
                    "one balanced executive summary (≤200 words).",
            },
        });
        try {
            console.log("\n=== synthesis ===");
            const reply = await synth.sendAndWait({ prompt: joined }, 300_000);
            console.log((reply?.data as { content: string })?.content ?? "(no reply)");
        } finally {
            await synth.disconnect();
        }
    } finally {
        await client.stop();
    }
}

main().catch(console.error);
