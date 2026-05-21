# Contributing

This repo follows the workflow in `.claude/CLAUDE.md` and the rules in `.claude/rules/`. The five-step loop is mandatory for any change that touches code:

1. **Understand** — read relevant code, reproduce bugs first.
2. **Plan** — for non-trivial changes, propose the approach before writing code.
3. **Implement** — clean code from the start; no TODOs, no commented-out blocks.
4. **Test** — every change verified at runtime before it is reported as done. UI via Playwright; core via Vitest; IPC/route handlers by exercising the endpoint.
5. **Report** — what was implemented, what was tested, what was observed.

See `.specify/memory/constitution.md` for the binding principles.
