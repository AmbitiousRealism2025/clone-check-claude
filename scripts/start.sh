#!/usr/bin/env bash
#
# F1.5 — ONE documented start command for black-box testing (VC-QA-01).
#
# Starts the Clone Check web app (Vite dev server) and writes its output to a
# known on-disk log path with secrets REDACTED. The log path is gitignored
# (HC-12), so a fresh-context validator can stand the app up and read the logs
# without tribal knowledge.
#
#   Usage:     npm start            (or: bash scripts/start.sh)
#   App URL:   http://localhost:3000   (override with PORT=NNNN npm start)
#   Log path:  logs/app.log         (secrets redacted, excluded from VCS)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/logs"
LOG_FILE="$LOG_DIR/app.log"
PORT="${PORT:-3000}"

mkdir -p "$LOG_DIR"

echo "Clone Check — starting dev server on http://localhost:${PORT}"
echo "Logs (secrets redacted) -> ${LOG_FILE}"

# Pipe ALL server output (stdout+stderr) through the redactor, then tee to the
# log file so it appears both in the terminal and on disk — never with a raw
# token. `tee` keeps the live terminal stream; the redactor masks credentials.
npm run dev -- --port "${PORT}" 2>&1 \
  | node "$ROOT/scripts/redact.mjs" \
  | tee "$LOG_FILE"
