# Release Notes Format

This skill defines the standard format for release notes. Any agent that
carries this skill MUST follow these rules when drafting release notes.

## Output Structure

Always use this exact structure:

```markdown
# Release Notes — v{VERSION} ({DATE})

## Summary

{1-3 sentence high-level overview of this release}

## Highlights

{Bulleted list of the most important changes — max 5 items}

## Changes

### Features
- {description} ({scope})

### Improvements
- {description} ({scope})

### Bug Fixes
- {description} ({scope})

### Breaking Changes
- {description} — **Migration:** {what consumers must do}

### Operational Notes
- {description}

### Dependencies
- {package}: {old_version} → {new_version}

## Risks & Follow-up

- {Any known risks, caveats, or items that need monitoring after deploy}
```

## Formatting Rules

1. **Version**: Use semantic versioning. If no tag exists, use `UNRELEASED`.
2. **Date**: Use `YYYY-MM-DD` format.
3. **Scope tags**: Use lowercase labels in parentheses — e.g., `(api)`,
   `(search)`, `(auth)`, `(frontend)`, `(database)`.
4. **Empty sections**: Omit any section that has zero items. Do not include
   empty headings.
5. **Breaking changes**: Always include a `Migration:` note explaining what
   the consumer must do.
6. **Tone**: Professional, concise, factual. No marketing language.
7. **Audience**: Write for developers and operators unless told otherwise.

## Audience Variants

When the caller specifies an audience, adjust tone accordingly:

| Audience       | Tone                    | Include                        | Exclude                      |
| -------------- | ----------------------- | ------------------------------ | ---------------------------- |
| **engineering**| Technical, direct       | API changes, migrations, risks | Marketing language            |
| **customer**   | Friendly, benefit-first | Features, fixes, improvements  | Internal refactors, ops notes |
| **stakeholder**| High-level, outcome     | Highlights, summary, risks     | Implementation details        |

Default audience is **engineering** unless specified otherwise.
