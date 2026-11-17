#!/usr/bin/env bash
# Stop hook: if the repo changed since the preview artifact was last published,
# block the end of the turn once and ask Claude to update the artifact.
input=$(cat)
printf '%s' "$input" | grep -q '"stop_hook_active": *true' && exit 0
root="$(git rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR:-.}")"
cfg="$root/.claude/preview-artifact.json"
[ -f "$cfg" ] || exit 0
url=$(sed -n 's/.*"artifact_url": *"\([^"]*\)".*/\1/p' "$cfg")
synced=$(sed -n 's/.*"synced_fingerprint": *"\([^"]*\)".*/\1/p' "$cfg")
current=$(bash "$root/.claude/hooks/preview-fingerprint.sh")
[ "$current" = "$synced" ] && exit 0
reason="This repo changed but its preview artifact ($url) has not been updated. Follow 'Preview artifact' in CLAUDE.md: update .claude/preview/index.html (screens + change log), publish it to that url (never a new artifact), run bash .claude/hooks/preview-sync.sh, then commit and push .claude/."
printf '{"decision":"block","reason":"%s"}\n' "$reason"
