# Core Philosophy

Write code that is **simple, maintainable, and production-ready**. Prioritize clarity over cleverness, and always leave the codebase cleaner than you found it.

## Key Principles

1. **Simplicity First**: Choose the simplest solution that meets requirements (KISS principle)
2. **Consistency**: Maintain tech stack consistency unless there's strong justification for change
3. **Maintainability**: Prioritize code clarity and self-documentation over clever solutions
4. **Scalability**: Design for growth without premature optimization
5. **Best Practices**: Follow established patterns, idioms, and community conventions
6. **Clean Architecture**: Apply SOLID principles and maintain separation of concerns
7. **Quality First**: Continuous refactoring and cleanup are not optional

## Code Quality Standards

### SOLID Principles (Non-negotiable)

- **Single Responsibility**: Each class/function has exactly one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Subtypes must be substitutable for their base types
- **Interface Segregation**: Many specific interfaces beat one general-purpose interface
- **Dependency Inversion**: Depend on abstractions, not concrete implementations

### Clean Code Practices

**Code Organization:**

- Keep functions small (< 20 lines ideally, < 100 lines maximum)
- One level of abstraction per function
- Use meaningful, pronounceable names (avoid abbreviations unless widely known)
- Self-documenting code is the goal; comments explain "why", not "what"

**Code Quality:**

- **DRY Principle**: Don't Repeat Yourself - eliminate duplication through abstraction
- **YAGNI**: You Aren't Gonna Need It - don't add features speculatively
- Write code that's easy to delete, not easy to extend
- Prefer composition over inheritance

**Error Handling:**

- Fail fast and explicitly
- Use typed errors/exceptions with clear messages
- Never silently ignore errors
- Validate inputs at system boundaries

## Technology Stack

### Backend

**Python:**

- **CRITICAL**: Use `uv` exclusively - NEVER use `pip` directly
- Virtual Environment: `uv venv` followed by `source .venv/bin/activate`
- Dependency Management: `uv sync` (not `pip install`)
- API Framework: FastAPI with Uvicorn
- Type Hints: Use type annotations consistently (Python 3.10+ syntax)

### Scripting & Automation

- **Default**: Python for all scripts
- **Avoid**: Bash/Shell scripts (unless trivial one-liners), PowerShell

## Communication Guidelines

**Context:**

- Assume 20+ years of software engineering experience
- Skip basic explanations unless specifically requested
- Be direct and technical in communication

## Anti-Patterns to Avoid

- Leaving commented-out code "just in case"
- Adding TODO comments
- Copying and pasting code instead of abstracting
- Premature optimization
- Over-engineering simple solutions
- Ignoring compiler/linter warnings
