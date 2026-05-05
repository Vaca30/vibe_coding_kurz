#!/usr/bin/env node
/**
 * Single Thread Example: Structured Output
 *
 * Demonstrates using structured output with both plain JSON schema
 * and Zod schemas to get typed responses from the agent.
 */

import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

import { codexPathOverride } from "../helpers.ts";

async function examplePlainJsonSchema() {
	console.log("=== Example 1: Plain JSON Schema ===\n");

	const codex = new Codex({ codexPathOverride: codexPathOverride() });
	const thread = codex.startThread({ skipGitRepoCheck: true });

	// { summary: string; status: "ok" | "action_required" }
	const schema = {
		type: "object",
		properties: {
			summary: { type: "string" },
			status: { type: "string", enum: ["ok", "action_required"] },
		},
		required: ["summary", "status"],
		additionalProperties: false,
	} as const;

	const turn = await thread.run("Summarize the current directory status", {
		outputSchema: schema,
	});

	console.log("Response (raw):", turn.finalResponse);

	try {
		const parsed = JSON.parse(turn.finalResponse);
		console.log("\nParsed response:");
		console.log(`  Summary: ${parsed.summary}`);
		console.log(`  Status: ${parsed.status}`);
	} catch {
		console.log("(Response was not valid JSON)");
	}

	if (turn.usage) {
		console.log(`\nInput tokens: ${turn.usage.input_tokens}`);
		console.log(`Output tokens: ${turn.usage.output_tokens}`);
	}

	console.log("\n");
}

async function exampleMultiFieldSchema() {
	console.log("=== Example 3: Multi-Field Structured Output ===\n");

	const codex = new Codex({ codexPathOverride: codexPathOverride() });
	const thread = codex.startThread({ skipGitRepoCheck: true });

	// {
	//   title: string;
	//   priority: "low" | "medium" | "high";
	//   estimated_hours: number;
	//   tags: string[];
	// }
	const TodoSchema = z.object({
		title: z.string(),
		priority: z.enum(["low", "medium", "high"]),
		estimated_hours: z.number(),
		tags: z.array(z.string()),
	});

	const turn = await thread.run(
		"Create a todo item for adding unit tests to a TypeScript project",
		{
			outputSchema: zodToJsonSchema(TodoSchema, { target: "openAi" }),
		},
	);

	console.log("Response (raw):", turn.finalResponse);

	try {
		const parsed = TodoSchema.parse(JSON.parse(turn.finalResponse));
		console.log("\nParsed todo:");
		console.log(`  Title: ${parsed.title}`);
		console.log(`  Priority: ${parsed.priority}`);
		console.log(`  Estimated hours: ${parsed.estimated_hours}`);
		console.log(`  Tags: ${parsed.tags.join(", ")}`);
	} catch (error) {
		console.log("Validation error:", error);
	}

	if (turn.usage) {
		console.log(`\nInput tokens: ${turn.usage.input_tokens}`);
		console.log(`Output tokens: ${turn.usage.output_tokens}`);
	}
}

async function main() {
	await examplePlainJsonSchema();
	await exampleMultiFieldSchema();
}

main().catch(console.error);
