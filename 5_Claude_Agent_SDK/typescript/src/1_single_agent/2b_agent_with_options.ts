#!/usr/bin/env node
/**
 * Script 2: query() — Full Feature Demo
 *
 * Demonstrates the full capabilities of the query() API:
 *   - Multi-turn memory via async generators
 *   - Append system prompt (extend default, don't replace)
 *   - Custom in-process tools (@tool + createSdkMcpServer)
 *   - Hooks (PreToolUse, PostToolUse, UserPromptSubmit)
 *   - Session continuation via resume
 */

import {
  query,
  tool,
  createSdkMcpServer,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKUserMessage,
  HookCallback,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Example 1 — Multi-turn: async generator retains context across messages
// ---------------------------------------------------------------------------
async function exampleMultiTurn() {
  console.log('=== Example 1: Multi-Turn — Context Retained ===\n');
  console.log('  Unlike separate query() calls, an async generator retains');
  console.log('  context across all yielded messages.\n');

  async function* conversation(): AsyncGenerator<SDKUserMessage> {
    // Turn 1 — plant a fact
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'My favourite language is Python.' }],
      },
    };

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Turn 2 — model WILL remember turn 1
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'What is my favourite language?' }],
      },
    };

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Turn 3 — build further
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'Name one killer feature of that language.' }],
      },
    };
  }

  let turn = 0;
  for await (const message of query({
    prompt: conversation(),
    options: {
      systemPrompt: 'You are a concise assistant.',
      maxTurns: 5,
    },
  })) {
    if (message.type === 'assistant') {
      turn++;
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`  [Turn ${turn}] Claude: ${block.text}`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      console.log(`  [turns=${resultMsg.num_turns}]`);
    }
  }

  console.log('\n');
}

// ---------------------------------------------------------------------------
// Example 2 — Append system prompt: extend the default prompt, don't replace
// ---------------------------------------------------------------------------
async function exampleAppendSystemPrompt() {
  console.log('=== Example 2: Append System Prompt ===\n');
  console.log('  systemPrompt="..." REPLACES the default Claude Code prompt.');
  console.log('  SystemPromptPreset with "append" EXTENDS it instead.\n');

  // Option A — plain string: REPLACES the entire default system prompt
  console.log('  [Replace] Using a plain string systemPrompt (replaces default)...');
  for await (const message of query({
    prompt: 'What can you do?',
    options: {
      systemPrompt: 'You are a concise assistant.',
      maxTurns: 1,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`  [Replace] Claude: ${block.text}`);
        }
      }
    }
  }

  // Option B — preset: APPENDS to the default Claude Code system prompt
  console.log('\n  [Append] Using SystemPromptPreset with append (extends default)...');
  for await (const message of query({
    prompt: 'What can you do?',
    options: {
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: 'Always respond in exactly one sentence.',
      },
      maxTurns: 1,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`  [Append] Claude: ${block.text}`);
        }
      }
    }
  }

  console.log('\n');
}

