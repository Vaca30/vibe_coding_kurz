#!/usr/bin/env node
/**
 * Conditional Workflow Example - IF/ELSE Logic Pattern
 *
 * Demonstrates conditional routing based on agent output. The workflow examines
 * the result from one agent and routes to different subsequent agents based on
 * conditions. This is useful for:
 * - Decision trees
 * - Adaptive workflows
 * - Error handling and fallback paths
 *
 * Pattern:
 *                   -> Agent B (if condition X)
 * Agent A -> Router -> Agent C (if condition Y)
 *                   -> Agent D (otherwise)
 */

import { query, SDKAssistantMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

async function classifyRequest(userRequest: string): Promise<[string, string]> {
  /**
   * Classifier agent determines the type of request.
   *
   * Returns: Tuple of (category, full_response)
   */
  console.log('='.repeat(60));
  console.log('STEP 1: Classification');
  console.log('='.repeat(60));

  let result = '';

  for await (const message of query({
    prompt: `Classify this request: ${userRequest}`,
    options: {
      systemPrompt: `You are a request classifier. Analyze the user's request and categorize it as one of:
- TECHNICAL: Programming, code, technical implementation
- CREATIVE: Writing, storytelling, creative content
- ANALYTICAL: Data analysis, research, investigation
- OTHER: Anything else

Start your response with 'CATEGORY: <category>' on the first line.`,
      model: 'sonnet',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(block.text);
          result += block.text;
        }
      }
    }
  }

  console.log('\n');

  // Extract category from response
  const categoryMatch = result.match(/CATEGORY:\s*(\w+)/i);
  const category = categoryMatch ? categoryMatch[1].toUpperCase() : 'OTHER';

  return [category, result];
}

async function handleTechnical(request: string): Promise<string> {
  /**
   * Handle technical requests with a specialized technical agent.
   */
  console.log('='.repeat(60));
  console.log('STEP 2: Technical Handler');
  console.log('='.repeat(60));

  let result = '';

  console.log('\nTechnical Response:\n');

  for await (const message of query({
    prompt: request,
    options: {
      systemPrompt:
        'You are a senior software engineer. Provide detailed technical solutions with code examples.',
      model: 'sonnet',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(block.text);
          result += block.text;
        }
      }
    }
  }

  console.log('\n');
  return result;
}

async function handleCreative(request: string): Promise<string> {
  /**
   * Handle creative requests with a specialized creative agent.
   */
  console.log('='.repeat(60));
  console.log('STEP 2: Creative Handler');
  console.log('='.repeat(60));

  let result = '';

  console.log('\nCreative Response:\n');

  for await (const message of query({
    prompt: request,
    options: {
      systemPrompt:
        'You are a creative writer. Craft engaging, imaginative content with vivid descriptions.',
      model: 'sonnet',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(block.text);
          result += block.text;
        }
      }
    }
  }

  console.log('\n');
  return result;
}

async function handleAnalytical(request: string): Promise<string> {
  /**
   * Handle analytical requests with a specialized analytical agent.
   */
  console.log('='.repeat(60));
  console.log('STEP 2: Analytical Handler');
  console.log('='.repeat(60));

  let result = '';

  console.log('\nAnalytical Response:\n');

  for await (const message of query({
    prompt: request,
    options: {
      systemPrompt:
        'You are a data analyst. Provide structured analysis with clear reasoning and evidence-based conclusions.',
      model: 'sonnet',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(block.text);
          result += block.text;
        }
      }
    }
  }

  console.log('\n');
  return result;
}

async function handleOther(request: string): Promise<string> {
  /**
   * Handle general requests with a general-purpose agent.
   */
  console.log('='.repeat(60));
  console.log('STEP 2: General Handler');
  console.log('='.repeat(60));

  let result = '';

  console.log('\nGeneral Response:\n');

  for await (const message of query({
    prompt: request,
    options: {
      systemPrompt:
        'You are a helpful assistant. Provide clear, comprehensive responses to general queries.',
      model: 'sonnet',
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(block.text);
          result += block.text;
        }
      }
    }
  }

  console.log('\n');
  return result;
}

async function conditionalWorkflow(userRequest: string): Promise<string> {
  /**
   * Conditional workflow: Route requests to specialized handlers based on classification.
   *
   * Flow:
   * 1. Classify the request
   * 2. Route to appropriate specialist based on category:
   *    - TECHNICAL -> Technical specialist
   *    - CREATIVE -> Creative specialist
   *    - ANALYTICAL -> Analytical specialist
   *    - OTHER -> General handler
   * 3. Return specialized response
   */

  console.log('='.repeat(60));
  console.log('CONDITIONAL WORKFLOW: Adaptive Request Routing');
  console.log('='.repeat(60));
  console.log(`\nUser Request: ${userRequest}\n`);

  // Step 1: Classify
  const [category, _classificationResult] = await classifyRequest(userRequest);

  console.log(`Detected Category: ${category}`);
  console.log('-'.repeat(60));

  // Step 2: Route based on condition
  let result: string;

  if (category === 'TECHNICAL') {
    result = await handleTechnical(userRequest);
  } else if (category === 'CREATIVE') {
    result = await handleCreative(userRequest);
  } else if (category === 'ANALYTICAL') {
    result = await handleAnalytical(userRequest);
  } else {
    result = await handleOther(userRequest);
  }

  console.log('='.repeat(60));
  console.log('Conditional workflow completed!');
  console.log('='.repeat(60));

  return result;
}

async function demonstrateMultipleCases() {
  /**
   * Run multiple test cases to demonstrate different routing paths.
   */

  const testCases = [
    'Write a TypeScript function to calculate Fibonacci numbers using dynamic programming',
    'Write a short story about a robot learning to feel emotions',
    'Analyze the pros and cons of remote work versus office work',
    'What is the capital of France?',
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];

    console.log(`\n\n${'#'.repeat(60)}`);
    console.log(`TEST CASE ${i + 1}/${testCases.length}`);
    console.log('#'.repeat(60));
    console.log();

    await conditionalWorkflow(testCase);

    if (i < testCases.length - 1) {
      console.log('\n' + '.'.repeat(60));
      // Brief pause between test cases
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function main() {
  // Run all test cases
  await demonstrateMultipleCases();

  // Or run a single request:
  // await conditionalWorkflow("Your request here");

  console.log('\n=== Conditional Workflow Summary ===');
  console.log('✓ Request classification');
  console.log('✓ Dynamic routing');
  console.log('✓ Specialized handlers');
  console.log('✓ Adaptive workflows');
}

main().catch(console.error);
