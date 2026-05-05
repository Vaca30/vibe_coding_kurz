# 3. Skills

A **skill** is a reusable, model-discoverable instruction packet that triggers when Copilot detects a matching user intent. Same idea as Claude Code skills — different file locations.

## Where skills live

| Scope | Path (any of these works) |
|-------|---------------------------|
| **Project** | `.github/skills/`, `.claude/skills/`, or `.agents/skills/` |
| **Personal** | `~/.copilot/skills/`, `~/.claude/skills/`, or `~/.agents/skills/` |

This lesson uses **`.github/skills/`** (the GitHub-native location).

## Skill file shape

Each skill is a directory containing `SKILL.md` plus any helper scripts. The directory name and the `name` frontmatter field must be **lowercase with hyphens**.

```
.github/skills/<skill-name>/
├── SKILL.md           # required — frontmatter + body
└── scripts/           # optional — shell, python, etc.
    └── ...
```

### Frontmatter

```yaml
---
name: skill-identifier              # required — lowercase + hyphens
description: When to use this skill # required — Copilot uses this to decide
allowed-tools: shell                # optional — pre-approved tools for this skill
license: MIT                        # optional
---
```

The body is plain Markdown. Copilot loads **all files** in the skill directory and makes them available alongside `SKILL.md`.

## What's in this folder

A `screenshot` skill that takes screenshots on Linux/macOS/Windows — same idea as the Claude Code lesson, ported to the Copilot CLI shape.

```
.github/skills/screenshot/
├── SKILL.md
└── scripts/
    └── take_screenshot.py
```

## Try it

```bash
cd 3_skills
copilot --allow-tool='shell(python3:*)'
```

Then prompt: `Take a screenshot of my desktop and save it to /tmp/desk.png`

Copilot should match the skill on the description ("desktop screenshot") and run the script.

## Slash commands

Skills are addressable directly:

```
/screenshot Take a screenshot of the active window
```

Or by automatic intent matching when the description fits.

## Manage skills at runtime

```
/skills list                 # show all skills
/skills info screenshot      # show details
/skills reload               # pick up edits without restarting
/skills add                  # add a new skill location
/skills remove screenshot    # uninstall
```
