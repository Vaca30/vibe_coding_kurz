#!/usr/bin/env bash
# errorOccurred hook — append the error event to a log for later inspection.
set -euo pipefail

LOG="${HOME}/.copilot/errors.log"
mkdir -p "$(dirname "$LOG")"

payload=$(cat)
echo "[$(date -Iseconds)] $payload" >> "$LOG"

printf '{"decision":"allow"}\n'
