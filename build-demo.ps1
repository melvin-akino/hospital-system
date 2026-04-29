# ============================================================
# iHIMS — Demo Build & Launch Script (Windows PowerShell)
# ============================================================
# Usage:
#   .\build-demo.ps1              — full build + seed + start
#   .\build-demo.ps1 -SkipBuild  — just start (images already built)
#   .\build-demo.ps1 -SkipSeed   — start without re-seeding
# ============================================================

param (
    [switch]$SkipBuild = $false,
    [switch]$SkipSeed  = $false
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

function Write-Step($msg) {
    Write-Host ""
    Write-Host "  >> $msg" -ForegroundColor Cyan
}

function Write-OK($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Write-Err($msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "   iHIMS Demo Build"                       -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta

# ── Prerequisite checks ───────────────────────────────────────────────────────
Write-Step "Checking prerequisites..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Err "Docker is not installed or not in PATH."
}

$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Err "Docker daemon is not running. Start Docker Desktop first."
}

Write-OK "Docker is running"

# ── Stop any existing demo containers ────────────────────────────────────────
Write-Step "Stopping existing demo containers..."
docker compose -f docker-compose.demo.yml down --remove-orphans 2>&1 | Out-Null
Write-OK "Containers stopped"

# ── Build images ─────────────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Step "Building production images (this takes 3-8 minutes on first run)..."
    Write-Host "  Building API (TypeScript compile + Prisma)..."
    docker compose -f docker-compose.demo.yml build --no-cache api
    if ($LASTEXITCODE -ne 0) { Write-Err "API build failed" }

    Write-Host "  Building Staff Portal (Vite build + nginx)..."
    docker compose -f docker-compose.demo.yml build --no-cache web
    if ($LASTEXITCODE -ne 0) { Write-Err "Staff portal build failed" }

    Write-Host "  Building Patient Portal (Vite build + nginx)..."
    docker compose -f docker-compose.demo.yml build --no-cache patient-portal
    if ($LASTEXITCODE -ne 0) { Write-Err "Patient portal build failed" }

    Write-OK "All images built successfully"
} else {
    Write-Step "Skipping build (using existing images)"
}

# ── Start containers ─────────────────────────────────────────────────────────
Write-Step "Starting containers..."
docker compose -f docker-compose.demo.yml up -d
if ($LASTEXITCODE -ne 0) { Write-Err "Failed to start containers" }
Write-OK "Containers started"

# ── Wait for API to be healthy ────────────────────────────────────────────────
Write-Step "Waiting for API to be ready..."
$maxWait = 60
$waited  = 0
do {
    Start-Sleep -Seconds 3
    $waited += 3
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($resp.StatusCode -eq 200) { break }
    } catch { }
    if ($waited -ge $maxWait) { Write-Err "API did not start within $maxWait seconds. Check: docker logs pibs_api_demo" }
    Write-Host "  ... waiting ($waited/$maxWait s)" -ForegroundColor DarkGray
} while ($true)
Write-OK "API is ready"

# ── Seed demo data ────────────────────────────────────────────────────────────
if (-not $SkipSeed) {
    Write-Step "Seeding demo data..."
    docker exec pibs_api_demo sh -c "cd /app/apps/api && node dist/prisma/seed.js 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [WARN] Seed may have partially failed (data might already exist)" -ForegroundColor Yellow
    } else {
        Write-OK "Demo data seeded"
    }
} else {
    Write-Step "Skipping seed"
}

# ── Done ──────────────────────────────────────────────────────────────────────
$elapsed = [math]::Round(((Get-Date) - $StartTime).TotalSeconds)

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   iHIMS Demo is LIVE  ($elapsed seconds)"  -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Staff Portal     http://localhost:5175"   -ForegroundColor White
Write-Host "  Patient Portal   http://localhost:5174"   -ForegroundColor White
Write-Host "  API Docs         http://localhost:3001/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Login credentials:"                       -ForegroundColor Yellow
Write-Host "    admin / admin123          (Super Admin)"
Write-Host "    billing1 / pibs2024       (Billing)"
Write-Host "    bilsup1 / pibs2024        (Billing Supervisor)"
Write-Host "    dr.santos / doctor123     (Doctor)"
Write-Host "    nurse1 / pibs2024         (Nurse)"
Write-Host ""
Write-Host "  To stop:   docker compose -f docker-compose.demo.yml down"
Write-Host "  To re-run: .\build-demo.ps1 -SkipBuild"
Write-Host ""
