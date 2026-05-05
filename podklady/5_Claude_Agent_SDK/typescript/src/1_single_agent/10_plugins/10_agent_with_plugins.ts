#!/usr/bin/env node
/**
 * Single Agent Example (9): Agent with Plugins
 *
 * Demonstrates how to load and use plugins with the Claude Agent SDK.
 *
 * Plugins are self-contained extensions that bundle skills, agents, hooks,
 * and MCP servers into a single distributable package. They live in a directory
 * with this structure:
 *
 *     my-plugin/
 *     ├── .claude-plugin/
 *     │   └── plugin.json          # Required manifest (name, version, etc.)
 *     ├── skills/                  # Skills (model-invoked capabilities)
 *     │   └── <skill-name>/
 *     │       └── SKILL.md
 *     ├── agents/                  # Specialized subagents
 *     │   └── <agent-name>.md
 *     ├── hooks/                   # Event handlers (optional)
 *     │   └── hooks.json
 *     └── .mcp.json                # MCP server definitions (optional)
 *
 * Key differences from raw skills (example 8):
 *   - Skills in example 8 live in .claude/skills/ and are loaded via
 *     settingSources: ['project']. They are project-level settings.
 *   - Plugins are loaded explicitly via the `plugins` option and are
 *     self-contained, portable packages.
 *
 * Plugin in this demo ("demo-plugin"):
 *   - SKILL "geocities-html": Forces ALL HTML output into 1990s GeoCities style
 *   - AGENT "haiku-footer": Appends a minimalist zen haiku footer
 *
 * IMPORTANT: The prompts do NOT name any specific skill or agent.
 * The main agent discovers and selects them automatically.
 */

import { query, SDKAssistantMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLUGIN_DIR = join(__dirname, 'demo-plugin');
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

function extractHtml(text: string): string | null {
  // Try markdown code fences
  const fenceMatch = text.match(/```html?\s*\n(.*?)```/s);
  if (fenceMatch) return fenceMatch[1].trim();
  // Try raw HTML
  const doctypeMatch = text.match(/(<!DOCTYPE.*<\/html>)/is);
  if (doctypeMatch) return doctypeMatch[1].trim();
  const htmlMatch = text.match(/(<html.*<\/html>)/is);
  if (htmlMatch) return htmlMatch[1].trim();
  return null;
}

function saveHtml(filename: string, html: string) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const filepath = join(OUTPUT_DIR, filename);
  writeFileSync(filepath, html, 'utf-8');
  logEvent('FILE', `Saved HTML to ${filepath}`);
}

