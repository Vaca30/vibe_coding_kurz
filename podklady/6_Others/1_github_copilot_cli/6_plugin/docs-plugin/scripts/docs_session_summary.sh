#!/usr/bin/env bash
# sessionEnd — print a summary of files that ended the session with missing docstrings.
set -euo pipefail

log="${HOME}/.copilot/docs-plugin-session.log"

if [[ ! -s "$log" ]]; then
  printf '{"decision":"allow"}\n'
  exit 0
fi

count=$(wc -l < "$log" | tr -d ' ')
files=$(awk -F: '{print $1}' "$log" | sort -u | tr '\n' ',' | sed 's/,$//')

printf '{"decision":"allow","message":"Session ended with %s files needing docstrings: %s"}\n' "$count" "$files"

# Rotate the log so the next session starts clean
mv "$log" "${log}.$(date +%s)"
