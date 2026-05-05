/**
 * 8 — Custom agents that own their own (MCP) tools.
 *
 * Concept
 * -------
 * A custom agent can have its *own* MCP servers attached, distinct from the
 * rest of the session. This is how you build a "specialist" — for example, a
 * finance analyst that has access to a stock-data MCP server while no other
 * agent does.
 *
 * Here we define two specialists, each with its own custom in-process tools.
 *
 * Run:
 *   npx tsx src/1_single_agent/8_agent_with_subagents_mcp.ts
 */

import { CopilotClient, defineTool, approveAll } from "@github/copilot-sdk";
import { z } from "zod";

// --- Finance specialist's tools ------------------------------------------

const FAKE_PRICES: Record<string, number> = {
    AAPL: 192.13,
    MSFT: 421.55,
    GOOGL: 174.02,
    TSLA: 248.91,
};
const FAKE_DIVIDENDS: Record<string, string> = {
    AAPL: "2026-05-15",
    MSFT: "2026-05-22",
};

const getStockPrice = defineTool("get_stock_price", {
    description: "Look up the current price for a stock ticker.",
    parameters: z.object({ ticker: z.string() }),
    handler: async ({ ticker }) => {
        const t = ticker.toUpperCase();
        return FAKE_PRICES[t] !== undefined
            ? `${t} = $${FAKE_PRICES[t]}`
            : `unknown ticker ${ticker}`;
    },
});

const getDividendDate = defineTool("get_dividend_date", {
    description: "Look up the next dividend date for a stock ticker.",
    parameters: z.object({ ticker: z.string() }),
    handler: async ({ ticker }) => {
        const t = ticker.toUpperCase();
        return FAKE_DIVIDENDS[t]
            ? `${t} next dividend: ${FAKE_DIVIDENDS[t]}`
            : "no dividend on record";
    },
});

// --- Stats specialist's tools --------------------------------------------

const mean = defineTool("mean", {
    description: "Return the arithmetic mean of a list of numbers.",
    parameters: z.object({ numbers: z.array(z.number()) }),
    handler: async ({ numbers }) => {
        if (numbers.length === 0) return "empty list";
        return (numbers.reduce((a, b) => a + b, 0) / numbers.length).toFixed(4);
    },
});

const stddev = defineTool("stddev", {
    description: "Return the population standard deviation of a list of numbers.",
    parameters: z.object({ numbers: z.array(z.number()) }),
    handler: async ({ numbers }) => {
        if (numbers.length < 2) return "need at least two numbers";
        const m = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const variance =
            numbers.reduce((acc, x) => acc + (x - m) ** 2, 0) / numbers.length;
        return Math.sqrt(variance).toFixed(4);
    },
});

async function main(): Promise<void> {
    const client = new CopilotClient();

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        // All custom tools must be registered at the session level...
        tools: [getStockPrice, getDividendDate, mean, stddev],
        // ...and we restrict each agent to the ones it should actually see.
        customAgents: [
            {
                name: "finance-analyst",
                displayName: "Finance Analyst",
                description: "Answers questions about stock prices and dividends.",
                tools: ["get_stock_price", "get_dividend_date"],
                prompt:
                    "You are a finance analyst. Use the available tools to look up " +
                    "concrete data; never guess prices or dates.",
            },
            {
                name: "stats-analyst",
                displayName: "Statistics Analyst",
                description: "Computes statistics over numeric datasets.",
                tools: ["mean", "stddev"],
                prompt:
                    "You are a statistics expert. Use the tools to produce exact " +
                    "numbers; explain the result in plain language.",
            },
        ],
    });

    console.log("> Finance question (should pick finance-analyst):");
    let reply = await session.sendAndWait({
        prompt: "What's AAPL trading at, and when's the next dividend?",
    }, 300_000);
    console.log((reply?.data as { content: string })?.content ?? "(no reply)");

    console.log("\n> Stats question (should pick stats-analyst):");
    reply = await session.sendAndWait({
        prompt:
            "Given the values 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, what's the mean " +
            "and the standard deviation?",
    }, 300_000);
    console.log((reply?.data as { content: string })?.content ?? "(no reply)");

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