// ---------------------------------------------------------------------------
// Example 1: Prompt triggers the geocities-html skill automatically
// ---------------------------------------------------------------------------
async function exampleSkillOnly() {
  console.log(`\n${BOLD}${'='.repeat(60)}`);
  console.log('  Example 1: Expecting SKILL auto-selection');
  console.log(`${'='.repeat(60)}${RESET}\n`);

  logEvent('PLUGIN', `Loading demo-plugin from ${PLUGIN_DIR}`);

  const prompt = 'Create an HTML page about my cat named Whiskers.';
  logEvent('PLUGIN', `Sending prompt: ${prompt}`);

  const collectedText: string[] = [];

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: 'You are an HTML developer. Generate complete HTML pages.',
      model: 'claude-opus-4-6',
      maxTurns: 3,
      plugins: [{ type: 'local', path: PLUGIN_DIR }],
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'tool_use') {
          const toolName = block.name;
          const inputStr = JSON.stringify(block.input).toLowerCase();
          if (toolName.toLowerCase().includes('skill') || inputStr.includes('geocities')) {
            logEvent('SKILL', `>>> SKILL INVOKED: ${toolName}`);
            logEvent('SKILL', `    Input: ${JSON.stringify(block.input).slice(0, 120)}...`);
          } else if (toolName.toLowerCase().includes('agent') || inputStr.includes('haiku')) {
            logEvent('AGENT', `>>> AGENT INVOKED: ${toolName}`);
            logEvent('AGENT', `    Input: ${JSON.stringify(block.input).slice(0, 120)}...`);
          } else {
            logEvent('TOOL', `Tool call: ${toolName}`);
          }
        } else if (block.type === 'text') {
          if (block.text.includes('Comic Sans') || block.text.includes('marquee')) {
            logEvent('SKILL', 'Detected GeoCities style in output!');
          }
          if (block.text.includes('haiku-footer') || block.text.includes('Moment of Zen')) {
            logEvent('AGENT', 'Detected haiku footer in output!');
          }
          console.log(`\n${block.text}\n`);
          collectedText.push(block.text);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        logEvent('COST', `$${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  const fullText = collectedText.join('\n');
  const html = extractHtml(fullText);
  if (html) {
    saveHtml('example1_skill_only.html', html);
  } else {
    logEvent('FILE', 'No HTML block found in output to save');
  }
}

// ---------------------------------------------------------------------------
// Example 2: Prompt triggers the haiku-footer agent automatically
// ---------------------------------------------------------------------------
async function exampleAgentOnly() {
  console.log(`\n${BOLD}${'='.repeat(60)}`);
  console.log('  Example 2: Expecting AGENT auto-selection');
  console.log(`${'='.repeat(60)}${RESET}\n`);

  logEvent('PLUGIN', `Loading demo-plugin from ${PLUGIN_DIR}`);

  const sampleHtml =
    '<html><head><title>My Page</title></head>' +
    '<body><h1>Hello World</h1>' +
    '<p>This is a simple page about clouds.</p>' +
    '</body></html>';

  const prompt = `Add a poetic footer to this HTML page:\n\n${sampleHtml}`;
  logEvent('PLUGIN', 'Sending prompt to add a footer to HTML');

  const collectedText: string[] = [];

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: 'You are an HTML editor. Help the user modify HTML content.',
      model: 'claude-opus-4-6',
      maxTurns: 5,
      plugins: [{ type: 'local', path: PLUGIN_DIR }],
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'tool_use') {
          const toolName = block.name;
          const inputStr = JSON.stringify(block.input).toLowerCase();
          if (toolName.toLowerCase().includes('agent') || inputStr.includes('haiku')) {
            logEvent('AGENT', `>>> AGENT INVOKED: ${toolName}`);
            logEvent('AGENT', `    Input: ${JSON.stringify(block.input).slice(0, 120)}...`);
          } else if (toolName.toLowerCase().includes('skill') || inputStr.includes('geocities')) {
            logEvent('SKILL', `>>> SKILL INVOKED: ${toolName}`);
            logEvent('SKILL', `    Input: ${JSON.stringify(block.input).slice(0, 120)}...`);
          } else {
            logEvent('TOOL', `Tool call: ${toolName}`);
          }
        } else if (block.type === 'text') {
          if (block.text.includes('haiku-footer') || block.text.includes('Moment of Zen')) {
            logEvent('AGENT', 'Detected haiku footer in output!');
          }
          if (block.text.includes('Comic Sans') || block.text.includes('marquee')) {
            logEvent('SKILL', 'Detected GeoCities style in output!');
          }
          console.log(`\n${block.text}\n`);
          collectedText.push(block.text);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        logEvent('COST', `$${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  const fullText = collectedText.join('\n');
  const html = extractHtml(fullText);
  if (html) {
    saveHtml('example2_agent_only.html', html);
  } else {
    logEvent('FILE', 'No HTML block found in output to save');
  }
}

// ---------------------------------------------------------------------------
// Example 3: Prompt should trigger BOTH skill and agent automatically
// ---------------------------------------------------------------------------
async function exampleBothCombined() {
  console.log(`\n${BOLD}${'='.repeat(60)}`);
  console.log('  Example 3: Expecting BOTH skill + agent auto-selection');
  console.log(`${'='.repeat(60)}${RESET}\n`);

  logEvent('PLUGIN', `Loading demo-plugin from ${PLUGIN_DIR}`);

  const prompt = 'Create an HTML page about the solar system.';
  logEvent('PLUGIN', `Sending prompt: ${prompt}`);

  let skillUsed = false;
  let agentUsed = false;
  const collectedText: string[] = [];

  for await (const message of query({
    prompt,
    options: {
      systemPrompt:
        'You are an HTML developer. Generate complete HTML pages ' +
        'and make sure they have a proper footer.',
      model: 'claude-opus-4-6',
      maxTurns: 6,
      plugins: [{ type: 'local', path: PLUGIN_DIR }],
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'tool_use') {
          const toolName = block.name;
          const inputStr = JSON.stringify(block.input).toLowerCase();
          if (toolName.toLowerCase().includes('skill') || inputStr.includes('geocities')) {
            skillUsed = true;
            logEvent('SKILL', `>>> SKILL INVOKED: ${toolName}`);
            logEvent('SKILL', `    Input: ${JSON.stringify(block.input).slice(0, 120)}...`);
          } else if (toolName.toLowerCase().includes('agent') || inputStr.includes('haiku')) {
            agentUsed = true;
            logEvent('AGENT', `>>> AGENT INVOKED: ${toolName}`);
            logEvent('AGENT', `    Input: ${JSON.stringify(block.input).slice(0, 120)}...`);
          } else {
            logEvent('TOOL', `Tool call: ${toolName}`);
          }
        } else if (block.type === 'text') {
          if (block.text.includes('Comic Sans') || block.text.includes('marquee')) {
            skillUsed = true;
            logEvent('SKILL', 'Detected GeoCities style in output!');
          }
          if (block.text.includes('haiku-footer') || block.text.includes('Moment of Zen')) {
            agentUsed = true;
            logEvent('AGENT', 'Detected haiku footer in output!');
          }
          console.log(`\n${block.text}\n`);
          collectedText.push(block.text);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        logEvent('COST', `$${resultMsg.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  const fullText = collectedText.join('\n');
  const html = extractHtml(fullText);
  if (html) {
    saveHtml('example3_both_combined.html', html);
  } else {
    logEvent('FILE', 'No HTML block found in output to save');
  }

  // Summary
  console.log(`\n${BOLD}--- Plugin Usage Summary ---${RESET}`);
  const skillStatus = skillUsed ? `${GREEN}YES${RESET}` : `${RED}NO${RESET}`;
  const agentStatus = agentUsed ? `${GREEN}YES${RESET}` : `${RED}NO${RESET}`;
  console.log(`  GeoCities skill used: ${skillStatus}`);
  console.log(`  Haiku footer agent used: ${agentStatus}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n${BOLD}Plugin Demo: demo-plugin${RESET}`);
  console.log('  SKILL: geocities-html (90s GeoCities style)');
  console.log('  AGENT: haiku-footer (minimalist zen haiku)');
  console.log(`  Plugin path: ${PLUGIN_DIR}`);
  console.log(`  Output dir:  ${OUTPUT_DIR}`);
  console.log('\n  NOTE: Prompts do NOT name any skill or agent.');
  console.log('  The main agent discovers and selects them automatically.\n');

  await exampleSkillOnly();
  await exampleAgentOnly();
  await exampleBothCombined();

  console.log(`\n${BOLD}All examples complete.${RESET}\n`);
}

main().catch(console.error);
