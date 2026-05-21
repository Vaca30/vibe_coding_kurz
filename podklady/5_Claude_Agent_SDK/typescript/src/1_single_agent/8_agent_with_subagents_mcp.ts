#!/usr/bin/env node
/**
 * Single Agent Example: Agent with Subagents Using MCP Tools
 *
 * Demonstrates using specialized subagents that have access to MCP tools.
 * Each subagent can use both custom MCP tools (calculator, data analysis).
 */

import {
  query,
  tool,
  createSdkMcpServer,
  SDKAssistantMessage,
  SDKResultMessage,
  AgentDefinition,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// ============================================================================
// Custom MCP Tools for Data Analysis
// ============================================================================

const calculateAverage = tool(
  'calculate_average',
  'Calculate the average of an array of numbers',
  {
    numbers: z.array(z.number()).describe('Array of numbers to average'),
  },
  async (args) => {
    const sum = args.numbers.reduce((a, b) => a + b, 0);
    const avg = sum / args.numbers.length;
    return {
      content: [
        {
          type: 'text' as const,
          text: `Average of [${args.numbers.join(', ')}] = ${avg.toFixed(2)}`,
        },
      ],
    };
  }
);

const calculateStdDev = tool(
  'calculate_stddev',
  'Calculate the standard deviation of an array of numbers',
  {
    numbers: z.array(z.number()).describe('Array of numbers'),
  },
  async (args) => {
    const n = args.numbers.length;
    const mean = args.numbers.reduce((a, b) => a + b, 0) / n;
    const variance =
      args.numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Standard Deviation of [${args.numbers.join(', ')}] = ${stdDev.toFixed(2)}`,
        },
      ],
    };
  }
);

const findMinMax = tool(
  'find_min_max',
  'Find the minimum and maximum values in an array of numbers',
  {
    numbers: z.array(z.number()).describe('Array of numbers'),
  },
  async (args) => {
    const min = Math.min(...args.numbers);
    const max = Math.max(...args.numbers);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Min: ${min}, Max: ${max} in [${args.numbers.join(', ')}]`,
        },
      ],
    };
  }
);

// ============================================================================
// Custom MCP Tools for Text Analysis
// ============================================================================

const analyzeText = tool(
  'analyze_text',
  'Analyze text and provide word count, character count, and sentence count',
  {
    text: z.string().describe('Text to analyze'),
  },
  async (args) => {
    const words = args.text.trim().split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const charCount = args.text.length;
    const sentences = args.text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentenceCount = sentences.length;

    return {
      content: [
        {
          type: 'text' as const,
          text: `Text Analysis:\n- Words: ${wordCount}\n- Characters: ${charCount}\n- Sentences: ${sentenceCount}`,
        },
      ],
    };
  }
);

const extractKeywords = tool(
  'extract_keywords',
  'Extract keywords from text (words longer than 5 characters)',
  {
    text: z.string().describe('Text to extract keywords from'),
  },
  async (args) => {
    const words = args.text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 5);
    const uniqueWords = [...new Set(words)];
    return {
      content: [
        {
          type: 'text' as const,
          text: `Keywords: ${uniqueWords.slice(0, 10).join(', ')}`,
        },
      ],
    };
  }
);

// ============================================================================
// Example 1: Data Analyst Subagent
// ============================================================================

