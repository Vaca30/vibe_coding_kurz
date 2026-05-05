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

import {
	type AgentDefinition,
	query,
	type SDKAssistantMessage,
	type SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";

/** Structured output schema for agent responses */
interface AgentResponse {
	resolved: boolean;
	content: string;
}

const RESPONSE_SCHEMA = {
	type: "object",
	properties: {
		resolved: {
			type: "boolean",
			description:
				"True if the task is fully resolved and needs no further processing",
		},
		content: {
			type: "string",
			description: "The agent's contribution or final answer",
		},
	},
	required: ["resolved", "content"],
	additionalProperties: false,
} as const;

/**
 * Manages a group of agents working in collaboration pattern.
 */
class CollaborationGroup {
	private static readonly MAX_ITERATIONS = 10;
	private agentNames: string[];
	private agentDefinitions: Record<string, AgentDefinition>;

	constructor(agents: Array<[string, AgentDefinition]>) {
		this.agentNames = agents.map(([name]) => name);
		this.agentDefinitions = Object.fromEntries(agents);
	}

	/**
	 * Execute the collaboration pattern with the initial task.
	 * Agents cycle in predefined order until one returns resolved=true
	 * or MAX_ITERATIONS is reached.
	 */
	async execute(initialTask: string): Promise<string> {
		let context = initialTask;
		let iteration = 0;

		while (iteration < CollaborationGroup.MAX_ITERATIONS) {
			for (const agentName of this.agentNames) {
				iteration++;
				if (iteration > CollaborationGroup.MAX_ITERATIONS) {
					console.log(
						`\n>>> Max iterations (${CollaborationGroup.MAX_ITERATIONS}) reached.`,
					);
					return context;
				}

				console.log(`\n${"=".repeat(60)}`);
				console.log(
					`Agent: ${agentName} (iteration ${iteration}/${CollaborationGroup.MAX_ITERATIONS})`,
				);
				console.log("=".repeat(60));

				const agentDef = this.agentDefinitions[agentName];

				// Construct the prompt for this agent
				const prompt = `You are working as part of a collaboration group.

Your role: ${agentDef.description}

Original task:
${initialTask}

Previous agent output:
${context}

Process this and provide your contribution. Set "resolved" to true if the task
is fully complete and needs no further processing by other agents.`;

				// Execute this agent's turn with structured output
				let structuredResult: AgentResponse | null = null;

				for await (const message of query({
					prompt,
					options: {
						agents: { [agentName]: agentDef },
						outputFormat: {
							type: "json_schema",
							schema: RESPONSE_SCHEMA,
						},
					},
				})) {
					if (message.type === "assistant") {
						const assistantMsg = message as SDKAssistantMessage;
						for (const block of assistantMsg.message.content) {
							if (block.type === "text") {
								console.log(`\n${agentName}: ${block.text}`);
							} else if (block.type === "tool_use") {
								console.log(`\n[Using tool: ${block.name}]`);
							}
						}
					} else if (message.type === "result") {
						const resultMsg = message as SDKResultMessage;
						if (
							resultMsg.subtype === "success" &&
							resultMsg.structured_output
						) {
							structuredResult = resultMsg.structured_output as AgentResponse;
						}
						if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
							console.log(
								`\nCost for ${agentName}: $${resultMsg.total_cost_usd.toFixed(4)}`,
							);
						}
					}
				}

				if (!structuredResult) {
					console.log(`\nWarning: No structured output from '${agentName}'`);
					continue;
				}

				context = structuredResult.content;

				if (structuredResult.resolved) {
					console.log(
						`\n>>> Agent '${agentName}' resolved the task. Stopping chain.`,
					);
					return context;
				}
			}
		}

		return context;
	}
}

async function demoSoftwareDevelopment() {
	console.log("\n" + "=".repeat(80));
	console.log("COLLABORATION PATTERN DEMO: Software Development Workflow");
	console.log("=".repeat(80));

	// Define agents in order of collaboration
	const agents: Array<[string, AgentDefinition]> = [
		[
			"requirements-analyst",
			{
				description:
					"Analyzes requirements and creates technical specifications",
				prompt:
					"You are a requirements analyst. Analyze user requirements and create " +
					"clear technical specifications. Focus on what needs to be built.",
				tools: ["Read", "Grep"],
				model: "sonnet",
			},
		],
		[
			"architect",
			{
				description: "Designs system architecture and components",
				prompt:
					"You are a software architect. Based on requirements, design the system " +
					"architecture, define components, and specify technologies to use.",
				tools: ["Read", "Glob"],
				model: "sonnet",
			},
		],
		[
			"developer",
			{
				description: "Implements the solution based on architecture",
				prompt:
					"You are a software developer. Implement the solution based on the " +
					"architecture and requirements. Write clean, maintainable code.",
				tools: ["Read", "Write", "Edit"],
				model: "sonnet",
			},
		],
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
}

main().catch(console.error);
