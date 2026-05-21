#!/usr/bin/env node
/**
 * Single Agent Example (6): Agent with Images
 *
 * Demonstrates how to pass images to Claude for analysis.
 * Uses images from the img/ folder to show vision capabilities.
 */

import { query, SDKAssistantMessage, SDKResultMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper function to convert image file to base64
 */
function imageToBase64(imagePath: string): string {
  const imageBuffer = readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * Helper function to get media type from file extension
 */
function getMediaType(filename: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg'; // default fallback
  }
}

async function example1_SingleImage() {
  console.log('=== Example 1: Analyze Single Image ===\n');

  const imagePath = join(__dirname, '../../img/ferrari.jpg');
  const base64Image = imageToBase64(imagePath);
  const mediaType = getMediaType(imagePath);

  console.log(`Loading image: ${imagePath}`);
  console.log(`Image size: ${(base64Image.length * 0.75 / 1024).toFixed(2)} KB\n`);

  // Create user message with image
  async function* singleImageQuery(): AsyncGenerator<SDKUserMessage> {
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: 'What car is in this image? Describe it in detail.',
          },
        ],
      },
      parent_tool_use_id: null,
    } as SDKUserMessage;
  }

  // Query with image content
  for await (const message of query({
    prompt: singleImageQuery(),
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}\n`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`Cost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
      console.log(`Duration: ${resultMsg.duration_ms}ms`);
    }
  }
}

async function example2_MultipleImages() {
  console.log('\n\n=== Example 2: Compare Multiple Images ===\n');

  const images = ['bugatti.jpg', 'ferrari.jpg', 'porsche.jpg', 'subaru.jpg'];
  const imageContent: any[] = [];

  // Load all images
  for (const imageName of images) {
    const imagePath = join(__dirname, '../../img', imageName);
    const base64Image = imageToBase64(imagePath);
    const mediaType = getMediaType(imagePath);

    console.log(`Loading: ${imageName} (${(base64Image.length * 0.75 / 1024).toFixed(2)} KB)`);

    imageContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Image,
      },
    });
  }

  // Add text prompt after all images
  imageContent.push({
    type: 'text',
    text: 'I have shown you 4 car images. Please:\n1. Identify each car (make/model)\n2. Compare their characteristics\n3. Rank them by performance potential',
  });

  console.log('\nSending all images to Claude...\n');

  // Create user message with multiple images
  async function* multiImageQuery(): AsyncGenerator<SDKUserMessage> {
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: imageContent,
      },
      parent_tool_use_id: null,
    } as SDKUserMessage;
  }

  for await (const message of query({
    prompt: multiImageQuery(),
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`\nClaude: ${block.text}\n`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`Cost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
      console.log(`Duration: ${resultMsg.duration_ms}ms`);
    }
  }
}

async function example3_ImageWithConversation() {
  console.log('\n\n=== Example 3: Multi-turn Conversation with Image ===\n');

  const imagePath = join(__dirname, '../../img/porsche.jpg');
  const base64Image = imageToBase64(imagePath);
  const mediaType = getMediaType(imagePath);

  console.log(`Loading image: ${imagePath}\n`);

  // Multi-turn conversation using async generator
  async function* conversation(): AsyncGenerator<SDKUserMessage> {
    // First turn: Show image and ask initial question
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: 'What car is this?',
          },
        ],
      },
      parent_tool_use_id: null,
    } as SDKUserMessage;

    // Second turn: Follow-up question (Claude remembers the image)
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What are the key performance specs for this model?',
          },
        ],
      },
      parent_tool_use_id: null,
    } as SDKUserMessage;

    // Third turn: Another follow-up
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What makes this car special compared to its competitors?',
          },
        ],
      },
      parent_tool_use_id: null,
    } as SDKUserMessage;
  }

  let turnNumber = 0;

  for await (const message of query({
    prompt: conversation(),
  })) {
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      turnNumber++;
      console.log(`\n--- Turn ${turnNumber} ---`);
      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          console.log(`Claude: ${block.text}\n`);
        }
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      if (resultMsg.total_cost_usd && resultMsg.total_cost_usd > 0) {
        console.log(`\nTotal Cost: $${resultMsg.total_cost_usd.toFixed(4)}`);
      }
      console.log(`Total Duration: ${resultMsg.duration_ms}ms`);
      console.log(`Total Turns: ${resultMsg.num_turns}`);
    }
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Claude Agent SDK - Image Examples       ║');
  console.log('╚════════════════════════════════════════════╝\n');

  try {
    // Run example 1: Single image analysis
    await example1_SingleImage();

    // Run example 2: Multiple images comparison
    await example2_MultipleImages();

    // Run example 3: Multi-turn conversation with image
    await example3_ImageWithConversation();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main().catch(console.error);
