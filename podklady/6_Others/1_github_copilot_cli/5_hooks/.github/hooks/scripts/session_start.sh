#!/usr/bin/env bash
# sessionStart hook — print banner + append start marker to audit log
set -euo pipefail

LOG="${HOME}/.copilot/audit.log"
mkdir -p "$(dirname "$LOG")"

echo "[$(date -Iseconds)] session-start cwd=$(pwd) user=$(whoami)" >> "$LOG"

# Output a JSON ack — Copilot CLI ignores empty stdout, but valid JSON is best practice
printf '{"decision":"allow","message":"Welcome to Copilot CLI session"}\n'
