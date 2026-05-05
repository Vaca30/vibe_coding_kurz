#!/usr/bin/env bash
# preToolUse — when a source file is about to be written/edited, look for a
# companion doc file in docs/ and remind the agent (without blocking).
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
case "$file" in *.py|*.ts|*.tsx|*.js|*.jsx|*.go) ;; *) printf '{"decision":"allow"}\n'; exit 0 ;; esac

stem=$(basename "$file"); stem=${stem%.*}
docs_dir=""
for candidate in docs doc; do
  if [[ -d "$candidate" ]]; then docs_dir="$candidate"; break; fi
done

if [[ -z "$docs_dir" ]]; then
  printf '{"decision":"allow"}\n'; exit 0
fi

matches=$(find "$docs_dir" -type f \( -name "*${stem}*.md" -o -name "*${stem}*.rst" \) 2>/dev/null | head -3 | tr '\n' ',' | sed 's/,$//')

if [[ -n "$matches" ]]; then
  printf '{"decision":"allow","message":"Companion docs may need updating: %s"}\n' "$matches"
else
  printf '{"decision":"allow"}\n'
fi
