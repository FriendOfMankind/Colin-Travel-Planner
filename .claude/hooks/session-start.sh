#!/bin/bash
# Session start: make the tools runnable, then brief the session.
# Whatever this prints to stdout lands in the new session's context, which is
# how a fresh session knows what's going on without Colin re-explaining it.
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Build-time deps (yaml, marked). Cloud containers start without them.
if [ ! -d node_modules/yaml ] || [ ! -d node_modules/marked ]; then
  npm install --silent --no-audit --no-fund >/dev/null 2>&1 || echo "⚠️ npm install failed: run it before tests or the briefing."
fi

node tools/now.mjs 2>/dev/null || echo "⚠️ tools/now.mjs failed: run it by hand to see why."
echo
echo "## Recent changes on this branch"
git log -8 --format='- %cs · %s' 2>/dev/null || true
open=$(git branch -r 2>/dev/null | grep -v -e HEAD -e 'origin/main$' | wc -l | tr -d ' ')
[ "$open" != "0" ] && echo "- $open other remote branch(es) exist; unmerged work on them is invisible here."
exit 0
