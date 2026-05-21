# Repository Guidelines

## Project Structure & Module Organization
This repository is currently minimal and does not yet contain application source files, tests, or assets. As the project grows, keep the layout predictable:

- `src/` for application code
- `tests/` for automated tests
- `assets/` for static files such as images or sample data
- `docs/` for design notes or architecture references

Prefer small, focused modules. Match test files to source files when practical, for example `src/auth/login.js` and `tests/auth/login.test.js`.

## Build, Test, and Development Commands
No build system or package manager is configured yet. When tooling is added, expose a small set of standard commands and document them here. Recommended defaults:

- `npm install` to install dependencies
- `npm run dev` to start a local development server
- `npm test` to run the test suite
- `npm run lint` to check formatting and style

If this repository uses a different stack later, keep command names consistent and update this guide.

## Coding Style & Naming Conventions
Use 2 or 4 spaces consistently within a file; do not mix indentation styles. Prefer descriptive file and symbol names.

- Directories: lowercase with hyphens when needed, for example `api-client/`
- Source files: match the language ecosystem, such as `user_service.py` or `user-service.ts`
- Classes/components: `PascalCase`
- Functions/variables: `camelCase` or ecosystem-standard naming

Add a formatter and linter early and run them before opening a pull request.

## Testing Guidelines
Place tests under `tests/` or beside source files if the chosen framework prefers co-location. Name test files after the unit under test, such as `login.test.ts` or `test_login.py`.

Aim for meaningful coverage of core logic and edge cases. Every bug fix should include a regression test when feasible.

## Commit & Pull Request Guidelines
Git history is not available in this workspace, so no repository-specific commit convention can be inferred yet. Use short, imperative commit messages such as `Add login form validation`.

For pull requests, include:

- a clear summary of the change
- testing notes with exact commands run
- linked issue or task reference, if applicable
- screenshots or logs for UI or behavior changes

## Agent-Specific Instructions
Keep changes narrow and avoid broad refactors unless required. Update this file when the repository gains real tooling, structure, or workflow rules.