// ---------------------------------------------------------------------------
// Example 3 — Custom in-process tools via tool() + createSdkMcpServer
// ---------------------------------------------------------------------------
async function exampleCustomTools() {
  console.log('=== Example 3: Custom In-Process Tools ===\n');

  const calculateTool = tool(
    'calculate',
    'Evaluate a safe mathematical expression and return the result.',
    {
      expression: z.string().describe('Mathematical expression to evaluate'),
    },
    async (args) => {
      try {
        // Simple safe eval for math expressions
        const result = Function(`"use strict"; return (${args.expression})`)();
        return {
          content: [{ type: 'text' as const, text: `Result: ${result}` }],
        };
      } catch (e: any) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${e.message}` }],
        };
      }
    }
  );

  const greetTool = tool(
    'greet',
    'Greet a user by name.',
    {
      name: z.string().describe('Name of the person to greet'),
    },
    async (args) => {
      return {
        content: [{ type: 'text' as const, text: `Hello, ${args.name}!` }],
      };
    }
  );

  const server = createSdkMcpServer({
    name: 'my-tools',
    version: '1.0.0',
    tools: [calculateTool, greetTool],
  });

  for await (const message of query({
    prompt: 'Calculate 17 * 42, then greet Alice.',
    options: {
      mcpServers: { 'my-tools': server },
      allowedTools: ['mcp__my-tools__calculate', 'mcp__my-tools__greet'],
      maxTurns: 3,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`  Claude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`  Using tool: ${block.name}`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`  Cost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  console.log('\n');
}

// ---------------------------------------------------------------------------
// Example 4 — Hooks: intercept tool calls before/after execution
// ---------------------------------------------------------------------------
async function exampleHooks() {
  console.log('=== Example 4: Hooks (PreToolUse / PostToolUse) ===\n');
  console.log('  Hooks let you intercept, log, or block tool calls deterministically.\n');

  const intercepted: string[] = [];

  const logPreTool: HookCallback = async (input) => {
    if (input.hook_event_name === 'PreToolUse') {
      const toolName = input.tool_name || 'unknown';
      intercepted.push(`PRE  → ${toolName}`);
      console.log(`  [Hook PreToolUse]  tool=${toolName}`);

      // Block dangerous commands
      const command = (input.tool_input as any)?.command || '';
      if (toolName === 'Bash' && command.includes('rm -rf')) {
        console.log(`  [Hook] BLOCKED dangerous command: ${command}`);
        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: 'Dangerous rm -rf command blocked by hook.',
          },
        };
      }
    }
    return {};
  };

  const logPostTool: HookCallback = async (input) => {
    if (input.hook_event_name === 'PostToolUse') {
      const toolName = input.tool_name || 'unknown';
      intercepted.push(`POST → ${toolName}`);
      console.log(`  [Hook PostToolUse] tool=${toolName}`);
    }
    return {};
  };

  for await (const message of query({
    prompt: "Run: echo 'hello hooks' in bash.",
    options: {
      allowedTools: ['Bash', 'Glob'],
      permissionMode: 'acceptEdits',
      maxTurns: 3,
      hooks: {
        PreToolUse: [
          { hooks: [logPreTool] },
          { matcher: 'Bash', hooks: [logPreTool] },
        ],
        PostToolUse: [{ hooks: [logPostTool] }],
      },
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`  Claude: ${block.text}`);
        }
      }
    }
  }

  console.log(`\n  Intercepted events: [${intercepted.join(', ')}]\n`);
}

// ---------------------------------------------------------------------------
// Example 5 — Session continuation via resume
// ---------------------------------------------------------------------------
async function exampleSessionContinuation() {
  console.log('=== Example 5: Session Continuation ===\n');

  let sessionId: string | undefined;

  // Session A
  console.log('  [Session A] Planting a fact...');
  for await (const message of query({
    prompt: 'Remember: the secret code is ALPHA-7.',
    options: { maxTurns: 1 },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`  [Session A] Claude: ${block.text}`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      sessionId = resultMsg.session_id;
      console.log(`  Session ID: ${sessionId}`);
    }
  }

  // Session B — completely fresh, no memory of Session A
  console.log('\n  [Session B] New session — model will not know the code...');
  for await (const message of query({
    prompt: 'What is the secret code? (New session — you will not know.)',
    options: { maxTurns: 1 },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`  [Session B] Claude: ${block.text}`);
        }
      }
    }
  }

  // Session C — resumed from Session A
  if (sessionId) {
    console.log('\n  [Session C] Resumed session — model WILL know the code...');
    for await (const message of query({
      prompt: 'What is the secret code?',
      options: { resume: sessionId },
    })) {
      if (message.type === 'assistant') {
        const assistantMsg = message as SDKAssistantMessage;
        for (const block of assistantMsg.message.content) {
          if (block.type === 'text') {
            console.log(`  [Session C] Claude: ${block.text}`);
          }
        }
      }
    }
  }

  console.log('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('='.repeat(65));
  console.log('  query() API — Full Feature Demo');
  console.log('='.repeat(65));
  console.log();

  await exampleMultiTurn();
  await exampleAppendSystemPrompt();
  await exampleCustomTools();
  await exampleHooks();
  await exampleSessionContinuation();

  console.log('='.repeat(65));
  console.log('  Summary');
  console.log('='.repeat(65));
  console.log(`
  query()  ✅ Multi-turn memory    (via async generators)
  query()  ✅ Append system prompt  (extend default, don't replace)
  query()  ✅ Custom tools          (tool() + createSdkMcpServer)
  query()  ✅ Hooks                 (PreToolUse, PostToolUse, …)
  query()  ✅ Session continuation  (resume from previous session)
`);
}

main().catch(console.error);
