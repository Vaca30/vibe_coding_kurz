#!/usr/bin/env bash
# sessionEnd hook — append end marker to audit log
set -euo pipefail

LOG="${HOME}/.copilot/audit.log"
mkdir -p "$(dirname "$LOG")"
echo "[$(date -Iseconds)] session-end cwd=$(pwd)" >> "$LOG"

printf '{"decision":"allow"}\n'
