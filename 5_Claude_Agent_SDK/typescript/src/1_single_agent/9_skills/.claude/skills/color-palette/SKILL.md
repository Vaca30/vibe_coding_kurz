---
name: color-palette
description: "Defines the official brand color palette. MUST be used whenever a color value is needed - for CSS, HTML, charts, SVGs, UI design, or any output that includes color. No other colors are allowed."
---

# Brand Color Palette

## Rule
You MUST only use colors from this palette. Never invent, guess, or use any color not listed below. If a user asks for a color that doesn't exist in this palette, pick the closest match and explain why.

## The Palette

| Name           | Hex       | RGB              | Use Case                        |
|----------------|-----------|------------------|---------------------------------|
| Midnight       | `#1B1F3B` | rgb(27, 31, 59)  | Primary backgrounds, headers    |
| Ocean          | `#2E86AB` | rgb(46, 134, 171)| Primary actions, links          |
| Coral          | `#E8505B` | rgb(232, 80, 91) | Alerts, errors, destructive     |
| Sunflower      | `#F4A261` | rgb(244, 162, 97) | Warnings, highlights            |
| Mint           | `#2EC4B6` | rgb(46, 196, 182)| Success states, confirmations   |
| Lavender       | `#9B5DE5` | rgb(155, 93, 229)| Accent, decorative elements     |
| Cloud          | `#F0F0F0` | rgb(240, 240, 240)| Light backgrounds, cards        |
| Slate          | `#6B7280` | rgb(107, 114, 128)| Secondary text, borders         |
| Snow           | `#FFFFFF` | rgb(255, 255, 255)| White space, text on dark       |
| Charcoal       | `#2D2D2D` | rgb(45, 45, 45)  | Primary text on light           |

## Usage Rules

1. **Backgrounds**: Use Midnight (dark) or Cloud (light). Snow for cards on Cloud.
2. **Text**: Charcoal on light backgrounds, Snow on dark backgrounds.
3. **Interactive elements**: Ocean for primary, Lavender for secondary.
4. **Status colors**: Mint = success, Sunflower = warning, Coral = error.
5. **Charts/graphs**: Cycle through Ocean, Coral, Sunflower, Mint, Lavender (in that order).
6. **Borders & dividers**: Slate only.

## Contrast Requirements
- Always pair Charcoal or Midnight text with Cloud/Snow backgrounds.
- Always pair Snow text with Midnight or Ocean backgrounds.
- Never place Sunflower or Mint text on Cloud - use them only as background fills with Charcoal text.
