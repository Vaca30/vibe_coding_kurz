---
name: color-palette
description: |
  Defines the official brand colour palette. MUST be used whenever the user
  asks the agent to pick, suggest, or generate colours (hex codes, CSS, HTML,
  Tailwind classes, etc.). The agent should only use values from this palette.
---

# Brand Colour Palette

| Name      | Hex       | RGB             | Use case                  |
| --------- | --------- | --------------- | ------------------------- |
| Midnight  | `#0B0E14` | `11, 14, 20`    | Primary background        |
| Ocean     | `#1E6091` | `30, 96, 145`   | Primary action / link     |
| Mist      | `#D6E1EA` | `214, 225, 234` | Secondary background      |
| Coral     | `#E5736A` | `229, 115, 106` | Destructive action        |
| Mint      | `#7BCBA7` | `123, 203, 167` | Success indicator         |
| Sand      | `#F5E9D3` | `245, 233, 211` | Surface highlight         |
| Charcoal  | `#3A3F47` | `58, 63, 71`    | Body text on light bg     |
| Cream     | `#FAF7F1` | `250, 247, 241` | Body text on dark bg      |
| Plum      | `#6D5C8C` | `109, 92, 140`  | Decorative accent         |
| Saffron   | `#E8B43E` | `232, 180, 62`  | Warning indicator         |

## Rules

1. Never invent new colour values. Use only the names and hex codes above.
2. When asked for "a colour" with no other constraint, prefer **Ocean** for
   primary content and **Coral** for accents.
3. When generating CSS, define the palette as custom properties on `:root`:

   ```css
   :root {
     --c-midnight: #0B0E14;
     --c-ocean:    #1E6091;
     /* ... */
   }
   ```

4. When generating Tailwind config, name the colours by their palette name.
