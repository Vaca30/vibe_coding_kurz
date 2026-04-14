#!/usr/bin/env node
/**
 * Parallel Workflow Example - Fan-Out/Fan-In Pattern
 *
 * Demonstrates parallel execution of multiple agents working on different aspects
 * of the same problem simultaneously, then combining their results. This is useful for:
 * - Multi-perspective analysis
 * - Parallel data processing
 * - Concurrent research tasks
 *
 * Pattern:
 *          -> Agent A ->
 * Input -> -> Agent B -> -> Aggregator
 *          -> Agent C ->
 */

import { query, SDKAssistantMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

interface SpecialistResult {
  name: string;
  result: string;
}

async function runSpecialistAgent(
  name: string,
  specialty: string,
  prompt: string
): Promise<SpecialistResult> {
  /**
   * Run a specialist agent and return its output.
   */
  console.log(`[${name}] Starting analysis...`);

  let result = '';

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: `You are a ${specialty} specialist. Provide focused insights from your expertise area.`,
      model: 'sonnet',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          result += block.text;
        }
      }
    }
  }

  console.log(`[${name}] Completed analysis`);
  return { name, result };
}

async function parallelWorkflow() {
  /**
   * Parallel workflow: Multiple specialists analyze the same topic simultaneously,
   * then an aggregator combines their insights.
   *
   * Fan-Out: Distribute work to specialist agents
   * Fan-In: Collect and synthesize results
   */

  console.log('='.repeat(60));
  console.log('PARALLEL WORKFLOW: Multi-Perspective Analysis');
  console.log('='.repeat(60));

  const topic = 'Impact of artificial intelligence on software development';

  // Define specialist agents
  const specialists = [
    {
      name: 'Technical Specialist',
      specialty: 'software architecture and technical implementation',
      prompt: `From a technical perspective, analyze: ${topic}. Focus on implementation details, tools, and technical challenges.`,
    },
    {
      name: 'Business Specialist',
      specialty: 'business strategy and market analysis',
      prompt: `From a business perspective, analyze: ${topic}. Focus on ROI, market opportunities, and business impact.`,
    },
    {
      name: 'Security Specialist',
      specialty: 'cybersecurity and risk management',
      prompt: `From a security perspective, analyze: ${topic}. Focus on security implications, risks, and mitigation strategies.`,
    },
    {
      name: 'UX Specialist',
      specialty: 'user experience and human factors',
      prompt: `From a user experience perspective, analyze: ${topic}. Focus on developer experience, usability, and adoption challenges.`,
    },
  ];

  console.log(`\nTopic: ${topic}\n`);
  console.log('PHASE 1: Fan-Out - Parallel Analysis');
  console.log('-'.repeat(60));

  // Fan-Out: Execute all specialist agents in parallel
  const tasks = specialists.map((spec) =>
    runSpecialistAgent(spec.name, spec.specialty, spec.prompt)
  );

  // Wait for all agents to complete
  const results = await Promise.all(tasks);

  console.log('\nPHASE 2: Fan-In - Synthesis');
  console.log('-'.repeat(60));

  // Fan-In: Aggregate results
  console.log('\nCollected insights from all specialists:\n');
  let aggregatedInput = '';

  for (const { name, result } of results) {
    console.log(`### ${name}:`);
    console.log(result.length > 200 ? `${result.substring(0, 200)}...` : result);
    console.log();
    aggregatedInput += `\n\n### ${name} Insights:\n${result}`;
  }

  // Synthesis Agent
  console.log('\nPHASE 3: Final Synthesis');
  console.log('-'.repeat(60));

  const synthesisPrompt = `
Synthesize the following specialist analyses into a comprehensive report:
${aggregatedInput}

Create a unified analysis that:
1. Identifies common themes across perspectives
2. Highlights areas of agreement and disagreement
3. Provides balanced recommendations
`;

  console.log('\nFinal Synthesized Report:\n');

  for await (const message of query({
    prompt: synthesisPrompt,
    options: {
      systemPrompt:
        'You are a synthesis expert. Combine multiple perspectives into a coherent, comprehensive analysis highlighting key themes and conflicts.',
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
  console.log('Parallel workflow completed!');
  console.log('='.repeat(60));
}

async function main() {
  await parallelWorkflow();

  console.log('\n=== Parallel Workflow Summary ===');
  console.log('✓ Fan-out to multiple specialists');
  console.log('✓ Concurrent execution');
  console.log('✓ Fan-in synthesis');
  console.log('✓ Multi-perspective analysis');
}

main().catch(console.error);
