#!/usr/bin/env node
/**
 * Single Agent Example: Agent with Predefined Tools
 *
 * Demonstrates using built-in Claude Code tools like Read, Write, Bash, Glob, and Grep.
 */

import { query, SDKAssistantMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

async function exampleReadWrite() {
  console.log('=== Example 1: Read/Write Tools ===\n');

  for await (const message of query({
    prompt: 'Create a temporary file test.txt with content "Hello from Claude Agent SDK TypeScript"',
    options: {
      allowedTools: ['Read', 'Write'],
      permissionMode: 'bypassPermissions',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`Claude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`Using tool: ${block.name}`);
          console.log(`  Input:`, JSON.stringify(block.input, null, 2));
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

async function exampleBash() {
  console.log('=== Example 2: Bash Tool ===\n');

  for await (const message of query({
    prompt: 'Use bash to show the current date and time',
    options: {
      allowedTools: ['Bash'],
      permissionMode: 'bypassPermissions',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`Claude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`Using tool: ${block.name}`);
          console.log(`  Command: ${block.input.command}`);
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

async function exampleGlobGrep() {
  console.log('=== Example 3: Glob/Grep Tools ===\n');

  for await (const message of query({
    prompt: 'Find all TypeScript files in the current directory using Glob',
    options: {
      allowedTools: ['Glob', 'Grep'],
      permissionMode: 'bypassPermissions',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`Claude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`Using tool: ${block.name}`);
          console.log(`  Input:`, JSON.stringify(block.input, null, 2));
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

async function exampleMultipleTools() {
  console.log('=== Example 4: Multiple Tools Working Together ===\n');

  for await (const message of query({
    prompt: 'Find all package.json files in parent directory, read the first one, and extract the project name',
    options: {
      allowedTools: ['Read', 'Glob', 'Bash'],
      permissionMode: 'bypassPermissions',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`Claude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`Using tool: ${block.name}`);
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
  await exampleReadWrite();
  await exampleBash();
  await exampleGlobGrep();
  await exampleMultipleTools();

  console.log('=== Predefined Tools Summary ===');
  console.log('✓ Read/Write for file operations');
  console.log('✓ Bash for command execution');
  console.log('✓ Glob/Grep for searching');
  console.log('✓ Multiple tools can work together');
  console.log('✓ Permission modes control tool access');
}

main().catch(console.error);
