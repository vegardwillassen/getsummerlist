#!/usr/bin/env bash
# Run after publishing the preview artifact: records that the preview now
# matches the repo, so the Stop hook stops asking for an update.
root="$(git rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR:-.}")"
cfg="$root/.claude/preview-artifact.json"
fp=$(bash "$root/.claude/hooks/preview-fingerprint.sh")
now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
sed -i -e "s/\"synced_fingerprint\": *\"[^\"]*\"/\"synced_fingerprint\": \"$fp\"/" \
       -e "s/\"synced_at\": *\"[^\"]*\"/\"synced_at\": \"$now\"/" "$cfg"
echo "Preview marked as in sync ($fp). Commit .claude/ together with your change."
