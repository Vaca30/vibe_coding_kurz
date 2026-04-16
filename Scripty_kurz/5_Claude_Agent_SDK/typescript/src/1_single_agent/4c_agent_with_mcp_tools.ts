#!/usr/bin/env node
/**
 * Single Agent Example (3c): Agent with External MCP Tools (Playwright)
 *
 * Demonstrates connecting to external MCP servers like Playwright for browser automation.
 * This example shows how to integrate with MCP servers running as separate processes.
 *
 * Prerequisites:
 *   npx @playwright/mcp@latest
 *
 * Unlike 3b which creates tools using tool() + createSdkMcpServer(),
 * this example connects to external MCP servers that run as separate processes.
 */

import {
  query,
  SDKAssistantMessage,
  SDKResultMessage,
} from '@anthropic-ai/claude-agent-sdk';

// ---------------------------------------------------------------------------
// Example 1: Navigate and extract page information
// ---------------------------------------------------------------------------
async function examplePlaywrightNavigation() {
  console.log('=== Example 1: Navigate and Extract Page Information ===\n');

  for await (const message of query({
    prompt:
      'Navigate to https://www.example.com and tell me what you see on the page. ' +
      'Use the snapshot tool to understand the page structure.',
    options: {
      mcpServers: {
        playwright: {
          command: 'npx',
          args: ['-y', '@playwright/mcp@latest'],
        },
      },
      allowedTools: [
        'mcp__playwright__browser_navigate',
        'mcp__playwright__browser_snapshot',
        'mcp__playwright__browser_screenshot',
      ],
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

// ---------------------------------------------------------------------------
// Example 2: Web page interaction
// ---------------------------------------------------------------------------
async function examplePlaywrightInteraction() {
  console.log('=== Example 2: Web Page Interaction ===\n');

  for await (const message of query({
    prompt:
      'Navigate to https://www.google.com, take a snapshot to understand the page structure, ' +
      'then describe the search interface you see.',
    options: {
      mcpServers: {
        playwright: {
          command: 'npx',
          args: ['-y', '@playwright/mcp@latest'],
          env: { NODE_ENV: 'production' },
        },
      },
      allowedTools: [
        'mcp__playwright__browser_navigate',
        'mcp__playwright__browser_click',
        'mcp__playwright__browser_type',
        'mcp__playwright__browser_snapshot',
      ],
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

// ---------------------------------------------------------------------------
// Example 3: Multi-page research
// ---------------------------------------------------------------------------
async function examplePlaywrightResearch() {
  console.log('=== Example 3: Multi-Page Research ===\n');

  for await (const message of query({
    prompt:
      'Navigate to https://www.wikipedia.org and find information about Python programming language. ' +
      'First go to the Wikipedia homepage, then search for Python, and summarize what you find.',
    options: {
      mcpServers: {
        playwright: {
          command: 'npx',
          args: ['-y', '@playwright/mcp@latest'],
        },
      },
      allowedTools: [
        'mcp__playwright__browser_navigate',
        'mcp__playwright__browser_snapshot',
        'mcp__playwright__browser_click',
        'mcp__playwright__browser_evaluate',
      ],
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

// ---------------------------------------------------------------------------
// Example 4: Screenshot analysis
// ---------------------------------------------------------------------------
async function exampleScreenshotAnalysis() {
  console.log('=== Example 4: Screenshot Analysis ===\n');

  for await (const message of query({
    prompt:
      'Navigate to https://github.com/microsoft/playwright-mcp and take a screenshot. ' +
      "Describe the repository's README and main features you see.",
    options: {
      mcpServers: {
        playwright: {
          command: 'npx',
          args: ['-y', '@playwright/mcp@latest'],
        },
      },
      allowedTools: [
        'mcp__playwright__browser_navigate',
        'mcp__playwright__browser_screenshot',
        'mcp__playwright__browser_snapshot',
      ],
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

// ---------------------------------------------------------------------------
// Example 5: Multiple MCP servers
// ---------------------------------------------------------------------------
async function exampleCombinedMcpServers() {
  console.log('=== Example 5: Multiple MCP Servers (Playwright + Filesystem) ===\n');

  for await (const message of query({
    prompt:
      'Navigate to https://www.example.com, get a snapshot of the page structure, ' +
      "and save a summary of what you find to a file called '/tmp/example_analysis.txt'.",
    options: {
      mcpServers: {
        playwright: {
          command: 'npx',
          args: ['-y', '@playwright/mcp@latest'],
        },
        // Add more servers as needed:
        // filesystem: {
        //   command: 'npx',
        //   args: ['-y', '@modelcontextprotocol/server-filesystem'],
        // },
      },
      allowedTools: [
        'mcp__playwright__browser_navigate',
        'mcp__playwright__browser_snapshot',
      ],
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('='.repeat(70));
  console.log('EXTERNAL MCP TOOLS WITH PLAYWRIGHT');
  console.log('='.repeat(70));
  console.log();
  console.log('This example demonstrates how to configure external MCP servers');
  console.log('using McpStdioServerConfig in your TypeScript code.');
  console.log();
  console.log('PREREQUISITES:');
  console.log('  - Node.js installed (for npx)');
  console.log('  - Internet connection (to download @playwright/mcp)');
  console.log();
  console.log('='.repeat(70));
  console.log();

  await examplePlaywrightNavigation();
  await examplePlaywrightInteraction();
  await examplePlaywrightResearch();
  await exampleScreenshotAnalysis();
  await exampleCombinedMcpServers();

  console.log('\n=== External MCP Tools Summary ===');
  console.log('✓ Configure external MCP servers with command/args objects');
  console.log('✓ Connect to external MCP servers (Playwright, Filesystem, etc.)');
  console.log('✓ Use tools from separate Node.js/Python processes');
  console.log('✓ Combine multiple MCP servers in one agent');
  console.log('✓ Browser automation with Playwright');
  console.log('✓ Tool names follow pattern: mcp__<server>__<tool>');
  console.log();
  console.log('Key differences from 3b (custom tools):');
  console.log('  3b: Define tools in TypeScript with tool() + createSdkMcpServer()');
  console.log('  3c: Configure external MCP servers with { command, args } objects');
}

main().catch(console.error);
