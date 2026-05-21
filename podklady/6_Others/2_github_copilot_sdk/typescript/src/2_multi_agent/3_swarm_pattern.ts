/**
 * Multi-agent — Swarm pattern.
 *
 * Concept
 * -------
 * Equal peers connected by an explicit handoff graph. Each agent decides on
 * every turn whether to finish or hand off to one of *its* allowed peers.
 * The shared history grows as agents contribute.
 *
 *   requirements-analyst → [architect]
 *   architect            → [developer, requirements-analyst]
 *   developer            → [architect]
 *
 * Run:
 *   npx tsx src/2_multi_agent/3_swarm_pattern.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

interface SwarmAgent {
    name: string;
    description: string;
    prompt: string;
    handoffsTo: string[];
}

const SWARM: Record<string, SwarmAgent> = {
    "requirements-analyst": {
        name: "requirements-analyst",
        description: "Defines functional requirements.",
        prompt: "You are a requirements analyst. Produce concrete requirements.",
        handoffsTo: ["architect"],
    },
    architect: {
        name: "architect",
        description: "Proposes API designs.",
        prompt: "You are a software architect. Propose a small REST API design.",
        handoffsTo: ["developer", "requirements-analyst"],
    },
    developer: {
        name: "developer",
        description: "Implements designs in Express.",
        prompt: "You are a TypeScript developer. Sketch an Express implementation.",
        handoffsTo: ["architect"],
    },
};

const REPLY_FORMAT =
    "Reply with normal prose AND a JSON block on its own line:\n" +
    "```json\n" +
    '{"action": "handoff"|"finish", "handoff_to": "<name>", "content": "<your work>"}' +
    "\n```\n" +
    "Pick `handoff_to` only from your allowed peers.";

interface Decision {
    action: "handoff" | "finish";
    handoff_to?: string;
    content?: string;
    agent?: string;
}

function parse(text: string): Decision {
    const m = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (!m) return { action: "finish", content: text };
    try {
        return JSON.parse(m[1]) as Decision;
    } catch {
        return { action: "finish", content: text };
    }
}

function formatHistory(history: { agent: string; content: string }[]): string {
    if (history.length === 0) return "(no prior contributions)";
    return history.map((h) => `### ${h.agent}\n${h.content}`).join("\n\n");
}

async function runAgent(
    client: CopilotClient,
    agent: SwarmAgent,
    history: { agent: string; content: string }[],
    task: string,
): Promise<Decision> {
    const peers = agent.handoffsTo.join(", ") || "(none)";
    const system = `${agent.prompt}\n\nYou can hand off to: ${peers}.\n\n${REPLY_FORMAT}`;
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: { mode: "replace", content: system },
    });
    try {
        const prompt =
            `Original task: ${task}\n\n` +
            `Prior contributions:\n${formatHistory(history)}\n\n` +
            "Do your part now.";
        const reply = await session.sendAndWait({ prompt }, 300_000);
        const decision = parse((reply?.data as { content: string })?.content ?? "");
        decision.agent = decision.agent ?? agent.name;
        return decision;
    } finally {
        await session.disconnect();
    }
}

async function main(): Promise<void> {
    const task =
        "Design and sketch a small REST API for a personal todo list with " +
        "create/list/update/delete operations. Iterate as needed.";

    const client = new CopilotClient();
    try {
        let currentName = "requirements-analyst";
        const history: { agent: string; content: string }[] = [];
        const maxSteps = 6;

        let step = 1;
        for (; step <= maxSteps; step++) {
            const agent = SWARM[currentName];
            console.log(`\n=== step ${step}: ${agent.name} ===`);
            const decision = await runAgent(client, agent, history, task);
            console.log(decision.content ?? "");
            history.push({ agent: agent.name, content: decision.content ?? "" });

            if (decision.action === "finish") {
                console.log("\n[swarm: agent declared task finished]");
                break;
            }

            const target = decision.handoff_to ?? "";
            if (!agent.handoffsTo.includes(target)) {
                console.log(
                    `[swarm: invalid handoff ${JSON.stringify(target)} from ${agent.name}; stopping]`,
                );
                break;
            }
            currentName = target;
        }
        if (step > maxSteps) {
            console.log(`\n[swarm: hit maxSteps=${maxSteps}, stopping]`);
        }
    } finally {
        await client.stop();
    }
}

main().catch(console.error);
