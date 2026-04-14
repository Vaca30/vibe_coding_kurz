#!/usr/bin/env node
/**
 * Single Thread Example (a): Simplest Thread Possible
 *
 * Demonstrates the most basic usage of the Codex SDK - just a simple run().
 */

import { Codex } from "@openai/codex-sdk";
import { codexPathOverride } from "../helpers.ts";

async function main() {
  console.log("=== Simplest Thread Example ===\n");
  console.log("Asking Codex: What is 2 + 2?\n");

  const codex = new Codex({ codexPathOverride: codexPathOverride() });
  const thread = codex.startThread({ skipGitRepoCheck: true });

  const turn = await thread.run("What is 2 + 2?");

  // Print the final response
  console.log(`\nCodex: ${turn.finalResponse}\n`);

  // Print all items from the turn
  for (const item of turn.items) {
    switch (item.type) {
      case "agent_message":
        console.log(`[Agent Message] ${item.text}`);
        break;
      case "reasoning":
        console.log(`[Reasoning] ${item.text}`);
        break;
      case "command_execution":
        console.log(
          `[Command] ${item.command} (exit: ${item.exit_code ?? "N/A"})`,
        );
        break;
      case "file_change":
        for (const change of item.changes) {
          console.log(`[File ${change.kind}] ${change.path}`);
        }
        break;
    }
  }

  // Print usage stats
  if (turn.usage) {
    console.log(`\nInput tokens: ${turn.usage.input_tokens}`);
    console.log(`Cached input tokens: ${turn.usage.cached_input_tokens}`);
    console.log(`Output tokens: ${turn.usage.output_tokens}`);
  }
}

main().catch(console.error);
