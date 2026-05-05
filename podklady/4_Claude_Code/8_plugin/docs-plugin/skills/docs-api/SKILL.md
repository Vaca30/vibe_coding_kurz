---
name: docs-api
description: "Generate API reference documentation by auto-detecting the API framework (FastAPI, Flask, Express) and extracting all endpoints with their methods, paths, parameters, request/response schemas, and example curl commands. Use when the user says 'generate API docs', 'API reference', 'document endpoints', 'API documentation', or any variation of wanting endpoint documentation."
---

# docs-api Skill

Auto-detect the API framework and generate a structured API reference in markdown.

## Workflow

### Step 1: Detect API Framework

Check for framework indicators in order:

| Framework | Detection |
|-----------|-----------|
| FastAPI | `from fastapi` imports, `@app.get`, `@router.get`, etc. |
| Flask | `from flask` imports, `@app.route` |
| Express | `require('express')` or `import express`, `app.get(`, `router.get(` |
| Django REST | `from rest_framework` imports |
| Go net/http | `http.HandleFunc`, `mux.HandleFunc` |

```bash
grep -rn "from fastapi\|from flask\|require.*express\|from rest_framework" src/ --include="*.py" --include="*.js" --include="*.ts"
```

If no framework detected, inform the user and ask them to specify.

### Step 2: Extract Endpoints

**For FastAPI:**
```bash
grep -rn "@app\.\(get\|post\|put\|delete\|patch\)\|@router\.\(get\|post\|put\|delete\|patch\)" --include="*.py"
```

For each endpoint, extract:
- **Method**: GET, POST, PUT, DELETE, PATCH
- **Path**: the route string (e.g., `/api/v1/products/{product_id}`)
- **Function name**: the handler function
- **Parameters**: path params, query params, request body (with types)
- **Response model**: return type or `response_model=` kwarg
- **Auth**: any dependency injection for auth (e.g., `Depends(get_current_user)`)
- **Description**: from the function docstring or `summary=`/`description=` kwargs

Read the actual source files to get complete function signatures and type annotations.

### Step 3: Extract Schemas

For request/response models:
- **Python (Pydantic)**: find classes inheriting from `BaseModel`, extract fields with types and defaults
- **TypeScript**: find exported interfaces/types used in request/response
- **Go**: find structs with json tags

### Step 4: Generate API Reference

Write to `docs/api-reference.md` (or user-specified location):

```markdown
# API Reference

> Auto-generated from source code. Last updated: YYYY-MM-DD

## Products

### GET /api/v1/products

List all products with optional filtering.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| category | string | No | - | Filter by category |
| limit | int | No | 50 | Max results to return |
| offset | int | No | 0 | Pagination offset |

**Response:** `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "name": "Widget",
      "price": 29.99,
      "category": "electronics"
    }
  ],
  "total": 142
}
```

**Example:**

```bash
curl -X GET "http://localhost:8000/api/v1/products?category=electronics&limit=10"
```
```

### Step 5: Validate Against OpenAPI Spec (if exists)

If an OpenAPI/Swagger spec file exists (`openapi.json`, `openapi.yaml`, `swagger.json`):

1. Compare extracted endpoints against the spec
2. Flag discrepancies:
   - Endpoints in code but not in spec
   - Endpoints in spec but not in code
   - Parameter mismatches
3. Append a validation section to the generated docs

### Important

- Group endpoints by resource/router (e.g., Products, Orders, Users)
- Sort within groups: GET (list), GET (detail), POST, PUT/PATCH, DELETE
- Include realistic example values in curl commands (not just `<string>`)
- For auth-protected endpoints, show the auth header in examples
- If the API has versioning (e.g., `/api/v1/`), note it prominently
- Generate the base URL from any config found, or default to `http://localhost:8000`
