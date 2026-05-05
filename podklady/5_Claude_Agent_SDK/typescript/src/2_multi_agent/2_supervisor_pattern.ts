#!/usr/bin/env node
/**
 * Multi-Agent Example: Supervisor Pattern
 *
 * In this pattern, a supervisor agent coordinates team members via an
 * explicit control loop. The supervisor decides which subagent to call
 * (or to finish), constructs a task for that subagent, collects the
 * result, and repeats until it has enough information to answer the user.
 *
 * Key Characteristics:
 * - Hierarchical structure (supervisor leads)
 * - Supervisor explicitly chooses which subagent to call next
 * - Each subagent runs in its own isolated context (separate session)
 * - Subagents report results back to the supervisor only
 * - No direct communication between subagents
 * - Structured output drives the supervisor's decisions
 */

import {
  query,
  AgentDefinition,
  SDKAssistantMessage,
  SDKResultMessage,
} from '@anthropic-ai/claude-agent-sdk';

/** Structured output schema for supervisor decisions */
interface SupervisorDecision {
  action: 'delegate' | 'finish';
  delegate_to?: string;
  task?: string;
  answer?: string;
}

const SUPERVISOR_SCHEMA = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['delegate', 'finish'],
      description: "'delegate' to assign work to a subagent, 'finish' to return the final answer",
    },
    delegate_to: {
      type: 'string',
      description: 'Name of the subagent to delegate to (required when action is delegate)',
    },
    task: {
      type: 'string',
      description: 'Task description for the subagent (required when action is delegate)',
    },
    answer: {
      type: 'string',
      description: 'Final answer for the user (required when action is finish)',
    },
  },
  required: ['action'],
  additionalProperties: false,
} as const;

/**
 * Manages a team of agents under a supervisor with an explicit control loop.
 *
 * Each iteration the supervisor returns a structured decision: either
 * delegate to a subagent (with a constructed task) or finish with a
 * final answer. Subagents never communicate directly with each other.
 */
class SupervisorTeam {
  private static readonly MAX_ITERATIONS = 10;
  private supervisorName: string;
  private supervisorDefinition: AgentDefinition;
  private teamAgents: Record<string, AgentDefinition>;

  constructor(
    supervisorName: string,
    supervisorDefinition: AgentDefinition,
    teamAgents: Record<string, AgentDefinition>
  ) {
    this.supervisorName = supervisorName;
    this.supervisorDefinition = supervisorDefinition;
    this.teamAgents = teamAgents;
  }

  /**
   * Run a subagent in its own isolated session and return its response.
   */
  private async runSubagent(agentName: string, task: string): Promise<string> {
    const defn = this.teamAgents[agentName];

    const prompt = `Your role: ${defn.description}

Your supervisor has assigned you this task:
${task}

Complete this task and report your findings.`;

    console.log(`\n${'-'.repeat(40)}`);
    console.log(`Subagent: ${agentName}`);
    console.log('-'.repeat(40));

    const responseParts: string[] = [];

    for await (const message of query({
      prompt,
      options: {
        agents: { [agentName]: defn },
      },
    })) {
      if (message.type === 'assistant') {
        const assistantMsg = message as SDKAssistantMessage;
        for (const block of assistantMsg.message.content) {
          if (block.type === 'text') {
            console.log(`  ${agentName}: ${block.text}`);
            responseParts.push(block.text);
          } else if (block.type === 'tool_use') {
            console.log(`  [Using tool: ${block.name}]`);
          }
        }
      } else if (message.type === 'result') {
        const resultMsg = message as SDKResultMessage;
        if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
          console.log(`  Cost for ${agentName}: $${resultMsg.total_cost_usd.toFixed(4)}`);
        }
      }
    }

