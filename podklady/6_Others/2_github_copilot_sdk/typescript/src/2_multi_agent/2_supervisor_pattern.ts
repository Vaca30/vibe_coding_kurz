/**
 * Multi-agent — Supervisor pattern.
 *
 * Concept
 * -------
 * A "tech lead" supervisor sits in a control loop. On every turn it inspects
 * shared history, chooses one specialist to invoke, runs it as a fresh
 * session, and merges the result back into history. Specialists never talk
 * to each other directly — everything funnels through the supervisor.
 *
 * Run:
 *   npx tsx src/2_multi_agent/2_supervisor_pattern.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

interface Specialist {
    name: string;
    prompt: string;
}

const SPECIALISTS: Record<string, Specialist> = {
    "requirements-analyst": {
        name: "requirements-analyst",
        prompt: "You are a requirements analyst. Produce a concrete list of functional requirements.",
    },
    architect: {
        name: "architect",
        prompt: "You are a software architect. Given the brief, propose a small REST API design.",
    },
    developer: {
        name: "developer",
        prompt: "You are a TypeScript developer. Sketch an Express implementation in <80 lines.",
    },
};

const SUPERVISOR_PROMPT =
    `You are a tech-lead supervisor coordinating three specialists: ${Object.keys(SPECIALISTS).join(", ")}. ` +
    "On every turn you must reply with a single JSON block on its own line:\n" +
    "```json\n" +
    '{"action": "delegate"|"finish", "delegate_to": "<name>", "task": "<what to ask the specialist>", "answer": "<final answer>"}' +
    "\n```\n" +
    "Use `delegate` to invoke a specialist; use `finish` only when the task is fully complete.";

interface SupervisorDecision {
    action: "delegate" | "finish";
    delegate_to?: string;
    task?: string;
    answer?: string;
}

function parseSupervisor(text: string): SupervisorDecision {
    const m = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (!m) return { action: "finish", answer: text };
    try {
        return JSON.parse(m[1]) as SupervisorDecision;
    } catch {
        return { action: "finish", answer: text };
    }
}

async function runSpecialist(client: CopilotClient, name: string, task: string): Promise<string> {
    const spec = SPECIALISTS[name];
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: { mode: "replace", content: spec.prompt },
    });
    try {
        const reply = await session.sendAndWait({ prompt: task }, 300_000);
        return (reply?.data as { content: string })?.content ?? "";
    } finally {
        await session.disconnect();
    }
}

async function main(): Promise<void> {
    const initial =
        "Design and sketch a small REST API for a personal todo list with create/" +
        "list/update/delete. Coordinate the team.";

    const client = new CopilotClient();
    try {
        // Supervisor session retains history across iterations.
        const supervisor = await client.createSession({
            onPermissionRequest: approveAll,
            systemMessage: { mode: "replace", content: SUPERVISOR_PROMPT },
        });

        let message = initial;
        for (let step = 1; step <= 6; step++) {
            console.log(`\n--- step ${step}: supervisor thinking ---`);
            const reply = await supervisor.sendAndWait({ prompt: message }, 300_000);
            const decision = parseSupervisor((reply?.data as { content: string })?.content ?? "");
            console.log(JSON.stringify(decision, null, 2));

            if (decision.action === "finish") {
                console.log("\n=== final answer ===");
                console.log(decision.answer ?? "");
                break;
            }

            const name = decision.delegate_to ?? "";
            if (!(name in SPECIALISTS)) {
                console.log(`[supervisor picked unknown specialist ${JSON.stringify(name)}; stopping]`);
                break;
            }

            const task = decision.task ?? initial;
            console.log(`\n--- step ${step}: ${name} working ---`);
            const result = await runSpecialist(client, name, task);
            console.log(result);

            message =
                `The ${name} returned the following:\n\n${result}\n\n` + "Decide the next action.";
        }

        await supervisor.disconnect();
    } finally {
        await client.stop();
    }
}

main().catch(console.error);
