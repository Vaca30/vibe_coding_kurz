#!/usr/bin/env node
/**
 * Single Agent Example: Agent with Hooks
 *
 * Demonstrates using hooks to intercept and modify agent behavior:
 * - PreToolUse: Validate or block tool usage before execution
 * - PostToolUse: Process tool results after execution
 * - UserPromptSubmit: Add context when user submits a prompt
 */

import {
  query,
  SDKAssistantMessage,
  SDKResultMessage,
  HookCallback,
} from '@anthropic-ai/claude-agent-sdk';

// Hook callbacks
const safetyCheckHook: HookCallback = async (input) => {
  if (input.hook_event_name === 'PreToolUse') {
    const toolName = input.tool_name;
    const toolInput = input.tool_input as any;

    // Block dangerous commands
    if (toolName === 'Bash') {
      const command = toolInput?.command || '';
      const dangerousPatterns = ['rm -rf', 'delete', 'format'];

      for (const pattern of dangerousPatterns) {
        if (command.toLowerCase().includes(pattern)) {
          console.log(`[HOOK] 🚫 Blocked dangerous command: ${command}\n`);
          return {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'deny',
              permissionDecisionReason: `Command contains dangerous pattern: ${pattern}`,
            },
          };
        }
      }
    }

    // Allow safe commands
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: 'Tool usage approved',
      },
    };
  }
  return {};
};

const loggingHook: HookCallback = async (input) => {
  if (input.hook_event_name === 'PostToolUse') {
    const toolName = input.tool_name;
    const toolResponse = input.tool_response;

    console.log(`[HOOK] 📝 Tool '${toolName}' executed`);

    // Check for errors in tool output
    if (JSON.stringify(toolResponse).toLowerCase().includes('error')) {
      console.log(`[HOOK] ⚠️ Tool execution had errors\n`);
      return {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext:
            'The tool encountered an error. Consider alternative approaches.',
        },
      };
    }

    console.log(`[HOOK] ✅ Tool execution successful\n`);
  }
  return {};
};

const contextInjectionHook: HookCallback = async (input) => {
  if (input.hook_event_name === 'UserPromptSubmit') {
    console.log('[HOOK] 💬 Adding context: User prefers concise responses\n');
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: 'Keep responses concise and to the point.',
      },
    };
  }
  return {};
};

async function examplePreToolUseHook() {
  console.log('=== Example 1: PreToolUse Hook (Safety Validation) ===\n');

  // Test 1: Safe command
  console.log('Test 1: Safe command');
  console.log("User: Run command: echo 'Hello World'\n");

  for await (const message of query({
    prompt: "Run this bash command: echo 'Hello World'",
    options: {
      allowedTools: ['Bash'],
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [safetyCheckHook],
          },
        ],
      },
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
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}\n`);
      }
    }
  }

  // Test 2: Dangerous command (will be blocked)
  console.log('Test 2: Dangerous command (should be blocked)');
  console.log('User: Run command: rm -rf /tmp/test\n');

  for await (const message of query({
    prompt: 'Run this bash command: rm -rf /tmp/test',
    options: {
      allowedTools: ['Bash'],
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [safetyCheckHook],
          },
        ],
      },
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
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}\n`);
      }
    }
  }

  console.log('\n');
}

async function examplePostToolUseHook() {
  console.log('=== Example 2: PostToolUse Hook (Logging) ===\n');

  console.log('User: List files in current directory\n');

  for await (const message of query({
    prompt: 'List files in the current directory using ls',
    options: {
      allowedTools: ['Bash'],
      permissionMode: 'bypassPermissions',
      hooks: {
        PostToolUse: [
          {
            matcher: 'Bash',
            hooks: [loggingHook],
          },
        ],
      },
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
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}\n`);
      }
    }
  }

  console.log('\n');
}

async function exampleUserPromptSubmitHook() {
  console.log('=== Example 3: UserPromptSubmit Hook (Context Injection) ===\n');

  console.log('User: Explain async programming\n');

  for await (const message of query({
    prompt: 'Explain async programming in Python',
    options: {
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [contextInjectionHook],
          },
        ],
      },
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
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}\n`);
      }
    }
  }

  console.log('\n');
}

async function exampleMultipleHooks() {
  console.log('=== Example 4: Multiple Hooks ===\n');

  console.log('User: Show me the current directory path\n');

  for await (const message of query({
    prompt: 'Show me the current directory path using pwd command',
    options: {
      allowedTools: ['Bash'],
      permissionMode: 'bypassPermissions',
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [safetyCheckHook],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Bash',
            hooks: [loggingHook],
          },
        ],
        UserPromptSubmit: [
          {
            hooks: [contextInjectionHook],
          },
        ],
      },
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
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}\n`);
      }
    }
  }

  console.log('\n');
}

async function main() {
  await examplePreToolUseHook();
  await examplePostToolUseHook();
  await exampleUserPromptSubmitHook();
  await exampleMultipleHooks();

  console.log('=== Hooks Summary ===');
  console.log('✓ PreToolUse hook for safety validation');
  console.log('✓ PostToolUse hook for logging and error handling');
  console.log('✓ UserPromptSubmit hook for context injection');
  console.log('✓ Multiple hooks working together');
  console.log('✓ Hook matchers for specific tools');
}

main().catch(console.error);
