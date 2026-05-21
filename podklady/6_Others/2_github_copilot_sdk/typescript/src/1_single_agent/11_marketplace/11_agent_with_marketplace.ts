/**
 * 11 — Marketplace.
 *
 * Concept
 * -------
 * There is no "marketplace" concept in the Copilot SDK either, but you can
 * trivially build one on top of plugins (10): publish a `marketplace.json`
 * to a Git repo, clone it, iterate over the listed plugins, and load each
 * one.
 *
 * This example uses a local marketplace.json that points at the plugin we
 * defined in `../10_plugins/demo-plugin`. In a real project, the marketplace
 * would live in its own repository, e.g. `gh:my-org/copilot-plugins`.
 *
 * Run from this folder:
 *   cd src/1_single_agent/11_marketplace
 *   npx tsx 11_agent_with_marketplace.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

interface MarketplaceFile {
    name: string;
    description?: string;
    plugins: Array<{ name: string; description?: string; source: string }>;
}

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

function loadMarketplace(marketplacePath: string): Array<{
    dir: string;
    manifest: PluginManifest;
}> {
    const market = JSON.parse(fs.readFileSync(marketplacePath, "utf-8")) as MarketplaceFile;
    const base = path.dirname(marketplacePath);
    return market.plugins.map((entry) => {
        const dir = path.normalize(path.join(base, entry.source));
        const manifest = JSON.parse(
            fs.readFileSync(path.join(dir, "plugin.json"), "utf-8"),
        ) as PluginManifest;
        return { dir, manifest };
    });
}

async function main(): Promise<void> {
    const client = new CopilotClient();

    const plugins = loadMarketplace(path.join(HERE, "marketplace.json"));
    console.log(`Marketplace contains ${plugins.length} plugin(s):`);
    for (const p of plugins) {
        console.log(`  - ${p.manifest.name} v${p.manifest.version}`);
    }

    // Aggregate every plugin's skills + agents into a single session.
    const skillDirs: string[] = [];
    const customAgents: NonNullable<PluginManifest["agents"]> = [];
    for (const p of plugins) {
        if (p.manifest.skills_dir) {
            skillDirs.push(path.join(p.dir, p.manifest.skills_dir));
        }
        customAgents.push(...(p.manifest.agents ?? []));
    }

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        skillDirectories: skillDirs,
        customAgents,
    });

    const reply = await session.sendAndWait({
        prompt:
            "Generate an HTML landing page for a tiny indie band called 'Static & Echo'. " +
            "End with the haiku-footer agent's signature.",
    }, 300_000);
    console.log("\n" + ((reply?.data as { content: string })?.content ?? "(no reply)"));

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