    return responseParts.join('\n');
  }

  /**
   * Execute the supervisor pattern with the initial task.
   * The supervisor loops: decide (structured output) -> delegate -> collect -> repeat.
   * Ends when the supervisor chooses action='finish' or MAX_ITERATIONS is reached.
   */
  async execute(initialTask: string): Promise<string> {
    const teamInfo = Object.entries(this.teamAgents)
      .map(([name, defn]) => `- ${name}: ${defn.description}`)
      .join('\n');

    const agentNamesList = Object.keys(this.teamAgents).join(', ');

    // Conversation history the supervisor accumulates
    let history = `Task to accomplish:\n${initialTask}`;

    for (let iteration = 1; iteration <= SupervisorTeam.MAX_ITERATIONS; iteration++) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Supervisor: ${this.supervisorName} (iteration ${iteration}/${SupervisorTeam.MAX_ITERATIONS})`);
      console.log('='.repeat(60));

      const prompt = `You are a supervisor managing a team of specialized agents.

Your responsibility:
${this.supervisorDefinition.description}

Your team members (you can delegate to any of them by name):
${teamInfo}

${history}

Decide your next step:
- "delegate" to assign a task to one of your team members (${agentNamesList})
- "finish" when you have enough information to provide the final answer`;

      let structuredResult: SupervisorDecision | null = null;

      for await (const message of query({
        prompt,
        options: {
          agents: { [this.supervisorName]: this.supervisorDefinition },
          outputFormat: {
            type: 'json_schema',
            schema: SUPERVISOR_SCHEMA,
          },
        },
      })) {
        if (message.type === 'assistant') {
          const assistantMsg = message as SDKAssistantMessage;
          for (const block of assistantMsg.message.content) {
            if (block.type === 'text') {
              console.log(`Supervisor: ${block.text}`);
            }
          }
        } else if (message.type === 'result') {
          const resultMsg = message as SDKResultMessage;
          if (resultMsg.subtype === 'success' && resultMsg.structured_output) {
            structuredResult = resultMsg.structured_output as SupervisorDecision;
          }
          if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
            console.log(`  Supervisor cost: $${resultMsg.total_cost_usd.toFixed(4)}`);
          }
        }
      }

      if (!structuredResult) {
        console.log('Warning: No structured output from supervisor');
        continue;
      }

      if (structuredResult.action === 'finish') {
        const answer = structuredResult.answer ?? '';
        console.log(`\n>>> Supervisor finished after ${iteration} iteration(s).`);
        return answer;
      }

      // Delegate to subagent
      const agentName = structuredResult.delegate_to ?? '';
      const task = structuredResult.task ?? '';

      if (!(agentName in this.teamAgents)) {
        history += `\n\nError: Unknown agent '${agentName}'. Available: ${agentNamesList}`;
        continue;
      }

      const subagentResult = await this.runSubagent(agentName, task);

      // Append result to history for the supervisor's next iteration
      history += `\n\nYou delegated to '${agentName}' with task: ${task}\nResult from ${agentName}:\n${subagentResult}`;
    }

    console.log(`\n>>> Max iterations (${SupervisorTeam.MAX_ITERATIONS}) reached.`);
    return history;
  }
}

async function demoSoftwareDevelopment() {
  console.log('\n' + '='.repeat(80));
  console.log('SUPERVISOR PATTERN DEMO: Software Development Workflow');
  console.log('='.repeat(80));

  const supervisor: AgentDefinition = {
    description: 'Technical lead managing development projects and coordinating specialists',
    prompt:
      'You are a technical lead. Break down requirements, delegate to team members, ' +
      'and ensure quality delivery.',
    tools: ['Read', 'Grep', 'Glob'],
    model: 'sonnet',
  };

  const team: Record<string, AgentDefinition> = {
    'requirements-analyst': {
      description: 'Analyzes requirements and creates technical specifications',
      prompt:
        'You are a requirements analyst. Analyze user requirements and create ' +
        'clear technical specifications. Focus on what needs to be built.',
      tools: ['Read', 'Grep'],
      model: 'sonnet',
    },
    architect: {
      description: 'Designs system architecture and components',
      prompt:
        'You are a software architect. Based on requirements, design the system ' +
        'architecture, define components, and specify technologies to use.',
      tools: ['Read', 'Glob'],
      model: 'sonnet',
    },
    developer: {
      description: 'Implements the solution based on architecture',
      prompt:
        'You are a software developer. Implement the solution based on the ' +
        'architecture and requirements. Write clean, maintainable code.',
      tools: ['Read', 'Write', 'Edit'],
      model: 'sonnet',
    },
  };

  const supervisorTeam = new SupervisorTeam('tech-lead', supervisor, team);

  const task = `Create a simple REST API for a todo list application.
The API should support:
- Creating new todos
- Listing all todos
- Marking todos as complete
- Deleting todos
`;

  const result = await supervisorTeam.execute(task);

  console.log('\n' + '='.repeat(80));
  console.log('FINAL RESULT:');
  console.log('='.repeat(80));
  console.log(result);
}

async function main() {
  await demoSoftwareDevelopment();
}

main().catch(console.error);
