/**
 * 4b — Custom (in-process) tools.
 *
 * Concept
 * -------
 * Define a tool with `defineTool(...)`, give it a zod schema for its
 * arguments, and pass it into the session via `tools: [...]`. The agent will
 * call it like any built-in tool, but the handler runs inside *your* Node
 * process — perfect for talking to local data or internal APIs.
 *
 * Run:
 *   npx tsx src/1_single_agent/4b_agent_with_custom_tools.ts
 */

import { CopilotClient, defineTool, approveAll } from "@github/copilot-sdk";
import { z } from "zod";

// --- Tool 1: a price lookup ----------------------------------------------

const FAKE_PRICES: Record<string, number> = {
    AAPL: 192.13,
    MSFT: 421.55,
    GOOGL: 174.02,
};

const getStockPrice = defineTool("get_stock_price", {
    description: "Look up the current price for a stock ticker.",
    parameters: z.object({
        ticker: z.string().describe("Stock ticker symbol, e.g. AAPL"),
    }),
    handler: async ({ ticker }) => {
        const price = FAKE_PRICES[ticker.toUpperCase()];
        if (price === undefined) return `No data for ticker ${ticker}.`;
        return `${ticker.toUpperCase()} is trading at $${price}.`;
    },
});

// --- Tool 2: a tiny calculator -------------------------------------------

const add = defineTool("add", {
    description: "Add two numbers and return the sum.",
    parameters: z.object({ a: z.number(), b: z.number() }),
    handler: async ({ a, b }) => `${a + b}`,
});

async function main(): Promise<void> {
    const client = new CopilotClient();

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        tools: [getStockPrice, add],
    });

    const reply = await session.sendAndWait({
        prompt: "What's Apple trading at right now? Then tell me 17.5 + 24.3.",
    }, 300_000);
    if (reply) {
        console.log((reply.data as { content: string }).content);
    }

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
