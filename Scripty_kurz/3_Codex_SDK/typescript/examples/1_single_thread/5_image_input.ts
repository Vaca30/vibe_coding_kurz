#!/usr/bin/env node
/**
 * Single Thread Example: Image Input
 *
 * Demonstrates how to pass images to Codex for analysis using local_image input.
 * Uses images from the img/ folder to show vision capabilities.
 */

import { Codex } from "@openai/codex-sdk";
import type { UserInput } from "@openai/codex-sdk";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { codexPathOverride } from "../helpers.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function example1_SingleImage() {
  console.log("=== Example 1: Analyze Single Image ===\n");

  const codex = new Codex({ codexPathOverride: codexPathOverride() });
  const thread = codex.startThread({ skipGitRepoCheck: true });

  const imagePath = join(__dirname, "../../img/ferrari.jpg");
  console.log(`Loading image: ${imagePath}\n`);

  const turn = await thread.run([
    { type: "local_image", path: imagePath },
    { type: "text", text: "What car is in this image? Describe it in detail." },
  ]);

  console.log(`\nCodex: ${turn.finalResponse}\n`);

  if (turn.usage) {
    console.log(`Input tokens: ${turn.usage.input_tokens}`);
    console.log(`Output tokens: ${turn.usage.output_tokens}`);
  }
}

async function example2_MultipleImages() {
  console.log("\n\n=== Example 2: Compare Multiple Images ===\n");

  const codex = new Codex({ codexPathOverride: codexPathOverride() });
  const thread = codex.startThread({ skipGitRepoCheck: true });

  const images = ["bugatti.jpg", "ferrari.jpg", "porsche.jpg", "subaru.jpg"];
  const input: UserInput[] = [];

  for (const imageName of images) {
    const imagePath = join(__dirname, "../../img", imageName);
    console.log(`Loading: ${imageName}`);
    input.push({ type: "local_image", path: imagePath });
  }

  input.push({
    type: "text",
    text: `I have shown you 4 car images. Please:
1. Identify each car (make/model)
2. Compare their characteristics
3. Rank them by performance potential`,
  });

  console.log("\nSending all images to Codex...\n");

  const turn = await thread.run(input);

  console.log(`\nCodex: ${turn.finalResponse}\n`);

  if (turn.usage) {
    console.log(`Input tokens: ${turn.usage.input_tokens}`);
    console.log(`Output tokens: ${turn.usage.output_tokens}`);
  }
}

async function example3_ImageWithConversation() {
  console.log("\n\n=== Example 3: Multi-turn Conversation with Image ===\n");

  const codex = new Codex({ codexPathOverride: codexPathOverride() });
  const thread = codex.startThread({ skipGitRepoCheck: true });

  const imagePath = join(__dirname, "../../img/porsche.jpg");
  console.log(`Loading image: ${imagePath}\n`);

  // Turn 1: Show image and ask initial question
  console.log("--- Turn 1 ---");
  const turn1 = await thread.run([
    { type: "local_image", path: imagePath },
    { type: "text", text: "What car is this?" },
  ]);
  console.log(`Codex: ${turn1.finalResponse}\n`);

  // Turn 2: Follow-up question (Codex remembers the image)
  console.log("--- Turn 2 ---");
  const turn2 = await thread.run(
    "What are the key performance specs for this model?",
  );
  console.log(`Codex: ${turn2.finalResponse}\n`);

  // Turn 3: Another follow-up
  console.log("--- Turn 3 ---");
  const turn3 = await thread.run(
    "What makes this car special compared to its competitors?",
  );
  console.log(`Codex: ${turn3.finalResponse}\n`);

  // Print totals
  const totalInput =
    (turn1.usage?.input_tokens ?? 0) +
    (turn2.usage?.input_tokens ?? 0) +
    (turn3.usage?.input_tokens ?? 0);
  const totalOutput =
    (turn1.usage?.output_tokens ?? 0) +
    (turn2.usage?.output_tokens ?? 0) +
    (turn3.usage?.output_tokens ?? 0);
  console.log(`Total input tokens: ${totalInput}`);
  console.log(`Total output tokens: ${totalOutput}`);
  console.log(`Total turns: 3`);
}

async function main() {
  console.log("=".repeat(50));
  console.log("  Codex SDK - Image Examples");
  console.log("=".repeat(50) + "\n");

  await example1_SingleImage();
  await example2_MultipleImages();
  await example3_ImageWithConversation();

  console.log("\n--- All examples completed! ---");
}

main().catch(console.error);
