# 3_subagent_uses_skill

Codex example for `subagent -> skill`.

This scenario uses a release-notes worker that carries its own local skill.



## Setup

Run this against:

```text
./my-ecommerce
```

Pull via `git clone https://github.com/lukaskellerstein/my-ecommerce.git`

## Prompt

```text
Spawn release_notes_writer for ./my-ecommerce and draft release notes for the latest search and catalog changes.
```

`release_notes_writer` has `[[skills.config]]` wired to the local `release-notes-drafter` skill, so the worker comes with its own reusable drafting workflow.
