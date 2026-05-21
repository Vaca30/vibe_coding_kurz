#!/usr/bin/env node
/**
 * Anthropic Cloud Model Demo — query()
 *
 * Demonstrates how to use a standard Anthropic cloud model with
 * both one-shot and multi-turn patterns.
 *
 * Setup:
 *   export ANTHROPIC_API_KEY=your_api_key_here
 */

import {
  query,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';

const MODEL = 'claude-sonnet-4-5-20250929';

// ---------------------------------------------------------------------------
// Example 1 — query(): simple, stateless, one-shot
// ---------------------------------------------------------------------------
async function exampleQuery() {
  console.log('=== Example 1: query() — Simple One-Shot ===\n');

  for await (const message of query({
    prompt: 'Tell me about Python programming.',
    options: {
      model: MODEL,
      systemPrompt: 'You are a helpful assistant.',
      maxTurns: 1,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`Claude: ${block.text}`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      console.log(`Turns: ${resultMsg.num_turns}`);
    }
  }

  console.log('\n');
}

// ---------------------------------------------------------------------------
// Example 2 — Multi-turn conversation with memory
// ---------------------------------------------------------------------------
async function exampleMultiTurn() {
  console.log('=== Example 2: Multi-Turn Conversation ===\n');

  async function* conversation(): AsyncGenerator<SDKUserMessage> {
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'What is 2 + 2?' }],
      },
    };

    await new Promise((resolve) => setTimeout(resolve, 100));

    yield {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'Double that result.' }],
      },
    };
  }

  for await (const message of query({
    prompt: conversation(),
    options: {
      model: MODEL,
      systemPrompt: 'You are a helpful assistant.',
      maxTurns: 3,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`Claude: ${block.text}`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`Cost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
      console.log(`Duration: ${resultMsg.duration_ms}ms`);
    }
  }

  console.log('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await exampleQuery();
  await exampleMultiTurn();
}

main().catch(console.error);
