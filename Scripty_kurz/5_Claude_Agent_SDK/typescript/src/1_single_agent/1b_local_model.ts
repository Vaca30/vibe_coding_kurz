#!/usr/bin/env node
/**
 * Local Model Demo — query() with Ollama (gpt-oss)
 *
 * Demonstrates how to use a local Ollama model with both
 * one-shot and multi-turn patterns.
 *
 * Setup:
 *   ollama pull gpt-oss
 *   OLLAMA_CONTEXT_LENGTH=32768 ollama serve
 */

import {
  query,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';

// Point the SDK to your local Ollama instance
process.env.ANTHROPIC_BASE_URL = 'http://localhost:11434';
process.env.ANTHROPIC_AUTH_TOKEN = 'ollama';
process.env.ANTHROPIC_API_KEY = '';

const LOCAL_MODEL = 'gpt-oss:20b';

// ---------------------------------------------------------------------------
// Example 1 — query(): simple, stateless, one-shot
// ---------------------------------------------------------------------------
async function exampleQuery() {
  console.log('=== Example 1: query() — Simple One-Shot ===\n');

  for await (const message of query({
    prompt: 'Tell me about Python programming.',
    options: {
      model: LOCAL_MODEL,
      systemPrompt: 'You are a helpful assistant.',
      maxTurns: 1,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`gpt-oss: ${block.text}`);
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
      model: LOCAL_MODEL,
      systemPrompt: 'You are a helpful assistant.',
      maxTurns: 3,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`gpt-oss: ${block.text}`);
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
