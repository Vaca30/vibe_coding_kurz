#!/usr/bin/env node
/**
 * Multi-Agent Example: Swarm Pattern
 *
 * In this pattern, each agent has defined "handoffs" specifying which agents
 * they can pass work to. Agents are equal (no hierarchy). Each agent can
 * either finish the loop and return an answer, or hand off to one of its
 * allowed next agents.
 *
 * The next agent receives the original task plus the full history of
 * responses from all previous agents.
 *
 * Key Characteristics:
 * - All agents are "equal" (no hierarchy)
 * - No specific order of agents (unlike collaboration)
 * - Only the first agent is defined as the entry point
 * - Each agent has a handoff list of possible next agents
 * - Each agent decides autonomously which handoff to use
 * - Structured output drives handoff decisions
 */

import {
  query,
  AgentDefinition,
  SDKAssistantMessage,
  SDKResultMessage,
} from '@anthropic-ai/claude-agent-sdk';

/** Structured output schema for agent decisions */
interface SwarmDecision {
  action: 'handoff' | 'finish';
  handoff_to?: string;
  content: string;
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['handoff', 'finish'],
      description: "'handoff' to pass work to another agent, 'finish' to return the final answer",
    },
    handoff_to: {
      type: 'string',
      description: 'Name of the agent to hand off to (required when action is handoff)',
    },
    content: {
      type: 'string',
      description: "The agent's contribution (always required — either intermediate work or final answer)",
    },
  },
  required: ['action', 'content'],
  additionalProperties: false,
} as const;

/**
 * Represents an agent in the swarm with its handoffs.
 */
class SwarmAgent {
  name: string;
  definition: AgentDefinition;
  handoffs: string[];

  constructor(name: string, definition: AgentDefinition, handoffs: string[] = []) {
    this.name = name;
    this.definition = definition;
    this.handoffs = handoffs;
  }
}

interface HistoryEntry {
  agent: string;
  content: string;
}

/**
 * Manages a swarm of agents with dynamic handoffs.
 *
 * Each agent runs in its own isolated session. Structured output controls
 * whether an agent finishes or hands off. The next agent receives the
 * original task plus full conversation history.
 */
class Swarm {
  private static readonly MAX_HANDOFFS = 10;
  private agents: Record<string, SwarmAgent>;
  private initialAgent: string;

  constructor(agents: Record<string, SwarmAgent>, initialAgent: string) {
    this.agents = agents;
    this.initialAgent = initialAgent;
  }

