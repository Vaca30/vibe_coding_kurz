#!/usr/bin/env node
/**
 * Single Agent Example: Agent with Subagents
 *
 * Demonstrates using custom agents (subagents) with specialized roles and tools.
 * Each subagent has its own prompt, tools, and model configuration.
 */

import {
  query,
  SDKAssistantMessage,
  SDKResultMessage,
  AgentDefinition,
} from '@anthropic-ai/claude-agent-sdk';

async function exampleCodeReviewerAgent() {
  console.log('=== Example 1: Code Reviewer Subagent ===\n');

  const codeReviewer: AgentDefinition = {
    description: 'Reviews code for best practices and issues',
    prompt:
      'You are a code reviewer. Analyze code for bugs, performance issues, ' +
      'security vulnerabilities, and adherence to best practices. ' +
      'Provide constructive feedback with specific suggestions.',
    tools: ['Read', 'Grep', 'Glob'],
    model: 'sonnet',
  };

  for await (const message of query({
    prompt:
      'Use the code-reviewer agent to review the TypeScript files in the current directory',
    options: {
      agents: {
        'code-reviewer': codeReviewer,
      },
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`\nUsing tool: ${block.name}`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  console.log('\n');
}

async function exampleDocumentationWriterAgent() {
  console.log('=== Example 2: Documentation Writer Subagent ===\n');

  const docWriter: AgentDefinition = {
    description: 'Writes comprehensive technical documentation',
    prompt:
      'You are a technical documentation expert. Write clear, comprehensive ' +
      'documentation with examples. Focus on clarity, completeness, and proper structure. ' +
      'Use markdown formatting.',
    tools: ['Read', 'Write', 'Edit', 'Glob'],
    model: 'sonnet',
  };

  for await (const message of query({
    prompt:
      'Use the doc-writer agent to create a brief summary of what the 1a_simplest_agent.ts example demonstrates',
    options: {
      agents: {
        'doc-writer': docWriter,
      },
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`\nUsing tool: ${block.name}`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  console.log('\n');
}

async function exampleTestWriterAgent() {
  console.log('=== Example 3: Test Writer Subagent ===\n');

  const testWriter: AgentDefinition = {
    description: 'Creates comprehensive tests for code',
    prompt:
      'You are a testing expert. Write comprehensive tests ensuring code quality. ' +
      'Use Jest framework for TypeScript. Include edge cases, error handling, and proper assertions. ' +
      'Follow testing best practices.',
    tools: ['Read', 'Write', 'Bash', 'Grep'],
    model: 'sonnet',
  };

  for await (const message of query({
    prompt:
      'Use the test-writer agent to explain what tests would be needed for the custom tools example',
    options: {
      agents: {
        'test-writer': testWriter,
      },
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`\nUsing tool: ${block.name}`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  console.log('\n');
}

async function exampleMultipleSpecializedAgents() {
  console.log('=== Example 4: Multiple Specialized Subagents ===\n');

  const analyzer: AgentDefinition = {
    description: 'Analyzes code structure and patterns',
    prompt:
      'You are a code analyzer. Examine code structure, patterns, and architecture. ' +
      'Identify design patterns and code organization.',
    tools: ['Read', 'Grep', 'Glob'],
    model: 'sonnet',
  };

  const optimizer: AgentDefinition = {
    description: 'Suggests performance optimizations',
    prompt:
      'You are a performance optimization expert. Identify bottlenecks and suggest ' +
      'improvements for speed and efficiency.',
    tools: ['Read', 'Grep'],
    model: 'sonnet',
  };

  const securityAuditor: AgentDefinition = {
    description: 'Performs security audits',
    prompt:
      'You are a security auditor. Identify potential security vulnerabilities, ' +
      'unsafe practices, and suggest secure alternatives.',
    tools: ['Read', 'Grep', 'Glob'],
    model: 'sonnet',
  };

  for await (const message of query({
    prompt:
      'Use the analyzer agent to find TypeScript files in the src directory and describe their structure',
    options: {
      agents: {
        analyzer,
        optimizer,
        'security-auditor': securityAuditor,
      },
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`\nUsing tool: ${block.name}`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  console.log('\n');
}

async function exampleHierarchicalAgents() {
  console.log('=== Example 5: Hierarchical Subagents ===\n');

  const planner: AgentDefinition = {
    description: 'Plans development tasks',
    prompt:
      'You are a project planner. Break down tasks into steps and create actionable plans.',
    tools: ['Read', 'Write'],
    model: 'sonnet',
  };

  const executor: AgentDefinition = {
    description: 'Executes planned tasks',
    prompt:
      'You are a task executor. Implement plans efficiently and follow instructions precisely.',
    tools: ['Read', 'Write', 'Edit', 'Bash'],
    model: 'sonnet',
  };

  const reviewer: AgentDefinition = {
    description: 'Reviews completed work',
    prompt:
      'You are a quality reviewer. Check work for completeness, correctness, and quality.',
    tools: ['Read', 'Grep'],
    model: 'sonnet',
  };

  for await (const message of query({
    prompt: 'Use the planner agent to create a simple plan for how to organize code examples',
    options: {
      agents: {
        planner,
        executor,
        reviewer,
      },
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`\nUsing tool: ${block.name}`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  console.log('\n');
}

async function main() {
  await exampleCodeReviewerAgent();
  await exampleDocumentationWriterAgent();
  await exampleTestWriterAgent();
  await exampleMultipleSpecializedAgents();
  await exampleHierarchicalAgents();

  console.log('=== Subagents Summary ===');
  console.log('✓ AgentDefinition for custom agents');
  console.log('✓ Specialized prompts and tools per agent');
  console.log('✓ Model selection per agent');
  console.log('✓ Multiple agents working together');
  console.log('✓ Hierarchical agent setups');
}

main().catch(console.error);
