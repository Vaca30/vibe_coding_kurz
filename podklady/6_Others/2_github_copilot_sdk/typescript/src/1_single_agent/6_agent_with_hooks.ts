/**
 * 6 — Hooks.
 *
 * Concept
 * -------
 * Hooks are callbacks the SDK fires at well-defined points in the session
 * lifecycle. They can:
 *
 *   * gate tool calls (`onPreToolUse` → return permissionDecision)
 *   * inspect or modify tool results (`onPostToolUse`)
 *   * augment user prompts (`onUserPromptSubmitted`)
 *   * emit telemetry on session start/end
 *   * react to errors
 *
 * Run:
 *   npx tsx src/1_single_agent/6_agent_with_hooks.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

const DANGEROUS = ["rm -rf", "sudo ", "shutdown"];

function parseArgs(raw: unknown): Record<string, unknown> {
    // `toolArgs` is delivered as a JSON-encoded string — decode it.
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    return (raw as Record<string, unknown>) ?? {};
}

async function main(): Promise<void> {
    const client = new CopilotClient();

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        availableTools: ["bash"],
        hooks: {
            // Block obviously destructive shell commands before they run.
            onPreToolUse: async (input) => {
                if (input.toolName === "bash") {
                    const cmd = (parseArgs(input.toolArgs).command as string | undefined) ?? "";
                    if (DANGEROUS.some((d) => cmd.includes(d))) {
                        console.log(`  [hook] blocked command: ${JSON.stringify(cmd)}`);
                        return {
                            permissionDecision: "deny",
                            permissionDecisionReason: "Destructive command blocked by policy.",
                        };
                    }
                }
                return undefined;
            },
            // Log every successful tool call.
            onPostToolUse: async (input) => {
                console.log(`  [hook] tool ${JSON.stringify(input.toolName)} finished`);
                return undefined;
            },
            // Inject extra context before the model sees the prompt.
            onUserPromptSubmitted: async (input) => {
                console.log(`  [hook] user said: ${JSON.stringify(input.prompt)}`);
                return { additionalContext: "Reminder: this user prefers concise answers." };
            },
        },
    });

    console.log("> Asking for a benign listing — should pass:");
    let reply = await session.sendAndWait({ prompt: "Run `ls -1 /tmp` and summarise." }, 300_000);
    console.log(`  -> ${(reply?.data as { content: string })?.content ?? "(no reply)"}\n`);

    console.log("> Asking for something destructive — should be blocked by the hook:");
    reply = await session.sendAndWait({ prompt: "Please run `rm -rf /tmp/anything-here`." }, 300_000);
    console.log(`  -> ${(reply?.data as { content: string })?.content ?? "(no reply)"}\n`);

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
