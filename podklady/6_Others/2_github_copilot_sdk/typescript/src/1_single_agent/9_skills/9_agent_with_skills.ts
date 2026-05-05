/**
 * 9 — Skills.
 *
 * Concept
 * -------
 * A "skill" is a directory containing a `SKILL.md` file. The frontmatter
 * `name` and `description` tell the runtime *when* to load the skill; the
 * body is appended into the system prompt at that point. Use them to encode
 * reusable domain knowledge — coding standards, brand palettes, regulatory
 * rules, etc.
 *
 * Skills are discovered from any directory you pass via `skillDirectories`.
 *
 * Run from this folder so the relative path resolves:
 *   cd src/1_single_agent/9_skills
 *   npx tsx 9_agent_with_skills.ts
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
    const client = new CopilotClient();

    const session = await client.createSession({
        onPermissionRequest: approveAll,
        // Anything containing a `<name>/SKILL.md` file inside this directory
        // becomes a discoverable skill.
        skillDirectories: [path.join(HERE, "skills")],
    });

    const reply = await session.sendAndWait({
        prompt:
            "Suggest a colour scheme for a marketing landing page. Give me a " +
            "primary, an accent, and a background colour, with hex codes.",
    }, 300_000);
    if (reply) {
        console.log((reply.data as { content: string }).content);
    }

    await session.disconnect();
    await client.stop();
}

main().catch(console.error);
