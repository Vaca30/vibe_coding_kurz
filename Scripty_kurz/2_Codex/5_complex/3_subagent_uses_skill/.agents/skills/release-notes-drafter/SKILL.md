---
name: "release-notes-drafter"
description: "Use when drafting release notes, changelog entries, internal launch notes, or customer-facing change summaries from code changes."
---

# Release Notes Drafter

Turn repository changes into a concise release summary that an engineer or product lead could actually send.

## Workflow

### 1. Determine the change scope

- Prefer the exact scope named by the user.
- Otherwise inspect recent commits, changed files, tags, or diffs to infer the release boundary.
- Ignore noise such as formatting-only or mechanical lockfile churn unless it affects rollout risk.

### 2. Extract the signal

Identify:

- user-visible changes
- operational or deployment changes
- migrations or configuration changes
- fixes worth calling out
- known limitations
- rollback or monitoring notes

### 3. Draft for the right audience

If the audience is not specified, default to an internal engineering release note.

Use one of these tones:

- internal engineering update
- customer-facing release notes
- stakeholder status update

### 4. Format

Default format:

```markdown
## Summary
[2-4 sentences]

## Highlights
- ...
- ...

## Operational Notes
- ...

## Risks / Follow-up
- ...
```

## Rules

- Prefer outcomes over implementation trivia.
- Mention migrations, config changes, or rollout cautions when present.
- Be specific enough that another engineer can validate the release.
- If the evidence is weak, call that out instead of inventing certainty.
