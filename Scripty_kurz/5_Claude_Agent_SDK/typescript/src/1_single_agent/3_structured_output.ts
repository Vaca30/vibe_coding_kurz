#!/usr/bin/env node
/**
 * Single Agent Example: Structured Output
 *
 * Demonstrates using structured output with JSON Schema
 * to get typed, validated responses from the agent.
 */

import { query, SDKAssistantMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

async function examplePlainJsonSchema() {
  console.log('=== Example 1: Plain JSON Schema ===\n');

  // { summary: string; status: "ok" | "action_required" }
  const schema = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      status: { type: 'string', enum: ['ok', 'action_required'] },
    },
    required: ['summary', 'status'],
    additionalProperties: false,
  };

  for await (const message of query({
    prompt: 'Summarize the current directory status',
    options: {
      maxTurns: 3,
      outputFormat: {
        type: 'json_schema',
        schema,
      },
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}\n`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;

      if (resultMsg.subtype === 'success' && resultMsg.structured_output) {
        const output = resultMsg.structured_output as { summary: string; status: string };
        console.log('\nStructured output:');
        console.log(`  Summary: ${output.summary}`);
        console.log(`  Status: ${output.status}`);
      }

      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  console.log('\n');
}

async function exampleMultiFieldSchema() {
  console.log('=== Example 2: Multi-Field Structured Output ===\n');

  // {
  //   title: string;
  //   priority: "low" | "medium" | "high";
  //   estimated_hours: number;
  //   tags: string[];
  // }
  const todoSchema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      estimated_hours: { type: 'number' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['title', 'priority', 'estimated_hours', 'tags'],
    additionalProperties: false,
  };

  for await (const message of query({
    prompt: 'Create a todo item for adding unit tests to a TypeScript project',
    options: {
      maxTurns: 1,
      outputFormat: {
        type: 'json_schema',
        schema: todoSchema,
      },
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}\n`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;

      if (resultMsg.subtype === 'success' && resultMsg.structured_output) {
        const todo = resultMsg.structured_output as {
          title: string;
          priority: string;
          estimated_hours: number;
          tags: string[];
        };
        console.log('\nStructured todo:');
        console.log(`  Title: ${todo.title}`);
        console.log(`  Priority: ${todo.priority}`);
        console.log(`  Estimated hours: ${todo.estimated_hours}`);
        console.log(`  Tags: ${todo.tags.join(', ')}`);
      }

      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  console.log('\n');
}

async function exampleNestedSchema() {
  console.log('=== Example 3: Nested Structured Output ===\n');

  const analysisSchema = {
    type: 'object',
    properties: {
      analysis: {
        type: 'object',
        properties: {
          word_count: { type: 'number' },
          character_count: { type: 'number' },
        },
        required: ['word_count', 'character_count'],
      },
      words: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['analysis', 'words'],
    additionalProperties: false,
  };

  for await (const message of query({
    prompt: "Analyze this text: 'Hello world'. Provide word count, character count, and list of words.",
    options: {
      maxTurns: 1,
      outputFormat: {
        type: 'json_schema',
        schema: analysisSchema,
      },
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}\n`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;

      if (resultMsg.subtype === 'success' && resultMsg.structured_output) {
        const output = resultMsg.structured_output as {
          analysis: { word_count: number; character_count: number };
          words: string[];
        };
        console.log('\nStructured analysis:');
        console.log(`  Word count: ${output.analysis.word_count}`);
        console.log(`  Character count: ${output.analysis.character_count}`);
        console.log(`  Words: ${output.words.join(', ')}`);
      }

      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\nCost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  console.log('\n');
}

async function main() {
  await examplePlainJsonSchema();
  await exampleMultiFieldSchema();
  await exampleNestedSchema();
}

main().catch(console.error);
