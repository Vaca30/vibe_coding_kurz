#!/usr/bin/env node
/**
 * Sequential Workflow Example - Agent Chain Pattern
 *
 * Demonstrates a multi-step sequential workflow where the output of one agent
 * becomes the input to the next agent. This is useful for:
 * - Data processing pipelines
 * - Multi-stage analysis
 * - Progressive refinement tasks
 *
 * Pattern: Agent A -> Agent B -> Agent C
 */

import { query, SDKAssistantMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

async function sequentialWorkflow() {
  /**
   * Sequential workflow: Research -> Analyze -> Summarize
   *
   * Step 1: Research agent gathers information about a topic
   * Step 2: Analysis agent examines the research findings
   * Step 3: Summary agent creates a concise final report
   */

  // Step 1: Research Agent
  console.log('='.repeat(60));
  console.log('STEP 1: Research Phase');
  console.log('='.repeat(60));

  const topic = "Benefits of TypeScript's type system for large-scale applications";

  let researchFindings = '';

  for await (const message of query({
    prompt: `Research the following topic and provide 3-5 key points: ${topic}`,
    options: {
      systemPrompt:
        'You are a research assistant. Gather key information about the topic and provide detailed findings.',
      model: 'sonnet',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(block.text);
          researchFindings += block.text;
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

  // Step 2: Analysis Agent
  console.log('='.repeat(60));
  console.log('STEP 2: Analysis Phase');
  console.log('='.repeat(60));

  let analysisResults = '';

  for await (const message of query({
    prompt: `Analyze these research findings and provide critical insights:\n\n${researchFindings}`,
    options: {
      systemPrompt:
        'You are an analytical expert. Examine the research findings and identify strengths, weaknesses, and practical implications.',
      model: 'sonnet',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(block.text);
          analysisResults += block.text;
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

  // Step 3: Summary Agent
  console.log('='.repeat(60));
  console.log('STEP 3: Summary Phase');
  console.log('='.repeat(60));

  console.log('\nFinal Summary:\n');

  for await (const message of query({
    prompt: `Create a concise executive summary based on this analysis:\n\n${analysisResults}`,
    options: {
      systemPrompt:
        'You are a summarization specialist. Create concise, actionable summaries suitable for executive review.',
      model: 'sonnet',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(block.text);
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
  console.log('='.repeat(60));
  console.log('Sequential workflow completed!');
  console.log('='.repeat(60));
}

async function main() {
  await sequentialWorkflow();

  console.log('\n=== Sequential Workflow Summary ===');
  console.log('✓ Multi-step agent chain');
  console.log('✓ Output of one agent feeds into next');
  console.log('✓ Progressive refinement');
  console.log('✓ Linear data pipeline');
}

main().catch(console.error);
