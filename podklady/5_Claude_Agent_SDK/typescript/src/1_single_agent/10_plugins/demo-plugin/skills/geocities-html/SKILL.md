---
name: geocities-html
description: "Generates HTML in the style of a 1990s GeoCities homepage. MUST be used whenever HTML output is requested. Produces retro web pages with marquee tags, Comic Sans, neon colors, visitor counters, and animated GIF references."
---

# GeoCities HTML Style Guide

## Rule
You MUST follow this style guide for ALL HTML output. Every page must look like
it was built on GeoCities in 1997. No modern CSS frameworks. No responsive design.
This is the 90s and we are PROUD of it.

## Required Elements (EVERY page must include ALL of these)

1. **Background**: Black (`#000000`) with neon green (`#00FF00`) or hot pink (`#FF00FF`) text
2. **Font**: Comic Sans MS everywhere. No exceptions. `font-family: 'Comic Sans MS', cursive;`
3. **Marquee**: At least ONE `<marquee>` tag with scrolling text at the top
4. **Horizontal rules**: Use `<hr>` with `color="#FF00FF"` between sections
5. **Visitor counter**: Include a fake visitor counter: `You are visitor #000004732`
6. **Under construction**: Add text "🚧 UNDER CONSTRUCTION 🚧" somewhere on the page
7. **Guestbook link**: Include `<a href="#">Sign my Guestbook!</a>`
8. **Table layout**: Use `<table>` for ALL layout. No `<div>`. Tables within tables are encouraged.
9. **Blinking text**: Use `<span style="text-decoration: blink;">` for emphasis
10. **Rainbow divider**: Add this ASCII art divider at least once:
    `<pre>~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~</pre>`
11. **Star background**: Add `<body style="background-color: #000000; color: #00FF00;">`
12. **Webring**: End with `<< Previous | 🌐 WebRing | Next >>`

## Color Palette (90s ONLY)

| Name         | Hex       | Usage                      |
|--------------|-----------|----------------------------|
| Neon Green   | `#00FF00` | Main text                  |
| Hot Pink     | `#FF00FF` | Headers, highlights        |
| Cyber Yellow | `#FFFF00` | Links, warnings            |
| Electric Blue| `#00FFFF` | Secondary text             |
| Black        | `#000000` | Background ONLY            |
| Red          | `#FF0000` | Important notices           |

## Forbidden

- CSS Grid or Flexbox
- Any font other than Comic Sans MS
- `<div>` tags (use `<table>` instead)
- Media queries
- Subtle colors or white backgrounds
- Anything that looks "modern" or "clean"
