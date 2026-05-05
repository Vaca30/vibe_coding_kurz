#!/usr/bin/env node
/**
 * Parallel Workflow Example - Fan-Out/Fan-In Pattern
 *
 * Demonstrates parallel execution of multiple specialized agents,
 * then combining their results into a synthesis.
 *
 * Pattern:
 *          -> Agent A ->
 * Input -> -> Agent B -> -> Synthesizer
 *          -> Agent C ->
 */

import { Codex } from "@openai/codex-sdk";
import { codexPathOverride } from "../helpers.ts";

interface AgentResult {
  name: string;
  result: string;
}

async function runSpecialist(
  name: string,
  instructions: string,
  prompt: string,
): Promise<AgentResult> {
  console.log(`[${name}] Starting...`);

  const codex = new Codex({
    codexPathOverride: codexPathOverride(),
    config: { developer_instructions: instructions },
  });

  const thread = codex.startThread({ skipGitRepoCheck: true });
  const turn = await thread.run(prompt);

  console.log(`[${name}] Completed`);
  return { name, result: turn.finalResponse };
}

async function parallelWorkflow() {
  console.log("=".repeat(60));
  console.log("PARALLEL WORKFLOW: Multi-Perspective Analysis");
  console.log("=".repeat(60));

  const topic = "Impact of artificial intelligence on software development";
  console.log(`\nTopic: ${topic}\n`);

  // Phase 1: Fan-out
  console.log("PHASE 1: Fan-Out - Parallel Analysis");
  console.log("-".repeat(60));

  const specialists = [
    {
      name: "Technical Specialist",
      instructions:
        "You are a software architecture and technical implementation specialist.",
      prompt: `From a technical perspective, analyze: ${topic}. Focus on tools and challenges. Be concise (under 150 words).`,
    },
    {
      name: "Business Specialist",
      instructions:
        "You are a business strategy and market analysis specialist.",
      prompt: `From a business perspective, analyze: ${topic}. Focus on ROI and opportunities. Be concise (under 150 words).`,
    },
    {
      name: "Security Specialist",
      instructions:
        "You are a cybersecurity and risk management specialist.",
      prompt: `From a security perspective, analyze: ${topic}. Focus on risks and mitigation. Be concise (under 150 words).`,
    },
    {
      name: "UX Specialist",
      instructions:
        "You are a user experience and human factors specialist.",
      prompt: `From a UX perspective, analyze: ${topic}. Focus on developer experience and adoption. Be concise (under 150 words).`,
    },
  ];

  const results = await Promise.all(
    specialists.map((s) => runSpecialist(s.name, s.instructions, s.prompt)),
  );

  // Phase 2: Display results
  console.log("\nPHASE 2: Results");
  console.log("-".repeat(60));

  let aggregated = "";
  for (const { name, result } of results) {
    console.log(`\n### ${name}:`);
    console.log(result.length > 200 ? `${result.substring(0, 200)}...` : result);
    aggregated += `\n\n### ${name}:\n${result}`;
  }

  // Phase 3: Synthesis
  console.log("\n\nPHASE 3: Synthesis");
  console.log("-".repeat(60));

  const synthesizer = new Codex({
    codexPathOverride: codexPathOverride(),
    config: {
      developer_instructions:
        "You are a synthesis expert. Combine multiple perspectives into a cohesive analysis.",
    },
  });

  const synthThread = synthesizer.startThread({ skipGitRepoCheck: true });
  const synthTurn = await synthThread.run(
    `Synthesize these specialist analyses into a brief unified report:\n${aggregated}\n\n` +
      "Identify common themes and provide balanced recommendations.",
  );

  console.log("\nSynthesized Report:\n");
  console.log(synthTurn.finalResponse);
}

async function main() {
  await parallelWorkflow();

  console.log("\n=== Parallel Workflow Summary ===");
  console.log("- Fan-out to multiple specialist agents");
  console.log("- Concurrent execution with Promise.all");
  console.log("- Fan-in synthesis into unified report");
}

main().catch(console.error);
