#!/usr/bin/env bash
# Daily commit of jolly's REAL work to Metrobumiayu/ai-agent-workflows.
# Runs once a day (cron, 21:00 WIB). Collects files changed TODAY from
# allowlisted work trees, copies them into the local clone under work/,
# writes a daily summary, and pushes ONE commit via the GitHub API
# (bin/commit.py). No commit is made on a day with no real work files —
# the daily summary alone never triggers a commit.
#
# Never collected: secrets (*api-key*, .env*, *secret*, *credential*,
# wallet.txt, *.pem, *.key), binaries (mp4/png/jpg/webp/zip/tar.gz),
# node_modules, venv, .git internals, kit downloads, user uploads,
# memory notes, NEB wallet/mining dirs. Files over 1 MiB are skipped
# again by commit.py.
set -euo pipefail

CLONE="$HOME/workspace/github/ai-agent-workflows"
COMMIT_PY="$HOME/workspace/custom-connectors/custom.github/bin/commit.py"
TODAY="$(date +%F)"
SUMMARY="$CLONE/daily/$TODAY.md"

# 1. Reset the staging clone to origin/main (it is only a staging area).
git -C "$CLONE" fetch --quiet origin
git -C "$CLONE" reset --quiet --hard origin/main
git -C "$CLONE" clean --quiet -fd

# 2. Collect today's real work files (text, <=1 MiB, allowlisted trees).
WORK_TMP="$(mktemp -d)"
FOUND=0
collect() {
  local src="$1" rel="$2"
  [ -d "$src" ] || return 0
  while IFS= read -r -d '' f; do
    case "$f" in
      *"/.git/"*|*"node_modules"*|*"/venv/"*|*"__pycache__"*|*"/kit/"*|*"/kit-"*|*"/.makefun/"*) continue ;;
      *"api-key"*|*".env"*|*"secret"*|*"credential"*|*"wallet.txt"|*.pem|*.key) continue ;;
      *.mp4|*.png|*.jpg|*.jpeg|*.webp|*.zip|*.tar.gz|*.tgz|*.mp3|*.wav) continue ;;
      *leaderboard*|*detail-*.json|*competitions*.json) continue ;;
    esac
    size="$(stat -c%s "$f")"
    [ "$size" -le 1048576 ] || continue
    LC_ALL=C grep -qI . "$f" 2>/dev/null || continue
    dest="$WORK_TMP/$rel/${f#$src/}"
    mkdir -p "$(dirname "$dest")"
    cp "$f" "$dest"
    FOUND=$((FOUND + 1))
  done < <(find "$src" -type f -newermt "$TODAY 00:00" ! -newermt "$TODAY 23:59:59" -print0 2>/dev/null)
}

collect "$HOME/workspace/make-fun" "make-fun"
collect "$HOME/workspace/goals/amnt-mining-via-agent-mining/files" "amnc"
collect "$HOME/workspace/custom-connectors/custom.github" "github-connector"
collect "$HOME/workspace/custom-skills" "custom-skills"

if [ "$FOUND" -eq 0 ]; then
  echo "no real work files changed today ($TODAY) — no commit"
  rm -rf "$WORK_TMP"
  exit 0
fi

# 3. Copy into the clone and write the daily summary.
mkdir -p "$CLONE/work" "$CLONE/daily"
cp -r "$WORK_TMP/"* "$CLONE/work/" 2>/dev/null || true
rm -rf "$WORK_TMP"
{
  echo "# $TODAY"
  echo ""
  echo "Daily work snapshot — $FOUND files changed today."
  echo ""
  git -C "$CLONE" status --porcelain -- work/ | sed 's/^/ - /'
} > "$SUMMARY"

# 4. Push one commit via the GitHub API, then sync the clone to the new HEAD.
python3 "$COMMIT_PY" "$CLONE" "Daily work $TODAY: $FOUND files"
git -C "$CLONE" fetch --quiet origin
git -C "$CLONE" reset --quiet --hard origin/main
