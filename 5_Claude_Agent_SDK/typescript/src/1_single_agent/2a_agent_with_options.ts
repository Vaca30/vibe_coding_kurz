#!/usr/bin/env node
/**
 * Single Agent Example: Agent with Options
 *
 * Demonstrates using Options to configure the agent with:
 * - Custom system prompts
 * - Model selection
 * - Max turns
 * - Permission modes
 */

import { query, SDKAssistantMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

async function exampleSystemPrompt() {
  console.log('=== Example 1: Custom System Prompt ===\n');

  for await (const message of query({
    prompt: 'Tell me about Python programming.',
    options: {
      systemPrompt: 'You are a helpful assistant that always responds in a pirate accent.',
      maxTurns: 1,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}\n`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`Cost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  console.log('\n');
}

async function exampleModelSelection() {
  console.log('=== Example 2: Model Selection ===\n');

  for await (const message of query({
    prompt: 'Explain the difference between async and sync in one sentence.',
    options: {
      model: 'claude-sonnet-4-5-20250929',
      systemPrompt: 'You are a code review assistant.',
      maxTurns: 1,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}\n`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`Cost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
      console.log(`Model: ${resultMsg.usage?.model || 'N/A'}`);
    }
  }

  console.log('\n');
}

async function examplePermissionMode() {
  console.log('=== Example 3: Permission Mode ===\n');

  for await (const message of query({
    prompt: 'What permission mode allows auto-accepting file edits?',
    options: {
      permissionMode: 'acceptEdits', // Auto-accept file edits
      systemPrompt: 'You are a helpful file management assistant.',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}\n`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`Cost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  console.log('\n');
}

async function exampleCombinedOptions() {
  console.log('=== Example 4: Combined Options ===\n');

  for await (const message of query({
    prompt: 'Explain what Options configuration is in 2 sentences.',
    options: {
      systemPrompt: 'You are a concise technical documentation writer.',
      model: 'claude-sonnet-4-5-20250929',
      maxTurns: 2,
      permissionMode: 'default',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}\n`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`Cost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
      console.log(`Turns: ${resultMsg.num_turns}`);
    }
  }

  console.log('\n');
}

async function main() {
  await exampleSystemPrompt();
  await exampleModelSelection();
  await examplePermissionMode();
  await exampleCombinedOptions();
}

main().catch(console.error);
