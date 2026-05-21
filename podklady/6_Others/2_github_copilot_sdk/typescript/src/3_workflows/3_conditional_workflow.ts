/**
 * Workflow — Conditional routing.
 *
 * Concept
 * -------
 * A classifier session inspects the request and emits a single category
 * label. The orchestration code then routes the request to the matching
 * handler session. Only one handler runs.
 *
 * Run:
 *   npx tsx src/3_workflows/3_conditional_workflow.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

type Category = "TECHNICAL" | "CREATIVE" | "ANALYTICAL" | "OTHER";
const CATEGORIES = new Set<Category>(["TECHNICAL", "CREATIVE", "ANALYTICAL", "OTHER"]);

const CLASSIFIER =
    "You classify user requests. Reply with exactly one line in this format:\n" +
    "    CATEGORY: <one of TECHNICAL, CREATIVE, ANALYTICAL, OTHER>\n" +
    "Then optionally a short justification on a second line.";

const HANDLERS: Record<Category, string> = {
    TECHNICAL:  "You are a senior software engineer. Produce code-first answers with a short rationale.",
    CREATIVE:   "You are a creative writer. Produce vivid, polished prose.",
    ANALYTICAL: "You are a data analyst. Produce a concise, evidence-based response.",
    OTHER:      "You are a helpful generalist. Answer briefly and clearly.",
};

async function classify(client: CopilotClient, request: string): Promise<Category> {
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: { mode: "replace", content: CLASSIFIER },
    });
    try {
        const reply = await session.sendAndWait({ prompt: request }, 300_000);
        const text = (reply?.data as { content: string })?.content ?? "";
        const m = text.match(/CATEGORY:\s*(\w+)/i);
        const cat = m?.[1]?.toUpperCase() as Category | undefined;
        return cat && CATEGORIES.has(cat) ? cat : "OTHER";
    } finally {
        await session.disconnect();
    }
}

async function handle(client: CopilotClient, category: Category, request: string): Promise<string> {
    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: { mode: "replace", content: HANDLERS[category] },
    });
    try {
        const reply = await session.sendAndWait({ prompt: request }, 300_000);
        return (reply?.data as { content: string })?.content ?? "";
    } finally {
        await session.disconnect();
    }
}

const REQUESTS = [
    "Write me a TypeScript function that returns the nth Fibonacci number.",
    "Tell me a one-paragraph short story about a lighthouse keeper.",
    "What are the top three reasons developer productivity studies fail?",
    "How do I make a really good cup of coffee at home?",
];

async function main(): Promise<void> {
    const client = new CopilotClient();
    try {
        for (const r of REQUESTS) {
            console.log(`\n>>> ${r}`);
            const cat = await classify(client, r);
            console.log(`    classified as: ${cat}`);
            const answer = await handle(client, cat, r);
            console.log(`\n${answer}`);
        }
    } finally {
        await client.stop();
    }
}

main().catch(console.error);
