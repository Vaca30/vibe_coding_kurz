#!/usr/bin/env node

/**
 * Single Thread Example: MCP Tools
 *
 * Demonstrates how Codex interacts with MCP (Model Context Protocol) tools.
 * Codex has built-in support for MCP servers configured in its settings.
 *
 * Note: MCP servers must be configured in the Codex CLI configuration
 * (e.g., ~/.codex/config.toml) before running this example.
 *
 * The Codex SDK exposes MCP tool calls as McpToolCallItem events in the stream,
 * allowing you to observe tool invocations and their results.
 */

import type { ThreadItem } from "@openai/codex-sdk";
import { Codex } from "@openai/codex-sdk";
import { codexPathOverride } from "../helpers.ts";

function handleEvent(event: {
	type: string;
	item?: ThreadItem;
	usage?: { input_tokens: number; output_tokens: number };
	error?: { message: string };
}): void {
	switch (event.type) {
		case "item.completed":
			if (event.item) {
				handleItem(event.item);
			}
			break;
		case "item.started":
		case "item.updated":
			if (event.item?.type === "mcp_tool_call") {
				console.log(
					`  [MCP In Progress] ${event.item.server}/${event.item.tool}`,
				);
			}
			break;
		case "turn.completed":
			if (event.usage) {
				console.log(
					`\nUsed ${event.usage.input_tokens} input, ${event.usage.output_tokens} output tokens.`,
				);
			}
			break;
		case "turn.failed":
			if (event.error) {
				console.error(`Turn failed: ${event.error.message}`);
			}
			break;
	}
}

function handleItem(item: ThreadItem): void {
	switch (item.type) {
		case "agent_message":
			console.log(`\nCodex: ${item.text}`);
			break;
		case "reasoning":
			console.log(`[Reasoning] ${item.text}`);
			break;
		case "command_execution": {
			const exitText =
				item.exit_code !== undefined ? ` (exit: ${item.exit_code})` : "";
			console.log(`[Command] ${item.command}${exitText}`);
			if (item.aggregated_output) {
				console.log(`  Output: ${item.aggregated_output.slice(0, 200)}`);
			}
			break;
		}
		case "file_change": {
			for (const change of item.changes) {
				console.log(`[File ${change.kind}] ${change.path}`);
			}
			break;
		}
		case "mcp_tool_call": {
			console.log(`\n[MCP Tool Call]`);
			console.log(`  Server: ${item.server}`);
			console.log(`  Tool: ${item.tool}`);
			console.log(`  Arguments: ${JSON.stringify(item.arguments)}`);
			console.log(`  Status: ${item.status}`);
			if (item.result) {
				console.log(
					`  Result: ${JSON.stringify(item.result.content).slice(0, 200)}`,
				);
			}
			if (item.error) {
				console.log(`  Error: ${item.error.message}`);
			}
			break;
		}
		case "web_search":
			console.log(`[Web Search] ${item.query}`);
			break;
		case "todo_list": {
			console.log("Todo:");
			for (const todo of item.items) {
				console.log(`  ${todo.completed ? "[x]" : "[ ]"} ${todo.text}`);
			}
			break;
		}
	}
}

async function exampleMcpToolObservation() {
	console.log("=== Example 1: Observing MCP Tool Calls via Streaming ===\n");
	console.log(
		"Note: This example configures the Playwright MCP server explicitly.\n",
	);

	const codex = new Codex({
		codexPathOverride: codexPathOverride() ?? "codex",
		config: {
			mcp_servers: {
				playwright: {
					command: "npx",
					args: ["@playwright/mcp@latest"],
				},
			},
		},
	});
	const thread = codex.startThread({ skipGitRepoCheck: true });

	// Ask a question that should trigger Playwright MCP usage.
	const { events } = await thread.runStreamed(
		"Use the Playwright MCP server to open https://example.com and tell me the page title.",
	);

	for await (const event of events) {
		handleEvent(event);
	}

	console.log("\n");
}

async function exampleCommandExecution() {
	console.log("=== Example 2: Command Execution (Built-in Tool) ===\n");
	console.log(
		"Codex can execute shell commands as part of its tool capabilities.\n",
	);

	const codex = new Codex({
		codexPathOverride: codexPathOverride() ?? "codex",
		config: {
			mcp_servers: {
				playwright: {
					command: "npx",
					args: ["@playwright/mcp@latest"],
				},
			},
		},
	});
	const thread = codex.startThread({
		sandboxMode: "read-only",
		skipGitRepoCheck: true,
	});

	const { events } = await thread.runStreamed(
		"What version of Node.js is installed? Use the command line to find out.",
	);

	for await (const event of events) {
		handleEvent(event);
	}
}

async function main() {
	console.log("=".repeat(50));
	console.log("  Codex SDK - MCP Tools & Command Execution");
	console.log("=".repeat(50) + "\n");

	await exampleMcpToolObservation();
	await exampleCommandExecution();

	console.log("\n=== MCP Tools Summary ===");
	console.log("- MCP tool calls are observable via streaming events");
	console.log("- McpToolCallItem exposes server, tool, arguments, and results");
	console.log("- Command executions show command, output, and exit code");
	console.log(
		"- MCP servers can come from CLI settings or SDK config overrides",
	);
}

main().catch(console.error);
