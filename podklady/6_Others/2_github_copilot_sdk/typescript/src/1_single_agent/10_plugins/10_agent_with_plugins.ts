/**
 * 10 — Plugins.
 *
 * Concept
 * -------
 * Copilot SDK doesn't ship a first-class "plugin" mechanism, but you can
 * build one trivially out of the primitives it *does* expose: skills + custom
 * agents. This file defines a tiny convention:
 *
 *   plugin/
 *     plugin.json         # manifest: name, version, skills_dir, agents
 *     skills/<n>/SKILL.md # discoverable skills
 *
 * The `loadPlugin()` helper below reads a manifest, returns the skill
 * directory and a list of custom-agent definitions.
 *
 * Run from this folder:
 *   cd src/1_single_agent/10_plugins
 *   npx tsx 10_agent_with_plugins.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

interface PluginManifest {
    name: string;
    version: string;
    skills_dir?: string;
    agents?: Array<{
        name: string;
        displayName?: string;
        description?: string;
        tools?: string[];
        prompt: string;
    }>;
}

function loadPlugin(pluginDir: string): {
    skillsDir: string | null;
    agents: NonNullable<PluginManifest["agents"]>;
} {
    const manifest = JSON.parse(
        fs.readFileSync(path.join(pluginDir, "plugin.json"), "utf-8"),
    ) as PluginManifest;
    return {
        skillsDir: manifest.skills_dir ? path.join(pluginDir, manifest.skills_dir) : null,
        agents: manifest.agents ?? [],
    };
}

async function main(): Promise<void> {
    const client = new CopilotClient();

    const { skillsDir, agents } = loadPlugin(path.join(HERE, "demo-plugin"));

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        skillDirectories: skillsDir ? [skillsDir] : [],
        customAgents: agents,
    });

    console.log("> Asking for an HTML page (the 'geocities-html' skill should kick in):");
    let reply = await session.sendAndWait({
        prompt: "Generate an HTML page advertising a fictional 'Cyber Cat Café'.",
    }, 300_000);
    console.log((reply?.data as { content: string })?.content ?? "(no reply)");

    console.log("\n> Asking a generic question (the haiku-footer agent may take over):");
    reply = await session.sendAndWait({
        prompt: "Use the haiku-footer agent to answer: what is functional programming?",
    }, 300_000);
    console.log((reply?.data as { content: string })?.content ?? "(no reply)");

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
