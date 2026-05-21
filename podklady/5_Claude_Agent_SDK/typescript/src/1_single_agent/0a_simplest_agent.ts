#!/usr/bin/env node
/**
 * Single Agent Example (a): Simplest Agent Possible
 *
 * Demonstrates the most basic usage of the Claude SDK - just a simple query.
 */

import { query, SDKAssistantMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

async function main() {
  console.log('=== Simplest Agent Example ===\n');
  console.log('Asking Claude: What is 2 + 2?\n');

  for await (const message of query({ prompt: 'What is 2 + 2?' })) {
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
      console.log(`Duration: ${resultMsg.duration_ms}ms`);
    }
  }
}

main().catch(console.error);
