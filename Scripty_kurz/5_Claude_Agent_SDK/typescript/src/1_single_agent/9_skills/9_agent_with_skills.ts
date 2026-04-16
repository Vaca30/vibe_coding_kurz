#!/usr/bin/env node
/**
 * Single Agent Example (8): Agent with Skills
 *
 * Demonstrates using skills to constrain and guide agent behavior.
 *
 * Skills are markdown files in .claude/skills/<name>/SKILL.md that provide
 * domain-specific knowledge. They are:
 * - Loaded via settingSources: ['project']
 * - Enabled by including "Skill" in allowedTools
 * - Automatically invoked by Claude when relevant to the context
 *
 * The prompts make NO mention of skills at all. The agent sees the skill
 * descriptions via settingSources and autonomously decides to invoke the
 * color-palette skill because its description says it MUST be used
 * whenever a color value is needed.
 *
 * Skill in this demo:
 *   - color-palette: 10 brand colors with hex values, RGB, and usage rules
 *
 * Output files are saved to the output/ directory.
 */

import { query, SDKAssistantMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SKILLS_DIR = __dirname;
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
    SKILL: YELLOW,
    TOOL: GREEN,
    PROMPT: CYAN,
    DETECT: GREEN,
    COST: RED,
    FILE: MAGENTA,
  };
  const color = colors[category] || RESET;
  console.log(`  ${color}[${category}]${RESET} ${message}`);
}

// ---------------------------------------------------------------------------
// Example 1: Generate a markdown file documenting the brand colors
// ---------------------------------------------------------------------------
async function exampleGenerateMarkdown() {
  console.log(`\n${BOLD}${'='.repeat(60)}`);
  console.log('  Example 1: Generate Color Palette Markdown');
  console.log(`${'='.repeat(60)}${RESET}\n`);

  const collectedText: string[] = [];

  const prompt =
    'Create a markdown document that lists all our brand colors. ' +
    'For each color include: name, hex value, RGB value, and when to use it. ' +
    'Format it as a nice reference table.';
  logEvent('PROMPT', prompt);
  console.log();

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: 'You are a technical writer. Output raw markdown only, no explanations.',
      model: 'claude-opus-4-6',
      allowedTools: ['Skill'],
      settingSources: ['project'],
      cwd: SKILLS_DIR,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'tool_use') {
          if (block.name.toLowerCase().includes('skill')) {
            logEvent('SKILL', `>>> SKILL INVOKED: ${block.name}`);
            logEvent('SKILL', `    Input: ${JSON.stringify(block.input).slice(0, 120)}...`);
          } else {
            logEvent('TOOL', `Tool call: ${block.name}`);
          }
        } else if (block.type === 'text') {
          const paletteColors = ['#1B1F3B', '#2E86AB', '#E8505B', '#F4A261', '#2EC4B6'];
          for (const hex of paletteColors) {
            if (block.text.includes(hex)) {
              logEvent('DETECT', `Found palette color ${hex} in output!`);
              break;
            }
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

  const outputFile = join(OUTPUT_DIR, 'color_palette.md');
  writeFileSync(outputFile, collectedText.join('\n'), 'utf-8');
  logEvent('FILE', `Saved to ${outputFile}`);
}

// ---------------------------------------------------------------------------
// Example 2: Generate an HTML page visualizing the brand colors
// ---------------------------------------------------------------------------
async function exampleGenerateHtml() {
  console.log(`\n${BOLD}${'='.repeat(60)}`);
  console.log('  Example 2: Generate Color Palette HTML Page');
  console.log(`${'='.repeat(60)}${RESET}\n`);

  const collectedText: string[] = [];

  const prompt =
    'Create a single self-contained HTML page that displays all our brand colors. ' +
    'Show each color as a large swatch with its name, hex code, and RGB value. ' +
    'Use a clean grid layout with inline CSS.';
  logEvent('PROMPT', prompt);
  console.log();

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: 'You are a frontend developer. Output raw HTML only, no explanations.',
      model: 'claude-opus-4-6',
      allowedTools: ['Skill'],
      settingSources: ['project'],
      cwd: SKILLS_DIR,
    },
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'tool_use') {
          if (block.name.toLowerCase().includes('skill')) {
            logEvent('SKILL', `>>> SKILL INVOKED: ${block.name}`);
            logEvent('SKILL', `    Input: ${JSON.stringify(block.input).slice(0, 120)}...`);
          } else {
            logEvent('TOOL', `Tool call: ${block.name}`);
          }
        } else if (block.type === 'text') {
          const paletteColors = ['#1B1F3B', '#2E86AB', '#E8505B', '#F4A261', '#2EC4B6'];
          for (const hex of paletteColors) {
            if (block.text.includes(hex)) {
              logEvent('DETECT', `Found palette color ${hex} in output!`);
              break;
            }
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

  // Extract HTML from potential markdown code fences
  const raw = collectedText.join('\n');
  const match = raw.match(/```html?\s*\n(.*?)```/s);
  const html = match ? match[1].trim() : raw;

  const outputFile = join(OUTPUT_DIR, 'color_palette.html');
  writeFileSync(outputFile, html, 'utf-8');
  logEvent('FILE', `Saved to ${outputFile}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`\n${BOLD}Skills Demo: color-palette${RESET}`);
  console.log('  SKILL: color-palette (brand colors with hex, RGB, and usage rules)');
  console.log(`  Skills dir: ${SKILLS_DIR}`);
  console.log('\n  NOTE: Prompts do NOT name any skill.');
  console.log('  The agent discovers and selects them automatically.\n');

  await exampleGenerateMarkdown();
  await exampleGenerateHtml();

  console.log(`\n${BOLD}All examples complete.${RESET}\n`);
}

main().catch(console.error);
