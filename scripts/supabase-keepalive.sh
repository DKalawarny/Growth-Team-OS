#!/bin/bash
# Keeps the Growth Team OS Supabase project from auto-pausing.
#
# Supabase pauses free-tier projects after 7 consecutive days with no
# activity. This makes one small authenticated read against the database
# so the project always looks active. Run daily via launchd.
#
# Credentials are read from .env.local at runtime, so the anon key never
# leaves this machine and never enters git.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"
LOG="$ROOT/.keepalive.log"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >>"$LOG"; }

if [ ! -f "$ENV_FILE" ]; then
  log "FAIL  .env.local not found at $ENV_FILE"
  exit 1
fi

URL=$(grep '^VITE_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'"' \r')
KEY=$(grep '^VITE_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'"' \r')

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  log "FAIL  missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local"
  exit 1
fi

# A real table read counts as database activity. RLS may return zero rows
# for the anon role — that is fine, the request itself is what matters.
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 30 \
  "$URL/rest/v1/companies?select=id&limit=1" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY")

case "$CODE" in
  200|206|401|403)
    # 2xx = read succeeded. 401/403 = RLS refused us, but the project is
    # awake and served the request, which is all the pause timer cares about.
    log "OK    HTTP $CODE"
    ;;
  000)
    log "DOWN  no response (project paused, deleted, or no network)"
    exit 1
    ;;
  *)
    log "WARN  HTTP $CODE"
    ;;
esac

# Keep the log from growing without bound.
if [ -f "$LOG" ] && [ "$(wc -l <"$LOG")" -gt 400 ]; then
  tail -n 200 "$LOG" >"$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
