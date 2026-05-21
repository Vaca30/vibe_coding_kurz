#!/usr/bin/env node
/**
 * Single Agent Example (b): Simplest Agent with Streaming
 *
 * Demonstrates streaming responses for real-time output.
 */

import { query, SDKPartialAssistantMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

async function main() {
  console.log('=== Simplest Agent with Streaming ===\n');
  console.log('Asking Claude: Write a short haiku about coding.\n');

  let fullText = '';

  for await (const message of query({
    prompt: 'Write a short haiku about coding.',
    options: { streaming: true },
  })) {
    if (message.type === 'partial_assistant_message') {
      const partial = message as SDKPartialAssistantMessage;
      if (partial.delta?.type === 'text_delta') {
        process.stdout.write(partial.delta.text);
        fullText += partial.delta.text;
      }
    } else if (message.type === 'result_message') {
      const resultMsg = message as SDKResultMessage;
      console.log('\n');
      if (resultMsg.totalCostUsd && resultMsg.totalCostUsd > 0) {
        console.log(`\nCost: $${resultMsg.totalCostUsd.toFixed(4)}`);
      }
      console.log(`Duration: ${resultMsg.durationMs}ms`);
    }
  }
}

main().catch(console.error);
