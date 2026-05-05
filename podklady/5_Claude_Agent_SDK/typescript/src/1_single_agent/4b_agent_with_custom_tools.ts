#!/usr/bin/env node
/**
 * Single Agent Example: Agent with Custom Tools (MCP)
 *
 * Demonstrates creating custom tools using SDK MCP servers with the tool() function.
 * This example uses simple calculator and string manipulation tools.
 */

import {
  query,
  tool,
  createSdkMcpServer,
  SDKAssistantMessage,
  SDKResultMessage,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Define custom calculator tools
const addTool = tool(
  'add',
  'Add two numbers together',
  {
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  },
  async (args) => {
    const result = args.a + args.b;
    return {
      content: [
        {
          type: 'text' as const,
          text: `Result: ${args.a} + ${args.b} = ${result}`,
        },
      ],
    };
  }
);

const multiplyTool = tool(
  'multiply',
  'Multiply two numbers together',
  {
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  },
  async (args) => {
    const result = args.a * args.b;
    return {
      content: [
        {
          type: 'text' as const,
          text: `Result: ${args.a} × ${args.b} = ${result}`,
        },
      ],
    };
  }
);

const powerTool = tool(
  'power',
  'Raise a number to a power',
  {
    base: z.number().describe('Base number'),
    exponent: z.number().describe('Exponent'),
  },
  async (args) => {
    const result = Math.pow(args.base, args.exponent);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Result: ${args.base}^${args.exponent} = ${result}`,
        },
      ],
    };
  }
);

// Define custom string manipulation tools
const reverseTool = tool(
  'reverse',
  'Reverse a string',
  {
    text: z.string().describe('Text to reverse'),
  },
  async (args) => {
    const result = args.text.split('').reverse().join('');
    return {
      content: [
        {
          type: 'text' as const,
          text: `Reversed: "${result}"`,
        },
      ],
    };
  }
);

const uppercaseTool = tool(
  'uppercase',
  'Convert a string to uppercase',
  {
    text: z.string().describe('Text to convert'),
  },
  async (args) => {
    const result = args.text.toUpperCase();
    return {
      content: [
        {
          type: 'text' as const,
          text: `Uppercase: "${result}"`,
        },
      ],
    };
  }
);

const wordCountTool = tool(
  'word_count',
  'Count the number of words in a text',
  {
    text: z.string().describe('Text to count words in'),
  },
  async (args) => {
    const words = args.text.trim().split(/\s+/);
    const count = words.filter((w) => w.length > 0).length;
    return {
      content: [
        {
          type: 'text' as const,
          text: `Word count: ${count} words`,
        },
      ],
    };
  }
);

async function exampleCalculatorTools() {
  console.log('=== Example 1: Calculator Tools ===\n');

  // Create MCP server with calculator tools
  const calcServer = createSdkMcpServer({
    name: 'calculator',
    version: '1.0.0',
    tools: [addTool, multiplyTool],
  });

  for await (const message of query({
    prompt: 'Use the calculator tools to compute (15 + 27) * 3',
    options: {
      mcpServers: { calc: calcServer },
      allowedTools: ['mcp__calc__add', 'mcp__calc__multiply'],
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`\nUsing tool: ${block.name}`);
          console.log(`  Input:`, block.input);
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

async function examplePowerTool() {
  console.log('=== Example 2: Power Calculator ===\n');

  const mathServer = createSdkMcpServer({
    name: 'math',
    version: '1.0.0',
    tools: [powerTool],
  });

  for await (const message of query({
    prompt: 'Calculate 2 to the power of 10',
    options: {
      mcpServers: { math: mathServer },
      allowedTools: ['mcp__math__power'],
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`\nUsing tool: ${block.name}`);
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

async function exampleStringTools() {
  console.log('=== Example 3: String Manipulation Tools ===\n');

  const stringServer = createSdkMcpServer({
    name: 'strings',
    version: '1.0.0',
    tools: [reverseTool, uppercaseTool, wordCountTool],
  });

  for await (const message of query({
    prompt: 'Use the string tools to: 1) reverse "hello world", 2) convert it to uppercase, and 3) count the words',
    options: {
      mcpServers: { strings: stringServer },
      allowedTools: [
        'mcp__strings__reverse',
        'mcp__strings__uppercase',
        'mcp__strings__word_count',
      ],
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`\nUsing tool: ${block.name}`);
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

async function exampleCombinedTools() {
  console.log('=== Example 4: Combined Tools from Multiple Servers ===\n');

  const calcServer = createSdkMcpServer({
    name: 'calculator',
    version: '1.0.0',
    tools: [addTool, multiplyTool, powerTool],
  });

  const stringServer = createSdkMcpServer({
    name: 'strings',
    version: '1.0.0',
    tools: [wordCountTool],
  });

  for await (const message of query({
    prompt: 'First, calculate 5 + 7. Then count the words in "The quick brown fox jumps over the lazy dog"',
    options: {
      mcpServers: {
        calc: calcServer,
        strings: stringServer,
      },
      allowedTools: [
        'mcp__calc__add',
        'mcp__calc__multiply',
        'mcp__calc__power',
        'mcp__strings__word_count',
      ],
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}`);
        } else if (block.type === 'tool_use') {
          console.log(`\nUsing tool: ${block.name}`);
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
  await exampleCalculatorTools();
  await examplePowerTool();
  await exampleStringTools();
  await exampleCombinedTools();

  console.log('=== Custom Tools Summary ===');
  console.log('✓ tool() function for easy definition');
  console.log('✓ Zod schemas for parameter validation');
  console.log('✓ Type-safe tool handlers');
  console.log('✓ Error handling for robust operations');
  console.log('✓ Structured data in MCP-compatible format');
  console.log('✓ Multiple tool composition for complex queries');
  console.log('✓ Multiple MCP servers working together');
}

main().catch(console.error);