  /**
   * Execute the swarm pattern with the initial task.
   * Loops until an agent returns action='finish' or MAX_HANDOFFS is reached.
   * Each agent receives the original task + full history of all previous responses.
   */
  async execute(initialTask: string): Promise<string> {
    let currentAgent = this.initialAgent;
    const history: HistoryEntry[] = [];

    for (let handoffCount = 0; handoffCount < Swarm.MAX_HANDOFFS; handoffCount++) {
      const agent = this.agents[currentAgent];

      console.log(`\n${'='.repeat(60)}`);
      console.log(`Current Agent: ${currentAgent} (handoff ${handoffCount}/${Swarm.MAX_HANDOFFS})`);
      console.log('='.repeat(60));

      // Build handoff information
      let handoffInfo: string;
      if (agent.handoffs.length > 0) {
        handoffInfo = agent.handoffs
          .map((name) => `- ${name}: ${this.agents[name].definition.description}`)
          .join('\n');
      } else {
        handoffInfo = 'None — you must finish and provide the final answer';
      }

      // Build history section
      const historyText =
        history.length > 0
          ? history.map((entry) => `[${entry.agent}]: ${entry.content}`).join('\n\n')
          : '(none — you are the first agent)';

      const handoffNames =
        agent.handoffs.length > 0 ? agent.handoffs.join(', ') : 'none';

      const prompt = `You are ${currentAgent}, working in a swarm of collaborative agents.

Your role: ${agent.definition.description}

Original task:
${initialTask}

Previous agent responses:
${historyText}

Agents you can hand off to: ${handoffNames}
${handoffInfo}

Process the task and decide:
- Set action to "handoff" and specify "handoff_to" to pass work to another agent
- Set action to "finish" when the task is fully resolved
Always include your contribution in "content".`;

      let structuredResult: SwarmDecision | null = null;

      for await (const message of query({
        prompt,
        options: {
          agents: { [currentAgent]: agent.definition },
          outputFormat: {
            type: 'json_schema',
            schema: RESPONSE_SCHEMA,
          },
        },
      })) {
        if (message.type === 'assistant') {
          const assistantMsg = message as SDKAssistantMessage;
          for (const block of assistantMsg.message.content) {
            if (block.type === 'text') {
              console.log(`  ${currentAgent}: ${block.text}`);
            } else if (block.type === 'tool_use') {
              console.log(`  [Using tool: ${block.name}]`);
            }
          }
        } else if (message.type === 'result') {
          const resultMsg = message as SDKResultMessage;
          if (resultMsg.subtype === 'success' && resultMsg.structured_output) {
            structuredResult = resultMsg.structured_output as SwarmDecision;
          }
          if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
            console.log(`  Cost for ${currentAgent}: $${resultMsg.total_cost_usd.toFixed(4)}`);
          }
        }
      }

      if (!structuredResult) {
        console.log(`  Warning: No structured output from '${currentAgent}'`);
        continue;
      }

      // Record this agent's contribution in history
      history.push({
        agent: currentAgent,
        content: structuredResult.content,
      });

      if (structuredResult.action === 'finish') {
        console.log(`\n>>> Agent '${currentAgent}' finished the task.`);
        return structuredResult.content;
      }

      // Hand off to next agent
      const nextAgent = structuredResult.handoff_to ?? '';

      if (!agent.handoffs.includes(nextAgent)) {
        console.log(
          `  Warning: '${nextAgent}' is not in ${currentAgent}'s handoff list [${agent.handoffs.join(', ')}]`
        );
        continue;
      }

      console.log(`  >>> Handing off to '${nextAgent}'`);
      currentAgent = nextAgent;
    }

    console.log(`\n>>> Max handoffs (${Swarm.MAX_HANDOFFS}) reached.`);
    return history.length > 0 ? history[history.length - 1].content : '';
  }
}

async function demoSoftwareDevelopment() {
  console.log('\n' + '='.repeat(80));
  console.log('SWARM PATTERN DEMO: Software Development Workflow');
  console.log('='.repeat(80));

  const agents: Record<string, SwarmAgent> = {
    'requirements-analyst': new SwarmAgent(
      'requirements-analyst',
      {
        description: 'Analyzes requirements and creates technical specifications',
        prompt:
          'You are a requirements analyst. Analyze user requirements and create ' +
          'clear technical specifications. Focus on what needs to be built.',
        tools: ['Read', 'Grep'],
        model: 'sonnet',
      },
      ['architect']
    ),
    architect: new SwarmAgent(
      'architect',
      {
        description: 'Designs system architecture and components',
        prompt:
          'You are a software architect. Based on requirements, design the system ' +
          'architecture, define components, and specify technologies to use.',
        tools: ['Read', 'Glob'],
        model: 'sonnet',
      },
      ['developer', 'requirements-analyst']
    ),
    developer: new SwarmAgent(
      'developer',
      {
        description: 'Implements the solution based on architecture',
        prompt:
          'You are a software developer. Implement the solution based on the ' +
          'architecture and requirements. Write clean, maintainable code.',
        tools: ['Read', 'Write', 'Edit'],
        model: 'sonnet',
      },
      ['architect']
    ),
  };

  const swarm = new Swarm(agents, 'requirements-analyst');

  const task = `Create a simple REST API for a todo list application.
The API should support:
- Creating new todos
- Listing all todos
- Marking todos as complete
- Deleting todos
`;

  const result = await swarm.execute(task);

  console.log('\n' + '='.repeat(80));
  console.log('FINAL RESULT:');
  console.log('='.repeat(80));
  console.log(result);
}

async function main() {
  await demoSoftwareDevelopment();
}

main().catch(console.error);
