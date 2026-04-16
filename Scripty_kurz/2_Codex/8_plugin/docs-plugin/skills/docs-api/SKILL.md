---
name: docs-api
description: "Generate API reference documentation by detecting the API framework and extracting endpoints, parameters, schemas, and example commands."
---

# docs-api Skill

Auto-detect the API framework and generate a structured API reference in markdown.

## Workflow

### Step 1: Detect the API framework

Check for framework indicators in this order:

| Framework | Detection |
|-----------|-----------|
| FastAPI | `from fastapi`, `@app.get`, `@router.get` |
| Flask | `from flask`, `@app.route` |
| Express | `express`, `app.get(`, `router.get(` |
| Django REST | `from rest_framework` |
| Go net/http | `http.HandleFunc`, `mux.HandleFunc` |

Use fast search:

```bash
rg -n "from fastapi|from flask|express|from rest_framework|http\\.HandleFunc|mux\\.HandleFunc" . --glob '*.py' --glob '*.ts' --glob '*.js' --glob '*.go'
```

If no framework is detected, say so explicitly and avoid inventing an API structure.

### Step 2: Extract endpoints

For each endpoint, capture:
- HTTP method
- path
- handler function
- parameters
- request body
- response type or response model
- auth requirements when visible in code
- description from docstrings or route metadata

Read the source files directly for full signatures and types.

### Step 3: Extract schemas

For request and response models:
- **Python**: inspect Pydantic models or dataclasses
- **TypeScript**: inspect exported interfaces and types
- **Go**: inspect structs and JSON tags

### Step 4: Generate API reference

Write or update `docs/api-reference.md` unless the repo already has a stronger convention.

Use a structure like:

```markdown
# API Reference

> Auto-generated from source code.

## Products

### GET /api/v1/products

List products with optional filtering.

**Query Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| category | string | No | - | Filter by category |
| limit | int | No | 50 | Max results to return |

**Example**

```bash
curl -X GET "http://localhost:8000/api/v1/products?category=electronics&limit=10"
```
```

### Step 5: Validate against an existing OpenAPI spec

If the repo contains `openapi.json`, `openapi.yaml`, or `swagger.json`:
1. Compare extracted endpoints against the spec.
2. Flag discrepancies.
3. Add a short validation section to the generated docs.

## Important

- Group endpoints by resource or router.
- Sort within a group as list, detail, create, update, delete when practical.
- Use realistic example values.
- Include auth headers in examples when endpoints require them.
- If the API uses versioning, call that out clearly.
- Default the base URL to `http://localhost:8000` unless the repo shows a better value.
