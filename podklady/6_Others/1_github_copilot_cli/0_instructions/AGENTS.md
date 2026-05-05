# Core Philosophy

Write code that is **simple, maintainable, and production-ready**. Prioritize clarity over cleverness, and always leave the codebase cleaner than you found it.

## Key Principles

1. **Simplicity First**: Choose the simplest solution that meets requirements (KISS)
2. **Consistency**: Maintain tech stack consistency unless there's strong justification for change
3. **Maintainability**: Self-documenting code over clever solutions
4. **Scalability**: Design for growth without premature optimization
5. **Best Practices**: Follow established patterns, idioms, and community conventions
6. **Clean Architecture**: SOLID principles, separation of concerns
7. **Quality First**: Continuous refactoring is not optional

## Code Quality Standards

### SOLID (non-negotiable)

- **S**ingle Responsibility — one reason to change per class/function
- **O**pen/Closed — open for extension, closed for modification
- **L**iskov Substitution — subtypes substitutable for base types
- **I**nterface Segregation — many specific interfaces beat one general
- **D**ependency Inversion — depend on abstractions

### Clean Code

- Functions ≤ 20 lines ideally, ≤ 100 max
- One level of abstraction per function
- Meaningful, pronounceable names — no abbreviations
- Comments explain *why*, not *what*
- DRY — eliminate duplication through abstraction
- YAGNI — no speculative features
- Composition over inheritance

### Error Handling

- Fail fast and explicitly
- Typed errors with clear messages
- Never silently ignore errors
- Validate at system boundaries

## Technology Stack

### Backend

**Python (preferred):**
- **CRITICAL**: Use `uv` exclusively — NEVER `pip` directly
- Virtualenv: `uv venv` + `source .venv/bin/activate`
- Deps: `uv sync` (not `pip install`)
- API framework: FastAPI + Uvicorn
- Type hints required (Python 3.10+ syntax)

**Node.js:** only when justified — package manager `npm`, framework Express.js, bundler `esbuild`

**Go:** only for performance-critical services or system tools

### Frontend

- Package manager: `npm`
- Framework: React + TypeScript (strict mode)
- UI: shadcn-ui, Radix UI primitives
- Styling: Tailwind CSS

### Scripting

- Default: Python
- Avoid: Bash beyond trivial one-liners, PowerShell

### Infra & DevOps

- Docker (multi-stage builds, .dockerignore)
- Kubernetes via GKE, Helm for templating
- Terraform for cloud resources
- Traefik as ingress

## Anti-Patterns to Avoid

- ❌ Commented-out "just in case" code
- ❌ TODO comments left in committed code
- ❌ Copy-paste instead of abstracting
- ❌ Premature optimization
- ❌ Over-engineering simple solutions
- ❌ Ignoring linter/compiler warnings
- ❌ Speculative features

## Communication

- Assume 20+ years of software engineering experience
- Skip basics unless asked
- Be direct and technical
- Explain *why* decisions were made, not *what* the code does
- Highlight tradeoffs and alternatives

## Code Review Checklist

- [ ] Unused code removed (functions, imports, comments)
- [ ] Comments reflect current implementation
- [ ] No duplication (DRY)
- [ ] Functions small and focused
- [ ] Errors handled explicitly
- [ ] Types maintained (TS / Python hints)
- [ ] Tests written/updated and passing
- [ ] No hardcoded secrets, validated inputs
- [ ] No obvious performance bottlenecks

## Remember

> "Code is read far more often than it is written." — Guido van Rossum

Write code you'd be proud to maintain in 2 years.
