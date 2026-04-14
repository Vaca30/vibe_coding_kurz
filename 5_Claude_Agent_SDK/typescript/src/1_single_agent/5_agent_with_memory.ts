#!/usr/bin/env node
/**
 * Single Agent Example: Agent with Memory
 *
 * Demonstrates continuing conversations - the agent remembers previous exchanges
 * and can reference them in subsequent queries using async iterables.
 */

import {
  query,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';

async function* conversationFlow(): AsyncGenerator<SDKUserMessage> {
  // First message
  yield {
    type: 'user',
    message: {
      role: 'user',
      content: [{ type: 'text', text: 'My favorite color is blue.' }],
    },
  };

  // Wait a bit (simulating user thinking)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Second message
  yield {
    type: 'user',
    message: {
      role: 'user',
      content: [{ type: 'text', text: 'What color did I just tell you about?' }],
    },
  };

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Third message
  yield {
    type: 'user',
    message: {
      role: 'user',
      content: [{ type: 'text', text: 'Can you suggest a complementary color to my favorite?' }],
    },
  };
}

async function exampleConversationMemory() {
  console.log('=== Example 1: Conversation with Memory ===\n');

  let messageCount = 0;

  for await (const message of query({
    prompt: conversationFlow(),
    options: {
      systemPrompt: 'You are a helpful assistant with memory of our conversation.',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}`);
        }
      }
      messageCount++;
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\n\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
      console.log(`Total messages: ${messageCount}`);
    }
  }

  console.log('\n');
}

async function* technicalConversation(): AsyncGenerator<SDKUserMessage> {
  yield {
    type: 'user',
    message: {
      role: 'user',
      content: [
        { type: 'text', text: 'Explain what a list comprehension is in Python in one sentence.' },
      ],
    },
  };

  await new Promise((resolve) => setTimeout(resolve, 100));

  yield {
    type: 'user',
    message: {
      role: 'user',
      content: [{ type: 'text', text: 'Give me a simple code example of what you just explained.' }],
    },
  };

  await new Promise((resolve) => setTimeout(resolve, 100));

  yield {
    type: 'user',
    message: {
      role: 'user',
      content: [{ type: 'text', text: 'How is that different from a regular for loop?' }],
    },
  };
}

async function exampleTechnicalConversation() {
  console.log('=== Example 2: Technical Conversation with Context ===\n');

  let messageCount = 0;

  for await (const message of query({
    prompt: technicalConversation(),
    options: {
      systemPrompt: 'You are a Python programming tutor.',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}`);
        }
      }
      messageCount++;
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\n\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
      console.log(`Total messages: ${messageCount}`);
    }
  }

  console.log('\n');
}

async function exampleSessionContinuation() {
  console.log('=== Example 3: Session Continuation ===\n');

  let sessionId: string | undefined;

  // First session
  console.log('--- First Session ---\n');
  for await (const message of query({
    prompt: 'Remember this number: 42',
    options: {
      systemPrompt: 'You are a helpful assistant.',
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
      sessionId = resultMsg.session_id;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
      console.log(`Session ID: ${sessionId}\n`);
    }
  }

  // Second session - resuming from first
  if (sessionId) {
    console.log('--- Resumed Session ---\n');
    for await (const message of query({
      prompt: 'What number did I ask you to remember?',
      options: {
        resume: sessionId,
        systemPrompt: 'You are a helpful assistant.',
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
          console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
        }
      }
    }
  }

  console.log('\n');
}

async function main() {
  await exampleConversationMemory();
  await exampleTechnicalConversation();
  await exampleSessionContinuation();

  console.log('=== Memory Examples Summary ===');
  console.log('✓ Async iterables for multi-turn conversations');
  console.log('✓ Context retention across messages');
  console.log('✓ Session continuation with resume');
  console.log('✓ Building on previous responses');
}

main().catch(console.error);
