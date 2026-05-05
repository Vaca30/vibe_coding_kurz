---
name: screenshot
description: Use when the user asks for a desktop or system screenshot — full screen, a specific app/window, or a pixel region. Prefer tool-specific captures (Figma MCP, Playwright) when those fit better; this skill is for OS-level captures.
allowed-tools: shell
license: MIT
---

# Screenshot Capture

Take a screenshot of the screen, a region, or (on macOS) a specific window/app.

## Save-location rules

1. If the user specifies a path, save there.
2. If the user just says "take a screenshot", save to the OS default screenshot location.
3. If you need a screenshot for your own inspection, save to `$TMPDIR` (or `/tmp` on Linux).

## Tool priority

- Prefer **tool-specific** captures when available: Figma MCP for Figma, Playwright for browsers/Electron.
- Use this skill for whole-system captures or when no integrated tool exists.

## Linux / macOS

```bash
python3 .github/skills/screenshot/scripts/take_screenshot.py
```

Common patterns:

```bash
# Default location
python3 .github/skills/screenshot/scripts/take_screenshot.py

# Temp location (your own visual check)
python3 .github/skills/screenshot/scripts/take_screenshot.py --mode temp

# Explicit path
python3 .github/skills/screenshot/scripts/take_screenshot.py --path output/screen.png

# Pixel region
python3 .github/skills/screenshot/scripts/take_screenshot.py --region 100,200,800,600

# Active window
python3 .github/skills/screenshot/scripts/take_screenshot.py --active-window
```

### Linux prerequisites

The helper picks the first available tool, in this order:

1. `scrot`
2. `gnome-screenshot`
3. ImageMagick `import`

If none is installed, ask the user to install one and retry.

### macOS

Region/window captures use `screencapture` via the helper. For a fallback:

```bash
screencapture -x output/screen.png            # full screen
screencapture -x -R100,200,800,600 region.png # region
screencapture -x -i interactive.png           # interactive picker
```

## Windows

Use the PowerShell fallback:

```powershell
Add-Type -AssemblyName System.Windows.Forms
$bmp = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(0, 0, 0, 0, $bmp.Size)
$bmp.Save("output/screen.png")
```

## Error handling

- Always print the saved file path at the end.
- If multiple displays match, the script prints one path per line.
- On permission errors, ask the user to grant Screen Recording permission (macOS) and retry.
