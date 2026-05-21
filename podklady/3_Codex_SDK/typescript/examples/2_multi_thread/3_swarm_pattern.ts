#!/usr/bin/env node
/**
 * Multi-Agent Example: Swarm Pattern
 *
 * In this pattern, each agent has defined "handoffs" that specify which agents
 * they can pass work to. Each agent autonomously decides which allowed agent
 * should continue, or resolves the task directly.
 *
 * Key Characteristics:
 * - All agents are "equal" (no hierarchy)
 * - No specific order of agents (unlike collaboration)
 * - Only the first agent is defined
 * - Each agent has a handoff list of possible next agents
 * - Each agent receives the original task plus the full response history
 */

import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

import { codexPathOverride } from "../helpers.ts";

const SwarmResponseSchema = z
  .object({
    resolved: z.boolean(),
    next_agent: z.string().nullable(),
    next_task: z.string().nullable(),
    content: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.resolved) {
      return;
    }

    if (!data.next_agent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "next_agent is required when resolved=false",
        path: ["next_agent"],
      });
    }

    if (!data.next_task) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "next_task is required when resolved=false",
        path: ["next_task"],
      });
    }
  });

type SwarmResponse = z.infer<typeof SwarmResponseSchema>;

interface SwarmHistoryEntry {
  agent: string;
  task: string;
  response: string;
}

interface SwarmState {
  originalTask: string;
  currentTask: string;
  history: SwarmHistoryEntry[];
}

/**
 * Represents an agent in the swarm with its handoffs.
 */
class SwarmAgent {
  name: string;
  instructions: string;
  handoffs: string[];

  constructor(name: string, instructions: string, handoffs: string[] = []) {
    this.name = name;
    this.instructions = instructions;
    this.handoffs = handoffs;
  }
}

/**
 * Manages a swarm of agents with dynamic handoffs.
 */
class Swarm {
  private agents: Record<string, SwarmAgent>;
  private initialAgent: string;

  constructor(agents: Record<string, SwarmAgent>, initialAgent: string) {
    this.agents = agents;
    this.initialAgent = initialAgent;
  }

  async execute(
    initialTask: string,
    maxHandoffs: number = 10,
  ): Promise<string> {
    let currentAgent = this.initialAgent;
    let handoffCount = 0;
    const state: SwarmState = {
      originalTask: initialTask,
      currentTask: initialTask,
      history: [],
    };

    while (handoffCount < maxHandoffs) {
      const agent = this.agents[currentAgent]!;

      console.log(`\n${"=".repeat(60)}`);
      console.log(`Current Agent: ${currentAgent}`);
      console.log(`Handoff Count: ${handoffCount}/${maxHandoffs}`);
      console.log("=".repeat(60));

      const handoffInfo =
        agent.handoffs.length > 0
          ? agent.handoffs
              .map((name) => `- ${name}: ${this.agents[name]!.instructions}`)
              .join("\n")
          : "None - this agent must resolve the task directly";

      const prompt = `You are ${currentAgent}, working in a swarm of peer agents.

Your role: ${agent.instructions}

Original user task:
${state.originalTask}

Your current task:
${state.currentTask}

Previous agent responses:
${this.formatHistory(state.history)}

Available handoffs (agents you can pass work to):
${handoffInfo}

Return a structured response with this logic:
- Use resolved=true if you can fully answer the user now.
- Use resolved=false if another agent from your handoff list should continue.
- When resolved=false, set next_agent and next_task.
- Put your full contribution or final answer in content.`;

      const codex = new Codex({
        codexPathOverride: codexPathOverride(),
        config: { developer_instructions: agent.instructions },
      });

      const thread = codex.startThread({ skipGitRepoCheck: true });
      const turn = await thread.run(prompt, {
        outputSchema: zodToJsonSchema(SwarmResponseSchema, {
          target: "openAi",
        }),
      });
      const parsed = SwarmResponseSchema.parse(JSON.parse(turn.finalResponse));

      console.log(`\n${currentAgent}: ${turn.finalResponse}`);

      if (turn.usage) {
        console.log(
          `\nCost for ${currentAgent}: ${turn.usage.input_tokens} input, ${turn.usage.output_tokens} output tokens`,
        );
      }

      state.history.push({
        agent: currentAgent,
        task: state.currentTask,
        response: parsed.content,
      });

      if (parsed.resolved) {
        return parsed.content;
      }

      if (!this.isValidHandoff(agent, parsed)) {
        return `${parsed.content}\n\n[Invalid handoff from ${currentAgent} to ${parsed.next_agent}]`;
      }

      currentAgent = parsed.next_agent!;
      state.currentTask = parsed.next_task!;
      handoffCount++;
    }

    const latestResponse =
      state.history.at(-1)?.response ??
      "[No agent resolved the task before maxHandoffs was reached]";

    return `${latestResponse}\n\n[Stopped after reaching maxHandoffs=${maxHandoffs} without resolved=true]`;
  }

  private formatHistory(history: SwarmHistoryEntry[]): string {
    if (history.length === 0) {
      return "None yet.";
    }

    return history
      .map(
        (entry, index) =>
          `${index + 1}. Agent: ${entry.agent}\nTask: ${entry.task}\nResponse: ${entry.response}`,
      )
      .join("\n\n");
  }

  private isValidHandoff(
    agent: SwarmAgent,
    response: SwarmResponse,
  ): response is SwarmResponse & { next_agent: string; next_task: string } {
    return (
      response.next_agent !== null &&
      response.next_task !== null &&
      agent.handoffs.includes(response.next_agent)
    );
  }
}

async function demoSoftwareDevelopment() {
  console.log("\n" + "=".repeat(80));
  console.log("SWARM PATTERN DEMO: Software Development Workflow");
  console.log("=".repeat(80));

  const agents: Record<string, SwarmAgent> = {
    "requirements-analyst": new SwarmAgent(
      "requirements-analyst",
      "Clarify product requirements, identify acceptance criteria, and expose missing assumptions.",
      ["architect", "developer"],
    ),
    architect: new SwarmAgent(
      "architect",
      "Design system components, API shape, data model, and technical tradeoffs.",
      ["developer", "requirements-analyst"],
    ),
    developer: new SwarmAgent(
      "developer",
      "Propose implementation details, endpoint behavior, validation, and delivery plan.",
      ["architect", "requirements-analyst"],
    ),
  };

  const swarm = new Swarm(agents, "requirements-analyst");

  const task = `Create a simple REST API for a todo list application.
The API should support:
- Creating new todos
- Listing all todos
- Marking todos as complete
- Deleting todos`;

  const result = await swarm.execute(task);

  console.log("\n" + "=".repeat(80));
  console.log("FINAL RESULT:");
  console.log("=".repeat(80));
  console.log(result);
}

async function main() {
  await demoSoftwareDevelopment();

  console.log("\n=== Swarm Pattern Summary ===");
  console.log("- Agents with handoff lists");
  console.log("- Autonomous decision making");
  console.log("- Dynamic workflow routing");
  console.log("- Original task and response history preserved across handoffs");
}

main().catch(console.error);
