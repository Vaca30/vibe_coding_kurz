#!/usr/bin/env bash
# Normal development session.
# Allows: read/write/edit, common build & git commands.
# Denies: destructive rm patterns, sudo, force-push, hard-reset, branch -D.

set -euo pipefail

copilot \
  --allow-tool='read' \
  --allow-tool='write' \
  --allow-tool='edit' \
  --allow-tool='shell(ls:*)' \
  --allow-tool='shell(cat:*)' \
  --allow-tool='shell(grep:*)' \
  --allow-tool='shell(rg:*)' \
  --allow-tool='shell(find:*)' \
  --allow-tool='shell(npm:*)' \
  --allow-tool='shell(uv:*)' \
  --allow-tool='shell(python:*)' \
  --allow-tool='shell(python3:*)' \
  --allow-tool='shell(pytest:*)' \
  --allow-tool='shell(git status)' \
  --allow-tool='shell(git diff:*)' \
  --allow-tool='shell(git log:*)' \
  --allow-tool='shell(git add:*)' \
  --allow-tool='shell(git commit:*)' \
  --allow-tool='shell(git checkout -b:*)' \
  --allow-tool='shell(git switch:*)' \
  --deny-tool='shell(rm -rf /:*)' \
  --deny-tool='shell(rm -rf ~:*)' \
  --deny-tool='shell(rm -rf /*)' \
  --deny-tool='shell(sudo:*)' \
  --deny-tool='shell(git push --force:*)' \
  --deny-tool='shell(git push -f:*)' \
  --deny-tool='shell(git reset --hard:*)' \
  --deny-tool='shell(git branch -D:*)' \
  --deny-tool='shell(git clean -f:*)'
