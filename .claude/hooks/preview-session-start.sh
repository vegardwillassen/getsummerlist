#!/usr/bin/env bash
# SessionStart hook: reminds Claude which artifact is this repo's preview.
root="$(git rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR:-.}")"
cfg="$root/.claude/preview-artifact.json"
[ -f "$cfg" ] || exit 0
url=$(sed -n 's/.*"artifact_url": *"\([^"]*\)".*/\1/p' "$cfg")
echo "This repo's ONE preview artifact is $url (source: .claude/preview/index.html). After any change to the repo, update and republish it to that url and add a change-log entry. Never create another artifact for this repo. See 'Preview artifact' in CLAUDE.md."
