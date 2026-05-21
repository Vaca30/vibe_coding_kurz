---
name: docs-api
description: Generate an API endpoint reference for FastAPI, Flask, or Express projects. Auto-detects the framework, lists all routes with methods, parameters, request/response schemas, and curl examples. Use when the user says "generate API docs", "list endpoints", "create API reference", or "document the API".
allowed-tools: read, write, shell
---

# docs-api

Auto-detect the API framework and generate a structured endpoint reference.

## Workflow

### 1. Detect framework

Search for telltale imports / decorators:

| Framework | Signal |
|-----------|--------|
| FastAPI | `from fastapi import` + `@app.get/post/put/delete/patch` or `@router.*` |
| Flask | `from flask import` + `@app.route` or `@bp.route` |
| Express | `app.get/post/put/delete` or `router.get/post/...` |

If unclear, ask the user.

### 2. Extract routes

For each route, capture:
- **Method** (GET / POST / PUT / DELETE / PATCH)
- **Path** (with path params)
- **Handler name** + file:line
- **Path params**, **query params**, **request body schema**
- **Response model / type**
- **Auth requirements** (decorators, dependencies)
- **Description** (from docstring / JSDoc)

### 3. Generate `docs/api.md`

Group by resource. Format:

```markdown
# API Reference

## Orders

### `POST /orders`
Create a new order.

**Request**
```json
{
  "customer_id": 123,
  "items": [{"product_id": 9, "qty": 2}]
}
```

**Response — `201 Created`**
```json
{ "id": 5, "status": "pending", ... }
```

**Errors**
- `400` — invalid items
- `404` — customer not found

**Curl**
```bash
curl -X POST https://api.example.com/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id":123,"items":[{"product_id":9,"qty":2}]}'
```

**Source:** `src/api/orders.py:42`
```

### 4. Summary

After writing the file:
- Print the count of endpoints documented
- Highlight any that lacked descriptions (need attention)
- Include a TOC at the top

## Rules

- Don't hallucinate routes — only document what exists in source.
- Pull example payloads from tests where possible.
- For untyped params (Flask without Pydantic / Express without TS types), say "see source".
