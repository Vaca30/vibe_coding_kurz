/**
 * Workflow — Loop with quality gating.
 *
 * Concept
 * -------
 * Generator → evaluator → (refine if score < threshold) → evaluator → ...
 *
 * The evaluator emits a structured response (SCORE, ACCEPTABLE, FEEDBACK)
 * which the orchestration code parses to decide whether to refine or stop.
 *
 * Run:
 *   npx tsx src/3_workflows/4_loop_workflow.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

const GENERATOR =
    "You are a technical writer. Produce a short introduction (max 150 words) " +
    "to machine learning aimed at absolute beginners. Avoid jargon.";

const EVALUATOR =
    "You are a strict editor. Score the candidate text against these criteria:\n" +
    "  1) under 150 words\n" +
    "  2) accessible language (no unexplained jargon)\n" +
    "  3) at least one concrete real-world example\n" +
    "  4) engaging opening line\n\n" +
    "Reply in EXACTLY this format:\n" +
    "  SCORE: <0-100>\n" +
    "  ACCEPTABLE: YES|NO\n" +
    "  FEEDBACK: <one paragraph of actionable feedback>";

const REFINER =
    "You are a careful reviser. Given the current draft and the editor's " +
    "feedback, produce an improved draft. Preserve the core message; do not " +
    "rewrite from scratch.";

const THRESHOLD = 80;
const MAX_ITERATIONS = 5;

function parseEvaluation(text: string): { score: number; acceptable: boolean; feedback: string } {
    const score = Number(text.match(/SCORE:\s*(\d+)/)?.[1] ?? 0);
    const acceptable = /ACCEPTABLE:\s*YES/i.test(text);
    const feedback = text.match(/FEEDBACK:\s*([\s\S]+)/)?.[1]?.trim() ?? "";
    return { score, acceptable, feedback };
}

async function oneShot(client: CopilotClient, system: string, user: string): Promise<string> {
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: { mode: "replace", content: system },
    });
    try {
        const reply = await session.sendAndWait({ prompt: user }, 300_000);
        return (reply?.data as { content: string })?.content ?? "";
    } finally {
        await session.disconnect();
    }
}

async function main(): Promise<void> {
    const client = new CopilotClient();
    try {
        console.log("=== iteration 1: initial draft ===");
        let draft = await oneShot(client, GENERATOR, "Write the intro now.");
        console.log(draft);

        let i = 2;
        for (; i <= MAX_ITERATIONS; i++) {
            console.log(`\n=== iteration ${i}: evaluation ===`);
            const evaluation = await oneShot(client, EVALUATOR, `Candidate text:\n\n${draft}`);
            console.log(evaluation);
            const { score, acceptable, feedback } = parseEvaluation(evaluation);

            if (acceptable || score >= THRESHOLD) {
                console.log(`\n[stopping — score=${score} acceptable=${acceptable}]`);
                break;
            }

            console.log(`\n=== iteration ${i}: refinement (score=${score}) ===`);
            draft = await oneShot(
                client,
                REFINER,
                `Current draft:\n\n${draft}\n\nEditor feedback:\n${feedback}`,
            );
            console.log(draft);
        }
        if (i > MAX_ITERATIONS) {
            console.log(`\n[hit MAX_ITERATIONS=${MAX_ITERATIONS}, stopping]`);
        }

        console.log("\n=== final draft ===");
        console.log(draft);
    } finally {
        await client.stop();
    }
}

main().catch(console.error);
