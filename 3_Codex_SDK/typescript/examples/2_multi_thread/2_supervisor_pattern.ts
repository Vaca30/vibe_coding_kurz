#!/usr/bin/env node
/**
 * Multi-Agent Example: Supervisor Pattern
 *
 * In this pattern, multiple agents work under the leadership of a supervisor agent.
 * Like humans in teams with their own manager, each agent reports only to the supervisor.
 * The supervisor decides whether to answer the user directly or delegate tasks to team members.
 *
 * Key Characteristics:
 * - All agents are NOT "equal" - Hierarchical structure
 * - Supervisor agent controls the workflow
 * - Supervisor decides what information is passed to agents
 * - Supervisor decides what information is presented to the user
 */

import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { codexPathOverride } from "../helpers.ts";

interface AgentRole {
  name: string;
  instructions: string;
}

const SupervisorResponseSchema = z
  .object({
    resolved: z.boolean(),
    delegate_to: z.string().nullable(),
    task: z.string().nullable(),
    content: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.resolved) {
      return;
    }

    if (!data.delegate_to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "delegate_to is required when resolved=false",
        path: ["delegate_to"],
      });
    }

    if (!data.task) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "task is required when resolved=false",
        path: ["task"],
      });
    }
  });

const WorkerResponseSchema = z.object({
  content: z.string(),
});

/**
 * Manages a team of agents under a supervisor.
 */
class SupervisorTeam {
  private supervisorName: string;
  private supervisorInstructions: string;
  private teamAgents: Record<string, AgentRole>;

  constructor(
    supervisorName: string,
    supervisorInstructions: string,
    teamAgents: Record<string, AgentRole>,
  ) {
    this.supervisorName = supervisorName;
    this.supervisorInstructions = supervisorInstructions;
    this.teamAgents = teamAgents;
  }

  /**
   * Execute the supervisor pattern with the initial task.
   */
  async execute(initialTask: string): Promise<string> {
    let result = "";

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Supervisor: ${this.supervisorName}`);
    console.log("=".repeat(60));

    // Build team member descriptions
    const teamInfo = Object.entries(this.teamAgents)
      .map(([, agent]) => `- ${agent.name}: ${agent.instructions}`)
      .join("\n");

    const supervisorPrompt = `You are a supervisor managing a team of specialized agents.

Your responsibility:
${this.supervisorInstructions}

Your team members:
${teamInfo}

Task to accomplish:
${initialTask}

As the supervisor, you should:
1. Analyze the task and decide if you can handle it directly or need to delegate
2. If delegating, clearly specify which team member should handle which part
3. Collect results from team members
4. Synthesize the final answer for the user

Return a structured response with this logic:
- Use resolved=true when you are ready to answer the user directly.
- Use resolved=false when you want to delegate to one team member.
- When resolved=false, set delegate_to to the team member name and task to the specific assignment.
- Always put your current reasoning summary, coordination notes, or final user-facing answer in content.
`;

    const maxIterations = 10;
    let iteration = 0;
    let context = supervisorPrompt;

    // Create supervisor thread once - reuse across iterations to maintain memory
    const supervisorCodex = new Codex({
      codexPathOverride: codexPathOverride(),
      config: { developer_instructions: this.supervisorInstructions },
    });

    const supervisorThread = supervisorCodex.startThread({
      skipGitRepoCheck: true,
    });

    while (iteration < maxIterations) {
      // Run supervisor on the same thread (maintains full conversation history)
      const supervisorTurn = await supervisorThread.run(context, {
        outputSchema: zodToJsonSchema(SupervisorResponseSchema, {
          target: "openAi",
        }),
      });
      const responseText = supervisorTurn.finalResponse;
      const supervisorDecision = SupervisorResponseSchema.parse(
        JSON.parse(responseText),
      );

      console.log(`\nSupervisor: ${responseText}`);

      if (supervisorTurn.usage) {
        console.log(
          `\nCost: ${supervisorTurn.usage.input_tokens} input, ${supervisorTurn.usage.output_tokens} output tokens`,
        );
      }

      if (!supervisorDecision.resolved) {
        const agentName = supervisorDecision.delegate_to!;
        const agentTask = supervisorDecision.task!;

        console.log(`\n${"=".repeat(60)}`);
        console.log(`Team Member: ${agentName}`);
        console.log("=".repeat(60));

        // Execute task with team member
        const agentResult = await this.executeAgentTask(agentName, agentTask);

        // Return result to supervisor
        context = `Your previous coordination summary:
${supervisorDecision.content}

The team member '${agentName}' has completed their task.

Result from ${agentName}:
${agentResult}

Please review this result and decide on next steps:
- Delegate to another team member if needed
- Or resolve the task and answer the user directly
`;
        iteration++;
      } else {
        result = supervisorDecision.content;
        break;
      }
    }

    return result;
  }

  private async executeAgentTask(
    agentName: string,
    task: string,
  ): Promise<string> {
    const agent = this.teamAgents[agentName]!;

    const prompt = `You are ${agentName}, a specialized team member.

Your role: ${agent.instructions}

Your supervisor has assigned you this task:
${task}

Please complete this task and report your findings back to the supervisor
as structured output. Put your full result in the content field.
`;

    const codex = new Codex({
      codexPathOverride: codexPathOverride(),
      config: { developer_instructions: agent.instructions },
    });

    const thread = codex.startThread({ skipGitRepoCheck: true });
    const turn = await thread.run(prompt, {
      outputSchema: zodToJsonSchema(WorkerResponseSchema, {
        target: "openAi",
      }),
    });

    console.log(`\n${agentName}: ${turn.finalResponse}`);

    if (turn.usage) {
      console.log(
        `\nCost for ${agentName}: ${turn.usage.input_tokens} input, ${turn.usage.output_tokens} output tokens`,
      );
    }

    const parsed = WorkerResponseSchema.parse(JSON.parse(turn.finalResponse));
    return parsed.content;
  }
}

async function demoSoftwareDevelopmentTeam() {
  console.log("\n" + "=".repeat(80));
  console.log("SUPERVISOR PATTERN DEMO: Software Development Workflow");
  console.log("=".repeat(80));

  const team: Record<string, AgentRole> = {
    "requirements-analyst": {
      name: "requirements-analyst",
      instructions:
        "You are a requirements analyst. Clarify requirements, identify acceptance criteria, and find missing details.",
    },
    architect: {
      name: "architect",
      instructions:
        "You are a software architect. Design components, interfaces, and technical approach.",
    },
    developer: {
      name: "developer",
      instructions:
        "You are a software developer. Propose implementation details, code structure, and practical delivery steps.",
    },
  };

  const supervisorTeam = new SupervisorTeam(
    "tech-lead",
    "Manage a software delivery workflow, delegate to specialists as needed, and synthesize the final implementation plan for the user.",
    team,
  );

  const task = `Create a simple REST API for a todo list application.
The API should support:
- Creating new todos
- Listing all todos
- Marking todos as complete
- Deleting todos
`;

  const result = await supervisorTeam.execute(task);

  console.log("\n" + "=".repeat(80));
  console.log("FINAL RESULT:");
  console.log("=".repeat(80));
  console.log(result);
}

async function main() {
  await demoSoftwareDevelopmentTeam();

  console.log("\n=== Supervisor Pattern Summary ===");
  console.log("- Hierarchical structure with supervisor");
  console.log("- Supervisor delegates to team members");
  console.log("- Supervisor synthesizes final results");
  console.log("- Team members report to supervisor");
}

main().catch(console.error);
