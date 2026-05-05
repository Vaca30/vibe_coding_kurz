#!/usr/bin/env node
/**
 * Single Agent Example (10): Agent with Marketplace Plugins
 *
 * Demonstrates how to pull plugins from an external marketplace repository
 * and use them with the Claude Agent SDK.
 *
 * The marketplace (https://github.com/lukaskellerstein/claude-dummy-marketplace)
 * is a Git repository that contains a collection of plugins organized as:
 *
 *     marketplace-repo/
 *     ├── .claude-plugin/
 *     │   └── marketplace.json      # Index listing all available plugins
 *     └── plugins/
 *         ├── html-dummy-plugin/    # Plugin 1: GeoCities HTML style
 *         └── markdown-classified-plugin/  # Plugin 2: TOP SECRET memos
 *
 * This example:
 *   1. Clones (or updates) the marketplace repo into a local ./marketplace/ dir
 *   2. Reads marketplace.json to discover all available plugins
 *   3. Loads ALL plugins into the agent automatically
 *   4. Lets the agent choose which plugin components to use based on the task
 *
 * IMPORTANT: The prompts do NOT mention any specific plugin, skill, or agent.
 * The main agent discovers and selects them automatically.
 */

import { query, SDKAssistantMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Marketplace configuration
const MARKETPLACE_REPO = 'https://github.com/lukaskellerstein/claude-dummy-marketplace.git';
const MARKETPLACE_DIR = join(__dirname, 'marketplace');
const OUTPUT_DIR = join(__dirname, 'output');

// ANSI colors
const CYAN = '\x1b[96m';
const YELLOW = '\x1b[93m';
const GREEN = '\x1b[92m';
const MAGENTA = '\x1b[95m';
const RED = '\x1b[91m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function logEvent(category: string, message: string) {
  const colors: Record<string, string> = {
    MARKET: CYAN,
    PLUGIN: CYAN,
    SKILL: YELLOW,
    AGENT: MAGENTA,
    TOOL: GREEN,
    COST: RED,
    FILE: GREEN,
  };
  const color = colors[category] || RESET;
  console.log(`  ${color}[${category}]${RESET} ${message}`);
}

function syncMarketplace() {
  if (existsSync(join(MARKETPLACE_DIR, '.git'))) {
    logEvent('MARKET', `Updating marketplace at ${MARKETPLACE_DIR}`);
    try {
      const result = execSync(`git -C "${MARKETPLACE_DIR}" pull --ff-only`, {
        encoding: 'utf-8',
      });
      logEvent('MARKET', `Updated: ${result.trim()}`);
    } catch (e: any) {
      logEvent('MARKET', `Pull failed (using existing): ${e.stderr?.trim() || e.message}`);
    }
  } else {
    logEvent('MARKET', `Cloning marketplace from ${MARKETPLACE_REPO}`);
    try {
      execSync(`git clone "${MARKETPLACE_REPO}" "${MARKETPLACE_DIR}"`, {
        encoding: 'utf-8',
      });
      logEvent('MARKET', 'Clone complete');
    } catch (e: any) {
      throw new Error(`Failed to clone marketplace: ${e.stderr || e.message}`);
    }
  }
}

interface PluginConfig {
  type: 'local';
  path: string;
}

