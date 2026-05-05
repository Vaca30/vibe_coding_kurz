#!/usr/bin/env node
/**
 * Multi-Agent Example: Collaboration Pattern
 *
 * In this pattern, multiple agents work in a defined sequential order.
 * Each agent can either return an answer to the user or pass the solution
 * to the next agent in the group. The order of agents is predefined.
 *
 * Key Characteristics:
 * - All agents are "equal" (no hierarchy)
 * - Order of agents is defined
 * - Each agent can pass work to the next agent in sequence
 */

import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { codexPathOverride } from "../helpers.ts";

interface AgentRole {
	name: string;
	instructions: string;
}

const CollaborationResponseSchema = z.object({
	resolved: z.boolean(),
	content: z.string(),
});

/**
 * Manages a group of agents working in collaboration pattern.
 */
class CollaborationGroup {
	private agents: AgentRole[];
	private maxIterations: number;

	constructor(agents: AgentRole[], maxIterations = 10) {
		this.agents = agents;
		this.maxIterations = maxIterations;
	}

	/**
	 * Execute the collaboration pattern with the initial task.
	 */
	async execute(initialTask: string): Promise<string> {
		let context = initialTask;
		let iteration = 0;

		while (iteration < this.maxIterations) {
			const agent = this.agents[iteration % this.agents.length]!;

			console.log(`\n${"=".repeat(60)}`);
			console.log(`Iteration: ${iteration + 1}/${this.maxIterations}`);
			console.log(`Agent: ${agent.name}`);
			console.log("=".repeat(60));

			const prompt = `You are working as part of a collaboration group.

Your role: ${agent.instructions}

Current task/context:
${context}

Return a structured response.
- Use resolved=true if the task is fully resolved and needs no further processing.
- Use resolved=false if another agent should continue working on the task.
- Put your contribution or final answer in content.`;

			// Each agent is its own Codex instance with role-specific instructions
			const codex = new Codex({
				codexPathOverride: codexPathOverride(),
				config: { developer_instructions: agent.instructions },
			});

			const thread = codex.startThread({ skipGitRepoCheck: true });
			const turn = await thread.run(prompt, {
				outputSchema: zodToJsonSchema(CollaborationResponseSchema, {
					target: "openAi",
				}),
			});

			console.log(`\n${agent.name}: ${turn.finalResponse}`);

			if (turn.usage) {
				console.log(
					`\nCost for ${agent.name}: ${turn.usage.input_tokens} input, ${turn.usage.output_tokens} output tokens`,
				);
			}

			const parsed = CollaborationResponseSchema.parse(
				JSON.parse(turn.finalResponse),
			);

			if (parsed.resolved) {
				return parsed.content;
			}

			context = parsed.content;
			iteration++;
		}

		return `${context}\n\n[Stopped after reaching maxIterations=${this.maxIterations} without resolved=true]`;
	}
}

async function demoSoftwareDevelopment() {
	console.log("\n" + "=".repeat(80));
	console.log("COLLABORATION PATTERN DEMO: Software Development Workflow");
	console.log("=".repeat(80));

	const agents: AgentRole[] = [
		{
			name: "requirements-analyst",
			instructions:
				"You are a requirements analyst. Analyze user requirements and create " +
				"clear technical specifications. Focus on what needs to be built.",
		},
		{
			name: "architect",
			instructions:
				"You are a software architect. Based on requirements, design the system " +
				"architecture, define components, and specify technologies to use.",
		},
		{
			name: "developer",
			instructions:
				"You are a software developer. Implement the solution based on the " +
				"architecture and requirements. Write clean, maintainable code.",
		},
	];

	const group = new CollaborationGroup(agents);

	const task = `Create a simple REST API for a todo list application.
The API should support:
- Creating new todos
- Listing all todos
- Marking todos as complete
- Deleting todos
`;

	const result = await group.execute(task);

	console.log("\n" + "=".repeat(80));
	console.log("FINAL RESULT:");
	console.log("=".repeat(80));
	console.log(result);
}

async function main() {
	await demoSoftwareDevelopment();

	console.log("\n=== Collaboration Pattern Summary ===");
	console.log("- Sequential agent execution");
	console.log("- Each agent processes and passes to next");
	console.log("- No hierarchy - all agents equal");
	console.log("- Predefined order of collaboration");
}

main().catch(console.error);
