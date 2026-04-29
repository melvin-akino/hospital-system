#!/usr/bin/env bash
# ============================================================
# iHIMS — Demo Build & Launch Script (Linux / macOS / WSL)
# ============================================================
# Usage:
#   ./build-demo.sh              — full build + seed + start
#   ./build-demo.sh --skip-build — start without rebuilding
#   ./build-demo.sh --skip-seed  — start without seeding
# ============================================================

set -e

SKIP_BUILD=false
SKIP_SEED=false

for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --skip-seed)  SKIP_SEED=true  ;;
  esac
done

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

step()  { echo -e "\n  ${CYAN}>> $1${NC}"; }
ok()    { echo -e "  ${GREEN}[OK] $1${NC}"; }
warn()  { echo -e "  ${YELLOW}[WARN] $1${NC}"; }
err()   { echo -e "  ${RED}[FAIL] $1${NC}"; exit 1; }

START_TIME=$(date +%s)

echo ""
echo -e "${MAGENTA}==========================================${NC}"
echo -e "${MAGENTA}   iHIMS Demo Build${NC}"
echo -e "${MAGENTA}==========================================${NC}"

# ── Prerequisites ─────────────────────────────────────────────────────────────
step "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || err "Docker is not installed."
docker info >/dev/null 2>&1 || err "Docker daemon is not running."
ok "Docker is running"

# ── Stop existing demo containers ─────────────────────────────────────────────
step "Stopping existing demo containers..."
docker compose -f docker-compose.demo.yml down --remove-orphans 2>/dev/null || true
ok "Containers stopped"

# ── Build images ──────────────────────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  step "Building production images (3-8 minutes on first run)..."
  echo "  Building API..."
  docker compose -f docker-compose.demo.yml build --no-cache api
  echo "  Building Staff Portal..."
  docker compose -f docker-compose.demo.yml build --no-cache web
  echo "  Building Patient Portal..."
  docker compose -f docker-compose.demo.yml build --no-cache patient-portal
  ok "All images built"
else
  step "Skipping build (using existing images)"
fi

# ── Start containers ──────────────────────────────────────────────────────────
step "Starting containers..."
docker compose -f docker-compose.demo.yml up -d
ok "Containers started"

# ── Wait for API ──────────────────────────────────────────────────────────────
step "Waiting for API to be ready..."
MAX_WAIT=60
waited=0
while true; do
  sleep 3
  waited=$((waited + 3))
  if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    break
  fi
  if [ "$waited" -ge "$MAX_WAIT" ]; then
    err "API did not start in ${MAX_WAIT}s. Run: docker logs pibs_api_demo"
  fi
  echo "  ... waiting (${waited}/${MAX_WAIT}s)"
done
ok "API is ready"

# ── Seed data ─────────────────────────────────────────────────────────────────
if [ "$SKIP_SEED" = false ]; then
  step "Seeding demo data..."
  docker exec pibs_api_demo sh -c "cd /app/apps/api && node dist/prisma/seed.js 2>&1" \
    && ok "Demo data seeded" \
    || warn "Seed may have partially failed (data might already exist)"
else
  step "Skipping seed"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   iHIMS Demo is LIVE  (${ELAPSED}s)${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "  Staff Portal     ${CYAN}http://localhost:5175${NC}"
echo -e "  Patient Portal   ${CYAN}http://localhost:5174${NC}"
echo -e "  API Docs         ${CYAN}http://localhost:3001/api/docs${NC}"
echo ""
echo -e "${YELLOW}  Login credentials:${NC}"
echo    "    admin / admin123          (Super Admin)"
echo    "    billing1 / pibs2024       (Billing)"
echo    "    bilsup1 / pibs2024        (Billing Supervisor)"
echo    "    dr.santos / doctor123     (Doctor)"
echo    "    nurse1 / pibs2024         (Nurse)"
echo ""
echo    "  Stop:    docker compose -f docker-compose.demo.yml down"
echo    "  Restart: ./build-demo.sh --skip-build"
echo ""
