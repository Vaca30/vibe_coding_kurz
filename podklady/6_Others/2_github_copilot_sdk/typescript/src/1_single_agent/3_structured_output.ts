/**
 * 3 — Structured output (prompt-driven).
 *
 * Concept
 * -------
 * The Copilot SDK doesn't expose a native `outputFormat: { type: "json_schema" }`
 * knob like some other agent SDKs do. The idiomatic workaround:
 *
 *   1. Tell the model in the system prompt to reply with JSON only.
 *   2. Validate the reply with zod.
 *   3. Retry once if parsing fails.
 *
 * Run:
 *   npx tsx src/1_single_agent/3_structured_output.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";
import { z } from "zod";

const TaskAnalysis = z.object({
    title: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    estimated_hours: z.number().min(0).max(200),
    tags: z.array(z.string()),
});
type TaskAnalysis = z.infer<typeof TaskAnalysis>;

const SYSTEM = `You are a task-analysis agent.

You MUST reply with ONLY a single JSON object — no prose, no markdown fence.
The object must conform to this schema:

{
  "title": "<one-line title>",
  "priority": "low" | "medium" | "high",
  "estimated_hours": <number>,
  "tags": [<string>, ...]
}`;

function stripFence(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("```")) return trimmed;
    let body = trimmed.slice(3);
    if (body.toLowerCase().startsWith("json")) body = body.slice(4);
    const end = body.lastIndexOf("```");
    if (end >= 0) body = body.slice(0, end);
    return body.trim();
}

function parse(raw: string): TaskAnalysis {
    return TaskAnalysis.parse(JSON.parse(stripFence(raw)));
}

async function analyze(client: CopilotClient, request: string): Promise<TaskAnalysis> {
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: { mode: "replace", content: SYSTEM },
    });
    try {
        const reply = await session.sendAndWait({ prompt: request }, 300_000);
        const raw = (reply?.data as { content: string })?.content ?? "";
        try {
            return parse(raw);
        } catch (err) {
            // One retry — repair pass.
            const retry = await session.sendAndWait({
                prompt:
                    `Your last reply could not be parsed: ${(err as Error).message}. ` +
                    `Reply again with ONLY a valid JSON object matching the schema.`,
            }, 300_000);
            return parse((retry?.data as { content: string })?.content ?? "");
        }
    } finally {
        await session.disconnect();
    }
}

async function main(): Promise<void> {
    const client = new CopilotClient();
    try {
        const result = await analyze(
            client,
            "We need to migrate our auth service from JWT to OAuth2 over the next sprint.",
        );
        console.log(JSON.stringify(result, null, 2));
    } finally {
        await client.stop();
    }
}

main().catch(console.error);
