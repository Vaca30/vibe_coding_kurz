#!/usr/bin/env bash
# preToolUse hook — block dangerous git/shell operations.
# Reads the tool-use event from stdin and emits a JSON allow/deny decision.
set -euo pipefail

payload=$(cat)

# Pull command text out of the payload — works for shell tool calls
if command -v jq >/dev/null 2>&1; then
  cmd=$(printf '%s' "$payload" | jq -r '
    (.tool_input.command // .args.command // .input.command // "")
  ')
else
  cmd=$(printf '%s' "$payload" | grep -oE '"command"\s*:\s*"[^"]*"' | head -1 | sed -E 's/.*"\s*:\s*"//; s/"$//')
fi

deny() {
  printf '{"decision":"deny","reason":%s}\n' "$(printf '%s' "$1" | sed 's/"/\\"/g; s/.*/"&"/')"
  exit 0
}

case "$cmd" in
  *"rm -rf /"*|*"rm -rf ~"*|*"rm -rf /*"*|*"rm -r -f /"*|*"sudo rm -rf"*)
    deny "Catastrophic rm blocked: $cmd" ;;
  *"git push --force"*|*"git push -f"*)
    deny "Force-push blocked. Use --force-with-lease and confirm." ;;
  *"git reset --hard"*)
    deny "git reset --hard blocked. Stash or branch instead." ;;
  *"git checkout ."*|*"git restore ."*)
    deny "Wholesale checkout blocked — would discard uncommitted work." ;;
  *"git clean -f"*)
    deny "git clean -f blocked — would delete untracked files." ;;
  *"git branch -D"*)
    deny "git branch -D blocked — destructive branch delete." ;;
esac

printf '{"decision":"allow"}\n'
