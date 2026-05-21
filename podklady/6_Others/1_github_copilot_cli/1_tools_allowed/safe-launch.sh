#!/usr/bin/env bash
# Read-only research session.
# Allows: read, grep, glob, ls/cat/head/tail/find shell commands.
# Denies: any write/edit, any rm, any sudo, any git mutating command.

set -euo pipefail

copilot \
  --allow-tool='read' \
  --allow-tool='shell(ls:*)' \
  --allow-tool='shell(cat:*)' \
  --allow-tool='shell(head:*)' \
  --allow-tool='shell(tail:*)' \
  --allow-tool='shell(find:*)' \
  --allow-tool='shell(grep:*)' \
  --allow-tool='shell(rg:*)' \
  --allow-tool='shell(git status)' \
  --allow-tool='shell(git log:*)' \
  --allow-tool='shell(git diff:*)' \
  --deny-tool='write' \
  --deny-tool='edit' \
  --deny-tool='shell(rm:*)' \
  --deny-tool='shell(sudo:*)' \
  --deny-tool='shell(git push:*)' \
  --deny-tool='shell(git reset:*)' \
  --deny-tool='shell(git checkout:*)'