async function exampleDataAnalystSubagent() {
  console.log('=== Example 1: Data Analyst Subagent with MCP Tools ===\n');

  // Create MCP server with data analysis tools
  const dataAnalysisServer = createSdkMcpServer({
    name: 'data_analysis',
    version: '1.0.0',
    tools: [calculateAverage, calculateStdDev, findMinMax],
  });

  // Define data analyst subagent
  const dataAnalyst: AgentDefinition = {
    description: 'Analyzes numerical data using statistical tools',
    prompt:
      'You are a data analyst. Use the available statistical tools to analyze numerical data. ' +
      'Provide clear interpretations of the results.',
    tools: [
      'mcp__data_analysis__calculate_average',
      'mcp__data_analysis__calculate_stddev',
      'mcp__data_analysis__find_min_max',
    ],
    model: 'sonnet',
  };

  for await (const message of query({
    prompt:
      'Use the data-analyst agent to analyze this dataset: [10, 15, 20, 25, 30, 35, 40]',
    options: {
      mcpServers: { data_analysis: dataAnalysisServer },
      agents: {
        'data-analyst': dataAnalyst,
      },
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

// ============================================================================
// Example 2: Text Analyst Subagent
// ============================================================================

async function exampleTextAnalystSubagent() {
  console.log('=== Example 2: Text Analyst Subagent with MCP Tools ===\n');

  // Create MCP server with text analysis tools
  const textAnalysisServer = createSdkMcpServer({
    name: 'text_analysis',
    version: '1.0.0',
    tools: [analyzeText, extractKeywords],
  });

  // Define text analyst subagent
  const textAnalyst: AgentDefinition = {
    description: 'Analyzes text content and extracts insights',
    prompt:
      'You are a text analyst. Use the available text analysis tools to examine text content. ' +
      'Provide insights about the text structure and keywords.',
    tools: ['mcp__text_analysis__analyze_text', 'mcp__text_analysis__extract_keywords'],
    model: 'sonnet',
  };

  const sampleText =
    'TypeScript is a strongly typed programming language that builds on JavaScript. ' +
    'It provides optional static typing, classes, and interfaces. TypeScript compiles to plain JavaScript.';

  for await (const message of query({
    prompt: `Use the text-analyst agent to analyze this text: "${sampleText}"`,
    options: {
      mcpServers: { text_analysis: textAnalysisServer },
      agents: {
        'text-analyst': textAnalyst,
      },
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

// ============================================================================
// Example 3: Multiple Subagents with Different MCP Tools
// ============================================================================

async function exampleMultipleSubagentsWithMCP() {
  console.log('=== Example 3: Multiple Subagents with Different MCP Tools ===\n');

  // Create both MCP servers
  const dataAnalysisServer = createSdkMcpServer({
    name: 'data_analysis',
    version: '1.0.0',
    tools: [calculateAverage, calculateStdDev, findMinMax],
  });

  const textAnalysisServer = createSdkMcpServer({
    name: 'text_analysis',
    version: '1.0.0',
    tools: [analyzeText, extractKeywords],
  });

  // Define both subagents
  const dataAnalyst: AgentDefinition = {
    description: 'Analyzes numerical data',
    prompt: 'You are a data analyst. Use statistical tools to analyze numbers.',
    tools: [
      'mcp__data_analysis__calculate_average',
      'mcp__data_analysis__calculate_stddev',
      'mcp__data_analysis__find_min_max',
    ],
    model: 'sonnet',
  };

  const textAnalyst: AgentDefinition = {
    description: 'Analyzes text content',
    prompt: 'You are a text analyst. Use text analysis tools to examine content.',
    tools: ['mcp__text_analysis__analyze_text', 'mcp__text_analysis__extract_keywords'],
    model: 'sonnet',
  };

  for await (const message of query({
    prompt:
      'Use the data-analyst agent to find the average of [5, 10, 15, 20] and then use the text-analyst agent to analyze "Machine learning is amazing"',
    options: {
      mcpServers: {
        data_analysis: dataAnalysisServer,
        text_analysis: textAnalysisServer,
      },
      agents: {
        'data-analyst': dataAnalyst,
        'text-analyst': textAnalyst,
      },
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
  await exampleDataAnalystSubagent();
  await exampleTextAnalystSubagent();
  await exampleMultipleSubagentsWithMCP();

  console.log('=== Subagents with MCP Tools Summary ===');
  console.log('✓ Custom MCP tools for specialized tasks');
  console.log('✓ Subagents with access to specific MCP tools');
  console.log('✓ Data analysis tools (average, stddev, min/max)');
  console.log('✓ Text analysis tools (word count, keywords)');
  console.log('✓ Multiple subagents with different tool sets');
  console.log('✓ Specialized agents for specific domains');
}

main().catch(console.error);
