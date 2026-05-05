#!/usr/bin/env bash
# postToolUse — after a write/edit on a Python file, warn if any new public
# function/class lacks a docstring. AST check, no external deps.
set -euo pipefail

payload=$(cat)

if command -v jq >/dev/null 2>&1; then
  tool=$(printf '%s' "$payload" | jq -r '.tool // .tool_name // ""')
  file=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.path // ""')
else
  tool=$(printf '%s' "$payload" | grep -oE '"tool(_name)?"\s*:\s*"[^"]*"' | head -1 | sed -E 's/.*"\s*:\s*"//; s/"$//')
  file=$(printf '%s' "$payload" | grep -oE '"(file_path|path)"\s*:\s*"[^"]*"' | head -1 | sed -E 's/.*"\s*:\s*"//; s/"$//')
fi

case "$tool" in write|edit|Write|Edit) ;; *) printf '{"decision":"allow"}\n'; exit 0 ;; esac
case "$file" in *.py) ;; *) printf '{"decision":"allow"}\n'; exit 0 ;; esac
[[ -f "$file" ]] || { printf '{"decision":"allow"}\n'; exit 0; }

# AST-based check: list public symbols (def/class not starting with _) without a docstring
missing=$(python3 - "$file" <<'PY' 2>/dev/null || true
import ast, sys, json
path = sys.argv[1]
try:
    tree = ast.parse(open(path).read())
except Exception:
    print(""); sys.exit(0)
out = []
for node in ast.walk(tree):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        if node.name.startswith("_"):
            continue
        if not ast.get_docstring(node):
            out.append(f"{node.name} (line {node.lineno})")
print(", ".join(out))
PY
)

if [[ -n "$missing" ]]; then
  printf '{"decision":"allow","message":"Missing docstrings in %s: %s"}\n' "$file" "$missing"

  # Track in session log for the sessionEnd summary
  log="${HOME}/.copilot/docs-plugin-session.log"
  mkdir -p "$(dirname "$log")"
  echo "$file: $missing" >> "$log"
else
  printf '{"decision":"allow"}\n'
fi
