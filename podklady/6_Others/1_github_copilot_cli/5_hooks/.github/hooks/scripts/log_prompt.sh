#!/usr/bin/env bash
# userPromptSubmitted hook — log every prompt, redacting common secret shapes
set -euo pipefail

LOG="${HOME}/.copilot/prompts.log"
mkdir -p "$(dirname "$LOG")"

# Read the event payload
payload=$(cat)

# Extract the prompt field (jq if available, otherwise grep)
if command -v jq >/dev/null 2>&1; then
  prompt=$(printf '%s' "$payload" | jq -r '.prompt // .userPrompt // empty')
else
  prompt=$(printf '%s' "$payload" | grep -oE '"(prompt|userPrompt)"\s*:\s*"[^"]*"' | head -1 | sed -E 's/.*"\s*:\s*"//; s/"$//')
fi

# Redact obvious secret shapes
redacted=$(printf '%s' "$prompt" \
  | sed -E 's/(sk-[a-zA-Z0-9_\-]{20,})/[REDACTED-OPENAI]/g' \
  | sed -E 's/(ghp_[a-zA-Z0-9]{30,})/[REDACTED-GITHUB]/g' \
  | sed -E 's/(AKIA[0-9A-Z]{16})/[REDACTED-AWS]/g' \
  | sed -E 's/(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/[REDACTED-JWT]/g')

echo "[$(date -Iseconds)] [${LOG_LEVEL:-INFO}] $redacted" >> "$LOG"

printf '{"decision":"allow"}\n'
