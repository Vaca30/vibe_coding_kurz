/**
 * 1b — BYOK: point Copilot at a local model.
 *
 * Concept
 * -------
 * Copilot SDK supports Bring-Your-Own-Key (BYOK) via a `provider` config on
 * the session. You give it a base URL + API key, and the SDK talks directly
 * to that provider instead of routing through Copilot's hosted endpoints.
 *
 * This example points at a local Ollama server with its OpenAI-compatible
 * API (default port 11434). Start Ollama first:
 *
 *   ollama serve
 *   ollama pull llama3.1
 *
 * Run:
 *   npx tsx src/1_single_agent/1b_local_model.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";

async function main(): Promise<void> {
    const client = new CopilotClient();

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        // Tell the session to talk to a local OpenAI-compatible server.
        provider: {
            type: "openai",
            baseUrl: "http://localhost:11434/v1",
            apiKey: "ollama", // any non-empty string works for local Ollama
        },
        // When using a custom provider you must specify the model explicitly,
        // because the CLI can't list models for you.
        model: "llama3.1",
    });

    const reply = await session.sendAndWait({ prompt: "Tell me about Python in two sentences." }, 300_000);
    if (reply) {
        console.log((reply.data as { content: string }).content);
    }

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
