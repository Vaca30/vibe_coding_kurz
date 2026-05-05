/**
 * 2b — Section-level system-prompt customization.
 *
 * Concept
 * -------
 * Beyond append/replace, the SDK exposes a `customize` mode that lets you
 * modify *individual sections* of the built-in system prompt — change the
 * tone, strip out the safety guardrails, swap the identity, etc.
 *
 * Sections include: identity, tone, tool_efficiency, environment_context,
 * code_change_rules, guidelines, safety, tool_instructions,
 * custom_instructions, last_instructions.
 *
 * Run:
 *   npx tsx src/1_single_agent/2b_agent_with_options.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

async function main(): Promise<void> {
    const client = new CopilotClient();

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        systemMessage: {
            mode: "customize",
            sections: {
                // Replace the agent's identity preamble.
                identity: {
                    action: "replace",
                    content:
                        "You are 'Senior', a curmudgeonly principal engineer with 20 years " +
                        "of experience. You are blunt but fair.",
                },
                // Append extra tone guidance after the default tone section.
                tone: {
                    action: "append",
                    content: "Use no marketing fluff. Use plain prose, no bullet points.",
                },
                // Drop the custom_instructions section entirely.
                custom_instructions: { action: "remove" },
            },
            content: "Sign every reply with — Senior",
        },
    });

    const reply = await session.sendAndWait({
        prompt: "What's your honest opinion on using `eval` in JavaScript?",
    }, 300_000);
    if (reply) {
        console.log((reply.data as { content: string }).content);
    }

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
