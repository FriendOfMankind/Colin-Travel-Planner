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
echo "## Branch check"
timeout 20 git fetch -q origin main 2>/dev/null || echo "- (couldn't fetch origin/main; the checks below may be stale)"
branch=$(git branch --show-current 2>/dev/null || echo "?")
echo "- This session is on \`$branch\`. Work reaches memory only when merged into main."
if git rev-parse -q --verify origin/main >/dev/null 2>&1; then
  behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
  [ "$behind" != "0" ] && echo "- ⚠️ This checkout is $behind commit(s) behind origin/main. Run \`git pull origin main\` before editing, or you'll work from stale memory."
  # Remote branches with commits whose change isn't in main (git cherry
  # matches by patch, so squash-merged work doesn't show as a false alarm).
  for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -v -e '^origin$' -e '^origin/HEAD$' -e '^origin/main$'); do
    n=$(git cherry origin/main "$b" 2>/dev/null | grep -c '^+' || true)
    [ "$n" != "0" ] && echo "- \`${b#origin/}\` has $n commit(s) not in main: $(git log -1 --format='%cs · %s' "$b")"
  done
fi
echo
echo "## Recent changes in main"
git log -8 --format='- %cs · %s' origin/main 2>/dev/null || git log -8 --format='- %cs · %s' 2>/dev/null || true
exit 0