function discoverPlugins(): PluginConfig[] {
  const manifestPath = join(MARKETPLACE_DIR, '.claude-plugin', 'marketplace.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Marketplace manifest not found at ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  logEvent('MARKET', `Marketplace: ${manifest.name} v${manifest.version}`);
  logEvent('MARKET', `Description: ${manifest.description}`);

  const plugins: PluginConfig[] = [];

  for (const entry of manifest.plugins) {
    const pluginPath = resolve(MARKETPLACE_DIR, entry.source);
    const pluginJson = join(pluginPath, '.claude-plugin', 'plugin.json');

    if (existsSync(pluginJson)) {
      const meta = JSON.parse(readFileSync(pluginJson, 'utf-8'));
      logEvent(
        'PLUGIN',
        `Found: ${meta.name} v${meta.version} — ${meta.description}`
      );
      plugins.push({ type: 'local', path: pluginPath });
    } else {
      logEvent('PLUGIN', `Skipping ${entry.name}: no plugin.json found`);
    }
  }

  logEvent('MARKET', `Loaded ${plugins.length} plugin(s) from marketplace`);
  return plugins;
}

async function runAgent(
  description: string,
  systemPrompt: string,
  prompt: string,
  plugins: PluginConfig[],
  outputFilename: string,
  maxTurns = 6
) {
  console.log(`\n${BOLD}${'='.repeat(60)}`);
  console.log(`  ${description}`);
  console.log(`${'='.repeat(60)}${RESET}\n`);

  // Give the agent its own working directory
  const agentWorkdir = join(OUTPUT_DIR, outputFilename.replace('.', '_'));
  mkdirSync(agentWorkdir, { recursive: true });

  logEvent('PLUGIN', `Prompt: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}`);

  for await (const message of query({
    prompt,
    options: {
      systemPrompt,
      model: 'claude-opus-4-6',
      maxTurns,
      plugins,
      cwd: agentWorkdir,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'tool_use') {
          const toolName = block.name;
          if (toolName.toLowerCase().includes('skill')) {
            logEvent('SKILL', `>>> SKILL INVOKED: ${toolName}`);
          } else if (toolName.toLowerCase().includes('agent')) {
            logEvent('AGENT', `>>> AGENT INVOKED: ${toolName}`);
          } else {
            logEvent('TOOL', `Tool call: ${toolName}`);
          }
        } else if (block.type === 'text') {
          console.log(`\n${block.text}\n`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        logEvent('COST', `$${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  // Find files the agent created
  try {
    const files = readdirSync(agentWorkdir).filter((f) => !f.startsWith('.'));
    if (files.length > 0) {
      for (const f of files) {
        logEvent('FILE', `Agent created: ${join(agentWorkdir, f)}`);
      }
    } else {
      logEvent('FILE', `No files found in ${agentWorkdir}`);
    }
  } catch {
    // Directory might not exist
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n${BOLD}Marketplace Plugin Demo${RESET}`);
  console.log(`  Repo: ${MARKETPLACE_REPO}`);
  console.log(`  Local: ${MARKETPLACE_DIR}`);
  console.log(`  Output: ${OUTPUT_DIR}\n`);

  // Step 1: Sync the marketplace
  syncMarketplace();

  // Step 2: Discover all plugins
  const plugins = discoverPlugins();

  if (plugins.length === 0) {
    console.log(`\n${RED}No plugins found in marketplace. Exiting.${RESET}`);
    return;
  }

  console.log(`\n${BOLD}All marketplace plugins loaded. Agents will auto-select.${RESET}`);
  console.log('  NOTE: Prompts do NOT name any specific plugin, skill, or agent.\n');

  // Example 1: HTML task — should trigger html-dummy-plugin
  await runAgent(
    'Example 1: HTML page (expects HTML plugin auto-selection)',
    'You are a web developer. Generate complete HTML pages.',
    'Create an HTML page about the history of space exploration.',
    plugins,
    'example1_html_page'
  );

  // Example 2: Markdown task — should trigger markdown-classified-plugin
  await runAgent(
    'Example 2: Markdown document (expects Classified plugin auto-selection)',
    'You are a technical writer. Generate professional markdown documents.',
    'Write a markdown report about the current state of artificial intelligence research.',
    plugins,
    'example2_classified_memo',
    8
  );

  // Example 3: HTML with footer — should trigger geocities + haiku-footer
  await runAgent(
    'Example 3: HTML page with footer (expects multiple components)',
    'You are a web developer. Generate complete HTML pages and make sure every page has a proper footer section.',
    'Create an HTML page about deep sea creatures.',
    plugins,
    'example3_html_with_footer'
  );

  // Final summary
  console.log(`\n${BOLD}All examples complete.${RESET}`);
  if (existsSync(OUTPUT_DIR)) {
    const dirs = readdirSync(OUTPUT_DIR).filter((f) => !f.startsWith('.'));
    if (dirs.length > 0) {
      console.log('\n  Saved files (inspect to verify plugin usage):');
      for (const d of dirs) {
        console.log(`    ${join(OUTPUT_DIR, d)}`);
      }
    }
  }
  console.log();
}

main().catch(console.error);
