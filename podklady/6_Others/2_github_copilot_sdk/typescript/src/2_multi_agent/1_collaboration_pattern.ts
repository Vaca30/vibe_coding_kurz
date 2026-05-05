/**
 * Multi-agent — Collaboration pattern.
 *
 * Concept
 * -------
 * A flat chain of equal peers. Each agent sees the previous agent's output,
 * either resolves the task (`resolved: true`) or hands off to the next one
 * in the predefined sequence. No supervisor.
 *
 * Run:
 *   npx tsx src/2_multi_agent/1_collaboration_pattern.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

interface Role {
    name: string;
    prompt: string;
}

const PIPELINE: Role[] = [
    {
        name: "requirements-analyst",
        prompt:
            "You are a requirements analyst. Translate the user's request into a " +
            "short, concrete list of functional requirements. No code.",
    },
    {
        name: "architect",
        prompt:
            "You are a software architect. Given the requirements, propose a tiny " +
            "REST API design: endpoints, request/response shape, data model.",
    },
    {
        name: "developer",
        prompt:
            "You are a TypeScript developer. Given the architecture, sketch an Express " +
            "implementation in <80 lines. Include 1 example request.",
    },
];

const REPLY_FORMAT = `
After your work, append exactly one JSON block on its own line:

\`\`\`json
{"resolved": true|false, "next_input": "<text for the next agent>"}
\`\`\`

Set \`resolved: true\` only if no further refinement is needed.
`.trim();

function parseDecision(text: string): { resolved: boolean; nextInput: string } {
    const m = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (!m) return { resolved: false, nextInput: text };
    try {
        const obj = JSON.parse(m[1]) as { resolved?: boolean; next_input?: string };
        return { resolved: !!obj.resolved, nextInput: obj.next_input ?? text };
    } catch {
        return { resolved: false, nextInput: text };
    }
}

async function runRole(
    client: CopilotClient,
    role: Role,
    priorOutput: string,
): Promise<{ resolved: boolean; nextInput: string }> {
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: { mode: "replace", content: `${role.prompt}\n\n${REPLY_FORMAT}` },
    });
    try {
        const reply = await session.sendAndWait({ prompt: priorOutput }, 300_000);
        const text = (reply?.data as { content: string })?.content ?? "";
        const decision = parseDecision(text);
        console.log(`\n=== ${role.name} ===`);
        console.log(text);
        return decision;
    } finally {
        await session.disconnect();
    }
}

async function main(): Promise<void> {
    const initial =
        "Design a small REST API for a personal todo list with create/list/" +
        "update/delete operations. Keep it minimal.";

    const client = new CopilotClient();
    try {
        let currentInput = initial;
        for (const role of PIPELINE) {
            const { resolved, nextInput } = await runRole(client, role, currentInput);
            currentInput = nextInput;
            if (resolved) {
                console.log(`\n[stopping early — ${role.name} marked resolved]`);
                break;
            }
        }
    } finally {
        await client.stop();
    }
}

main().catch(console.error);
