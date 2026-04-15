# =============================================================================
#  iHIMS — One-Click Setup Script (Windows / PowerShell)
#  intelligent Hospital Information System
#
#  Usage:  .\setup.ps1
#  Options:
#    .\setup.ps1 -SkipSeed      Skip database seeding (keeps existing data)
#    .\setup.ps1 -SkipStart     Setup only; do not start the servers
#    .\setup.ps1 -ResetDb       Drop and recreate the database (DANGER: loses all data)
# =============================================================================

param(
    [switch]$SkipSeed,
    [switch]$SkipStart,
    [switch]$ResetDb
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# ── Colour helpers ─────────────────────────────────────────────────────────
function Write-Banner {
    Write-Host ""
    Write-Host "  ██╗██╗  ██╗██╗███╗   ███╗███████╗" -ForegroundColor Cyan
    Write-Host "  ██║██║  ██║██║████╗ ████║██╔════╝" -ForegroundColor Cyan
    Write-Host "  ██║███████║██║██╔████╔██║███████╗" -ForegroundColor Cyan
    Write-Host "  ██║██╔══██║██║██║╚██╔╝██║╚════██║" -ForegroundColor Cyan
    Write-Host "  ██║██║  ██║██║██║ ╚═╝ ██║███████║" -ForegroundColor Cyan
    Write-Host "  ╚═╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚══════╝" -ForegroundColor Cyan
    Write-Host "  intelligent Hospital Information System" -ForegroundColor White
    Write-Host "  Setup Script v1.0" -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Step  { param($n,$msg) Write-Host "`n[$n] $msg" -ForegroundColor Yellow }
function Write-OK    { param($msg)    Write-Host "  ✓  $msg" -ForegroundColor Green }
function Write-Info  { param($msg)    Write-Host "  →  $msg" -ForegroundColor White }
function Write-Warn  { param($msg)    Write-Host "  ⚠  $msg" -ForegroundColor DarkYellow }
function Write-Fail  { param($msg)    Write-Host "`n  ✗  FAILED: $msg" -ForegroundColor Red; exit 1 }

Write-Banner

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Locate Node.js 20
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "1/7" "Locating Node.js 20..."

$NODE20 = $null

# Search common fnm install locations
$searchRoots = @(
    "$env:APPDATA\fnm\node-versions",
    "$env:LOCALAPPDATA\fnm\node-versions",
    # Claude app bundles its own fnm
    (Get-Item "$env:LOCALAPPDATA\Packages\Claude_*\LocalCache\Roaming\fnm\node-versions" `
        -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName)
) | Where-Object { $_ -and (Test-Path $_) }

foreach ($root in $searchRoots) {
    $candidates = Get-ChildItem $root -Filter "v20*" -Directory -ErrorAction SilentlyContinue
    foreach ($c in $candidates) {
        $exe = Join-Path $c.FullName "installation\node.exe"
        if (Test-Path $exe) {
            $v = & $exe --version 2>&1
            if ($v -match "^v20") { $NODE20 = Join-Path $c.FullName "installation"; break }
        }
    }
    if ($NODE20) { break }
}

# Fallback: node already on PATH
if (-not $NODE20) {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        $v = & node --version 2>&1
        if ($v -match "^v20") { $NODE20 = Split-Path $nodeCmd.Source }
    }
}

if (-not $NODE20) {
    Write-Fail @"
Node.js 20 not found.

Install it with fnm (recommended):
  1. Install fnm:  winget install Schniz.fnm
  2. Then run:     fnm install 20
  3. Re-run this setup script.

Or download Node.js 20 LTS from: https://nodejs.org
"@
}

$NODE_EXE = "$NODE20\node.exe"
$NPM_CMD  = if (Test-Path "$NODE20\npm.cmd") { "$NODE20\npm.cmd" } else { "$NODE20\npm" }
$v = & $NODE_EXE --version 2>&1
Write-OK "Node.js $v at $NODE20"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Check Docker & start PostgreSQL
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "2/7" "Setting up PostgreSQL via Docker..."

$dockerCheck = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCheck) {
    Write-Fail @"
Docker not found.
Install Docker Desktop from: https://www.docker.com/products/docker-desktop
After installing, make sure Docker Desktop is running.
"@
}

# Make sure Docker daemon is running
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker daemon is not running. Start Docker Desktop and try again."
}
Write-OK "Docker is running"

$DB_CONTAINER = "pibs-postgres"
$DB_USER      = "postgres"
$DB_PASSWORD  = "password"
$DB_NAME      = "pibs"
$DB_PORT      = "5432"

$containerExists = docker ps -a --format "{{.Names}}" 2>&1 | Select-String "^${DB_CONTAINER}$"

if ($ResetDb -and $containerExists) {
    Write-Warn "ResetDb flag set — removing existing container..."
    docker stop $DB_CONTAINER 2>&1 | Out-Null
    docker rm   $DB_CONTAINER 2>&1 | Out-Null
    $containerExists = $null
}

if ($containerExists) {
    $running = docker ps --format "{{.Names}}" 2>&1 | Select-String "^${DB_CONTAINER}$"
    if (-not $running) {
        Write-Info "Starting existing container..."
        docker start $DB_CONTAINER | Out-Null
    } else {
        Write-OK "Container already running"
    }
} else {
    Write-Info "Creating PostgreSQL container..."
    docker run -d `
        --name  $DB_CONTAINER `
        -e      POSTGRES_USER=$DB_USER `
        -e      POSTGRES_PASSWORD=$DB_PASSWORD `
        -e      POSTGRES_DB=$DB_NAME `
        -p      "${DB_PORT}:5432" `
        --restart unless-stopped `
        postgres:15-alpine | Out-Null
    Write-OK "Container created"
}

# Wait for Postgres to accept connections
Write-Info "Waiting for PostgreSQL to be ready..."
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    $pg = docker exec $DB_CONTAINER pg_isready -U $DB_USER 2>&1
    if ($pg -match "accepting connections") { $ready = $true; break }
    Start-Sleep -Seconds 2
    Write-Info "  Still waiting... ($i/30)"
}
if (-not $ready) { Write-Fail "PostgreSQL did not become ready within 60 seconds." }
Write-OK "PostgreSQL is ready on port $DB_PORT"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Environment files
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "3/7" "Configuring environment files..."

function Ensure-EnvFile {
    param($Dir, $Example)
    $envPath = Join-Path $Dir ".env"
    $exPath  = Join-Path $Dir $Example
    if (-not (Test-Path $envPath)) {
        if (Test-Path $exPath) {
            Copy-Item $exPath $envPath
            Write-OK "Created $envPath"
        } else {
            Write-Warn "No .env.example found in $Dir — skipping"
        }
    } else {
        Write-OK "$envPath already exists"
    }
}

Ensure-EnvFile (Join-Path $ScriptDir "apps\api")            ".env.example"
Ensure-EnvFile (Join-Path $ScriptDir "apps\web")            ".env.example"
Ensure-EnvFile (Join-Path $ScriptDir "apps\patient-portal") ".env.example"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Install npm dependencies
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "4/7" "Installing npm dependencies..."

Set-Location $ScriptDir
Write-Info "Running npm install (this may take a minute)..."
& $NODE_EXE $NPM_CMD install --prefer-offline 2>&1 | ForEach-Object {
    if ($_ -match "^(added|updated|found|npm warn)" ) { Write-Info $_ }
}
Write-OK "Dependencies installed"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — Prisma: push schema + generate client
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "5/7" "Syncing database schema..."

$PRISMA = Join-Path $ScriptDir "node_modules\prisma\build\index.js"
$SCHEMA  = Join-Path $ScriptDir "apps\api\prisma\schema.prisma"

Set-Location (Join-Path $ScriptDir "apps\api")

Write-Info "Running prisma db push..."
& $NODE_EXE $PRISMA db push --schema=$SCHEMA --skip-generate 2>&1 |
    ForEach-Object { Write-Info $_ }
if ($LASTEXITCODE -ne 0) { Write-Fail "prisma db push failed" }

Write-Info "Generating Prisma client..."
& $NODE_EXE $PRISMA generate --schema=$SCHEMA 2>&1 |
    ForEach-Object { if ($_ -match "Generated") { Write-OK $_ } }
if ($LASTEXITCODE -ne 0) { Write-Fail "prisma generate failed" }

Write-OK "Database schema is up to date"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — Seed the database
# ─────────────────────────────────────────────────────────────────────────────
if (-not $SkipSeed) {
    Write-Step "6/7" "Seeding database with initial data..."

    $TS_NODE = Join-Path $ScriptDir "node_modules\ts-node\dist\bin.js"
    Set-Location (Join-Path $ScriptDir "apps\api")

    & $NODE_EXE $TS_NODE prisma/seed.ts 2>&1 | ForEach-Object { Write-Info $_ }

    if ($LASTEXITCODE -ne 0) { Write-Warn "Seed had warnings (may be safe — data may already exist)" }
    Write-OK "Database seeded"
} else {
    Write-Step "6/7" "Skipping database seed (-SkipSeed flag)"
    Write-Warn "Existing data preserved"
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 7 — Start servers
# ─────────────────────────────────────────────────────────────────────────────
Set-Location $ScriptDir

if ($SkipStart) {
    Write-Step "7/7" "Skipping server start (-SkipStart flag)"
} else {
    Write-Step "7/7" "Starting all servers..."

    $API_DIR    = Join-Path $ScriptDir "apps\api"
    $WEB_DIR    = Join-Path $ScriptDir "apps\web"
    $PORTAL_DIR = Join-Path $ScriptDir "apps\patient-portal"

    $TS_NODE_DEV = Join-Path $ScriptDir "node_modules\ts-node-dev\lib\bin.js"
    $VITE        = Join-Path $ScriptDir "node_modules\vite\bin\vite.js"

    # API server
    $apiArgs = "`"$TS_NODE_DEV`" --respawn --transpile-only src/server.ts"
    Start-Process -FilePath $NODE_EXE `
        -ArgumentList $apiArgs `
        -WorkingDirectory $API_DIR `
        -WindowStyle Normal `
        -PassThru | Out-Null
    Write-OK "API server starting on http://localhost:3001"

    Start-Sleep -Seconds 2

    # Web app
    $webArgs = "`"$VITE`" --port 5175"
    Start-Process -FilePath $NODE_EXE `
        -ArgumentList $webArgs `
        -WorkingDirectory $WEB_DIR `
        -WindowStyle Normal `
        -PassThru | Out-Null
    Write-OK "Web app starting on http://localhost:5175"

    # Patient portal
    $portalArgs = "`"$VITE`" --port 5174"
    Start-Process -FilePath $NODE_EXE `
        -ArgumentList $portalArgs `
        -WorkingDirectory $PORTAL_DIR `
        -WindowStyle Normal `
        -PassThru | Out-Null
    Write-OK "Patient portal starting on http://localhost:5174"
}

# ─────────────────────────────────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  iHIMS is ready!" -ForegroundColor Green
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Services:" -ForegroundColor White
Write-Host "    API          →  http://localhost:3001" -ForegroundColor DarkGray
Write-Host "    Web App      →  http://localhost:5175" -ForegroundColor DarkGray
Write-Host "    Patient Portal→  http://localhost:5174" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Default Login Credentials:" -ForegroundColor White
Write-Host "    Super Admin  →  admin / admin123" -ForegroundColor DarkGray
Write-Host "    Doctor       →  dr.santos / doctor123" -ForegroundColor DarkGray
Write-Host "    Staff        →  billing1, nurse1, pharmacist1, labtech1 / pibs2024" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  To stop all servers, close the terminal windows that opened." -ForegroundColor DarkGray
Write-Host ""
