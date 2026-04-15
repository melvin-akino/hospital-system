#!/usr/bin/env bash
# Stop all iHIMS servers started by setup.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.server-pids"

if [ -f "$PID_FILE" ]; then
  read -r PIDS < "$PID_FILE"
  for pid in $PIDS; do
    kill "$pid" 2>/dev/null && echo "Stopped PID $pid" || echo "PID $pid already stopped"
  done
  rm -f "$PID_FILE"
  echo "All iHIMS servers stopped."
else
  echo "No .server-pids file found. Killing all node processes matching iHIMS..."
  pkill -f "ts-node-dev.*server.ts" 2>/dev/null || true
  pkill -f "vite.*517[45]" 2>/dev/null || true
  echo "Done."
fi
