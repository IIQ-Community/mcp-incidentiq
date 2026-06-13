#!/bin/bash
# Devcontainer post-start bootstrap - restores container-local state that does
# not survive rebuilds. Idempotent: every step no-ops when already satisfied.
# Logs: /tmp/post-start.log
# See docs/plans/2026-06-12-pilot-shell-drift-remediation.md (Task 1 + rebuild survival).

LOG=/tmp/post-start.log
exec >>"$LOG" 2>&1
echo "=== post-start $(date -Is) ==="

# 1. Codex CLI ChatGPT auth - persist ONLY auth.json via host-mounted ~/.pilot.
#    (Mounting all of ~/.codex breaks Codex; Pilot manages that directory.)
#    On start: refresh the backup from a live login, else restore from backup.
CODEX_AUTH="$HOME/.codex/auth.json"
CODEX_BACKUP="$HOME/.pilot/codex-auth-backup.json"
if [ -f "$CODEX_AUTH" ]; then
    cp "$CODEX_AUTH" "$CODEX_BACKUP" && chmod 600 "$CODEX_BACKUP"
    echo "codex: backup refreshed from live auth"
elif [ -f "$CODEX_BACKUP" ]; then
    mkdir -p "$HOME/.codex"
    cp "$CODEX_BACKUP" "$CODEX_AUTH" && chmod 600 "$CODEX_AUTH"
    echo "codex: auth restored from backup"
else
    echo "codex: no auth and no backup - run 'codex login' once"
fi

echo "=== post-start sync steps done ==="
