#!/usr/bin/env bash
# postToolUse hook — auto-format any .py file just edited with ruff (or black fallback).
set -euo pipefail

payload=$(cat)

if command -v jq >/dev/null 2>&1; then
  file=$(printf '%s' "$payload" | jq -r '
    (.tool_input.file_path // .tool_input.path // .args.path // "")
  ')
  tool=$(printf '%s' "$payload" | jq -r '.tool // .tool_name // ""')
else
  file=$(printf '%s' "$payload" | grep -oE '"(file_path|path)"\s*:\s*"[^"]*"' | head -1 | sed -E 's/.*"\s*:\s*"//; s/"$//')
  tool=$(printf '%s' "$payload" | grep -oE '"tool(_name)?"\s*:\s*"[^"]*"' | head -1 | sed -E 's/.*"\s*:\s*"//; s/"$//')
fi

# Only run for write/edit tools on .py files
case "$tool" in
  write|edit|Write|Edit) ;;
  *) printf '{"decision":"allow"}\n'; exit 0 ;;
esac

case "$file" in
  *.py) ;;
  *) printf '{"decision":"allow"}\n'; exit 0 ;;
esac

if [[ ! -f "$file" ]]; then
  printf '{"decision":"allow"}\n'
  exit 0
fi

if command -v ruff >/dev/null 2>&1; then
  ruff format "$file" >/dev/null 2>&1 || true
  msg="ruff formatted $file"
elif command -v black >/dev/null 2>&1; then
  black -q "$file" || true
  msg="black formatted $file"
else
  msg="no Python formatter installed; skipping"
fi

printf '{"decision":"allow","message":%s}\n' "$(printf '"%s"' "$msg")"
