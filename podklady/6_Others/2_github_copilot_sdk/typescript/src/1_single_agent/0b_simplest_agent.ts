/**
 * 0b — Same as 0a, but with streaming output.
 *
 * Concept
 * -------
 * Subscribe to `assistant.message_delta` events to print the model's reply
 * token-by-token as it arrives.
 *
 * Run:
 *   npx tsx src/1_single_agent/0b_simplest_agent.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

async function main(): Promise<void> {
    const client = new CopilotClient();

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        streaming: true, // opts into the *_delta events below
    });

    session.on("assistant.message_delta", (event) => {
        process.stdout.write(event.data.deltaContent);
    });

    await session.sendAndWait({ prompt: "Write a short haiku about coding." }, 300_000);
    process.stdout.write("\n");

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
