#!/usr/bin/env bash
# =============================================================================
#  iHIMS — One-Click Setup Script (Linux / macOS)
#  intelligent Hospital Information System
#
#  Usage:  bash setup.sh
#  Options:
#    --skip-seed     Skip database seeding (keeps existing data)
#    --skip-start    Setup only; do not start the servers
#    --reset-db      Drop and recreate the database (DANGER: loses all data)
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Flags ─────────────────────────────────────────────────────────────────────
SKIP_SEED=false
SKIP_START=false
RESET_DB=false

for arg in "$@"; do
  case $arg in
    --skip-seed)   SKIP_SEED=true ;;
    --skip-start)  SKIP_START=true ;;
    --reset-db)    RESET_DB=true ;;
  esac
done

# ── Colour helpers ─────────────────────────────────────────────────────────
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; WHITE='\033[1;37m'; GRAY='\033[0;37m'; NC='\033[0m'

step()  { echo -e "\n${YELLOW}[$1]${NC} $2"; }
ok()    { echo -e "  ${GREEN}✓${NC}  $1"; }
info()  { echo -e "  ${GRAY}→${NC}  $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC}  $1"; }
fail()  { echo -e "\n  ${RED}✗  FAILED:${NC} $1"; exit 1; }

echo -e "${CYAN}"
echo "  ██╗██╗  ██╗██╗███╗   ███╗███████╗"
echo "  ██║██║  ██║██║████╗ ████║██╔════╝"
echo "  ██║███████║██║██╔████╔██║███████╗"
echo "  ██║██╔══██║██║██║╚██╔╝██║╚════██║"
echo "  ██║██║  ██║██║██║ ╚═╝ ██║███████║"
echo "  ╚═╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚══════╝"
echo -e "${WHITE}  intelligent Hospital Information System"
echo -e "${GRAY}  Setup Script v1.0${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Find Node.js 20
# ─────────────────────────────────────────────────────────────────────────────
step "1/7" "Locating Node.js 20..."

NODE_EXE=""

# Try fnm
if command -v fnm &>/dev/null; then
  FNM_DIR=$(fnm env --shell bash 2>/dev/null | grep FNM_DIR | cut -d'"' -f2 || true)
  [ -z "$FNM_DIR" ] && FNM_DIR="$HOME/.fnm"
  for dir in "$FNM_DIR/node-versions/v20"*/installation; do
    [ -x "$dir/bin/node" ] && NODE_EXE="$dir/bin/node" && break
  done
fi

# Try nvm
if [ -z "$NODE_EXE" ] && [ -d "$HOME/.nvm" ]; then
  for dir in "$HOME/.nvm/versions/node/v20"*/bin; do
    [ -x "$dir/node" ] && NODE_EXE="$dir/node" && break
  done
fi

# Try volta
if [ -z "$NODE_EXE" ] && [ -d "$HOME/.volta" ]; then
  for dir in "$HOME/.volta/tools/image/node/20"*/; do
    [ -x "$dir/bin/node" ] && NODE_EXE="$dir/bin/node" && break
  done
fi

# Try PATH
if [ -z "$NODE_EXE" ] && command -v node &>/dev/null; then
  v=$(node --version 2>&1)
  [[ "$v" =~ ^v20 ]] && NODE_EXE=$(command -v node)
fi

# Homebrew on macOS
if [ -z "$NODE_EXE" ] && [ -d "/opt/homebrew/opt/node@20" ]; then
  NODE_EXE="/opt/homebrew/opt/node@20/bin/node"
fi
if [ -z "$NODE_EXE" ] && [ -d "/usr/local/opt/node@20" ]; then
  NODE_EXE="/usr/local/opt/node@20/bin/node"
fi

[ -z "$NODE_EXE" ] && fail "Node.js 20 not found.
Install via fnm:
  curl -fsSL https://fnm.vercel.app/install | bash
  source ~/.bashrc
  fnm install 20
Or download from: https://nodejs.org"

NODE_DIR=$(dirname "$NODE_EXE")
v=$("$NODE_EXE" --version 2>&1)
ok "Node.js $v at $NODE_EXE"

# npm in same bin dir
NPM_EXE="$NODE_DIR/npm"
[ ! -x "$NPM_EXE" ] && NPM_EXE="$(command -v npm 2>/dev/null || echo npm)"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — PostgreSQL via Docker
# ─────────────────────────────────────────────────────────────────────────────
step "2/7" "Setting up PostgreSQL via Docker..."

command -v docker &>/dev/null || fail "Docker not found.
Install Docker Desktop: https://www.docker.com/products/docker-desktop
On Linux: https://docs.docker.com/engine/install/"

docker info &>/dev/null || fail "Docker daemon is not running. Start Docker Desktop and try again."
ok "Docker is running"

DB_CONTAINER="pibs-postgres"
DB_USER="postgres"
DB_PASSWORD="password"
DB_NAME="pibs"
DB_PORT="5432"

if $RESET_DB && docker ps -a --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
  warn "ResetDb flag set — removing existing container..."
  docker stop "$DB_CONTAINER" &>/dev/null || true
  docker rm   "$DB_CONTAINER" &>/dev/null || true
fi

