#!/usr/bin/env bash
# Prints a fingerprint of the repo's content (tracked + untracked, not ignored),
# leaving out .claude/ and CLAUDE.md. It changes whenever the app changes.
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR:-.}")" || exit 0
list=$(git ls-files -co --exclude-standard -- . ':(exclude).claude' ':(exclude)CLAUDE.md' 2>/dev/null \
  | sort -u | while IFS= read -r f; do [ -f "$f" ] && printf '%s\n' "$f"; done)
{ printf '%s\n' "$list"; [ -n "$list" ] && printf '%s\n' "$list" | git hash-object --stdin-paths; } | sha1sum | cut -c1-40