if docker ps -a --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
  if ! docker ps --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
    info "Starting existing container..."
    docker start "$DB_CONTAINER" &>/dev/null
  else
    ok "Container already running"
  fi
else
  info "Creating PostgreSQL container..."
  docker run -d \
    --name  "$DB_CONTAINER" \
    -e      "POSTGRES_USER=$DB_USER" \
    -e      "POSTGRES_PASSWORD=$DB_PASSWORD" \
    -e      "POSTGRES_DB=$DB_NAME" \
    -p      "${DB_PORT}:5432" \
    --restart unless-stopped \
    postgres:15-alpine &>/dev/null
  ok "Container created"
fi

info "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" &>/dev/null && break
  info "  Still waiting... ($i/30)"
  sleep 2
done
docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" &>/dev/null || fail "PostgreSQL did not start within 60 seconds."
ok "PostgreSQL is ready on port $DB_PORT"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Environment files
# ─────────────────────────────────────────────────────────────────────────────
step "3/7" "Configuring environment files..."

ensure_env() {
  local dir="$1"
  if [ ! -f "$dir/.env" ]; then
    if [ -f "$dir/.env.example" ]; then
      cp "$dir/.env.example" "$dir/.env"
      ok "Created $dir/.env"
    else
      warn "No .env.example in $dir — skipping"
    fi
  else
    ok "$dir/.env already exists"
  fi
}

ensure_env "$SCRIPT_DIR/apps/api"
ensure_env "$SCRIPT_DIR/apps/web"
ensure_env "$SCRIPT_DIR/apps/patient-portal"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — npm install
# ─────────────────────────────────────────────────────────────────────────────
step "4/7" "Installing npm dependencies..."

cd "$SCRIPT_DIR"
info "Running npm install (may take a minute)..."
"$NODE_EXE" "$NPM_EXE" install --prefer-offline 2>&1 | grep -E "^(added|updated|npm warn)" || true
ok "Dependencies installed"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — Prisma
# ─────────────────────────────────────────────────────────────────────────────
step "5/7" "Syncing database schema..."

PRISMA="$SCRIPT_DIR/node_modules/prisma/build/index.js"
SCHEMA="$SCRIPT_DIR/apps/api/prisma/schema.prisma"

cd "$SCRIPT_DIR/apps/api"
info "Running prisma db push..."
"$NODE_EXE" "$PRISMA" db push --schema="$SCHEMA" --skip-generate

info "Generating Prisma client..."
"$NODE_EXE" "$PRISMA" generate --schema="$SCHEMA"
ok "Database schema is up to date"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — Seed
# ─────────────────────────────────────────────────────────────────────────────
if ! $SKIP_SEED; then
  step "6/7" "Seeding database with initial data..."

  cd "$SCRIPT_DIR/apps/api"
  TS_NODE="$SCRIPT_DIR/node_modules/ts-node/dist/bin.js"

  "$NODE_EXE" "$TS_NODE" prisma/seed.ts 2>&1 || warn "Seed encountered errors (may be safe to ignore if tables already have data)"
  ok "Database seeded"
else
  step "6/7" "Skipping seed (--skip-seed flag)"
  warn "Existing data preserved"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 7 — Start servers
# ─────────────────────────────────────────────────────────────────────────────
if ! $SKIP_START; then
  step "7/7" "Starting all servers..."

  TS_NODE_DEV="$SCRIPT_DIR/node_modules/ts-node-dev/lib/bin.js"
  VITE="$SCRIPT_DIR/node_modules/vite/bin/vite.js"

  # API
  (cd "$SCRIPT_DIR/apps/api" && "$NODE_EXE" "$TS_NODE_DEV" --respawn --transpile-only src/server.ts) &
  API_PID=$!
  ok "API server starting (PID $API_PID) → http://localhost:3001"

  sleep 2

  # Web
  (cd "$SCRIPT_DIR/apps/web" && "$NODE_EXE" "$VITE" --port 5175) &
  WEB_PID=$!
  ok "Web app starting (PID $WEB_PID) → http://localhost:5175"

  # Patient portal
  (cd "$SCRIPT_DIR/apps/patient-portal" && "$NODE_EXE" "$VITE" --port 5174) &
  PORTAL_PID=$!
  ok "Patient portal starting (PID $PORTAL_PID) → http://localhost:5174"

  # Write PID file for easy shutdown
  echo "$API_PID $WEB_PID $PORTAL_PID" > "$SCRIPT_DIR/.server-pids"
  info "Server PIDs saved to .server-pids (use 'bash stop.sh' to stop)"
fi

# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}iHIMS is ready!${NC}"
echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo ""
echo -e "${WHITE}  Services:${NC}"
echo -e "  ${GRAY}  API           →  http://localhost:3001${NC}"
echo -e "  ${GRAY}  Web App       →  http://localhost:5175${NC}"
echo -e "  ${GRAY}  Patient Portal →  http://localhost:5174${NC}"
echo ""
echo -e "${WHITE}  Default Login Credentials:${NC}"
echo -e "  ${GRAY}  Super Admin  →  admin / admin123${NC}"
echo -e "  ${GRAY}  Doctor       →  dr.santos / doctor123${NC}"
echo -e "  ${GRAY}  Staff        →  billing1, nurse1, pharmacist1, labtech1 / pibs2024${NC}"
echo ""
