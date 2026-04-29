<#
.SYNOPSIS
  Build the self-contained API sidecar binary using Docker (Node 20).
.EXAMPLE
  .\scripts\build-sidecar-docker.ps1
#>

# Continue on non-terminating errors; we check $LASTEXITCODE manually
$ErrorActionPreference = "Continue"

$ROOT        = Resolve-Path "$PSScriptRoot\..\..\..\"
$API_DIR     = Join-Path $ROOT "apps\api"
$BINARIES    = Join-Path $PSScriptRoot "..\src-tauri\binaries"
$TARGET      = "x86_64-pc-windows-msvc"
$BINARY_NAME = "api-server-$TARGET.exe"

function Run-Docker {
    param([string]$Desc, [string[]]$Args)
    Write-Host "  >> $Desc" -ForegroundColor DarkGray
    $result = & docker @Args
    $result | ForEach-Object { Write-Host "     $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [WARN] Exit code $LASTEXITCODE for: $Desc" -ForegroundColor DarkYellow
    }
}

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host " iHIMS API Sidecar Build (Docker)"      -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path $BINARIES | Out-Null

$container = & docker ps --filter "name=pibs_api_demo" --format "{{.Names}}"
if (-not $container) {
    Write-Error "Container 'pibs_api_demo' is not running."
    exit 1
}
Write-Host "[OK] Container: $container"

# ── Step 1: Dependencies ──────────────────────────────────────────────────────
Write-Host "`n[1/4] Installing dependencies..." -ForegroundColor Yellow

Run-Docker "npm install embedded-postgres pg" @("exec","-w","/app/apps/api","pibs_api_demo","npm","install","--save","embedded-postgres","pg","--legacy-peer-deps")
Run-Docker "npm install @types/pg"            @("exec","-w","/app/apps/api","pibs_api_demo","npm","install","--save-dev","@types/pg","--legacy-peer-deps")
Run-Docker "force-install windows pg binary"  @("exec","-w","/app/apps/api","pibs_api_demo","npm","install","--force","--save","@embedded-postgres/windows-x64","--legacy-peer-deps")

# Install global tools (ncc and pkg)
Write-Host "  Installing @vercel/ncc globally..." -ForegroundColor DarkGray
& docker exec pibs_api_demo sh -c "which ncc > /dev/null 2>&1 && echo 'ncc already installed' || npm install -g @vercel/ncc --quiet" | Write-Host
Write-Host "  Installing pkg globally..." -ForegroundColor DarkGray
& docker exec pibs_api_demo sh -c "which pkg > /dev/null 2>&1 && echo 'pkg already installed' || npm install -g pkg --quiet" | Write-Host

# ── Step 2: Copy source files ─────────────────────────────────────────────────
Write-Host "`n[2/4] Syncing source files..." -ForegroundColor Yellow

& docker cp "$API_DIR\src\db\embedded.ts" "pibs_api_demo:/app/apps/api/src/db/embedded.ts"
& docker cp "$API_DIR\src\db\schema.sql"  "pibs_api_demo:/app/apps/api/src/db/schema.sql"
& docker cp "$API_DIR\src\desktop.ts"     "pibs_api_demo:/app/apps/api/src/desktop.ts"
& docker cp "$API_DIR\package.json"       "pibs_api_demo:/app/apps/api/package.json"
Write-Host "  [OK] Files copied"

# ── Step 3: TypeScript compile + ncc bundle ───────────────────────────────────
Write-Host "`n[3/4] Compiling TypeScript and bundling..." -ForegroundColor Yellow

& docker exec -w /app/apps/api pibs_api_demo sh -c "npx tsc -p tsconfig.build.json --skipLibCheck 2>&1 | tail -5; echo '[OK] tsc done'"
& docker exec -w /app/apps/api pibs_api_demo sh -c "mkdir -p dist/db && cp src/db/schema.sql dist/db/schema.sql && echo '[OK] schema.sql staged'"
& docker exec -w /app/apps/api pibs_api_demo sh -c "npx ncc build dist/desktop.js -o dist-bundle --no-source-map-register 2>&1 | tail -10; echo '[OK] ncc done'"
& docker exec -w /app/apps/api pibs_api_demo sh -c "cp dist/db/schema.sql dist-bundle/schema.sql && echo '[OK] schema.sql in bundle'"

# ── Step 4: pkg → Windows exe ─────────────────────────────────────────────────
Write-Host "`n[4/4] Packaging Windows .exe with pkg..." -ForegroundColor Yellow

& docker exec -w /app/apps/api pibs_api_demo sh -c "mkdir -p pkg-dist"
& docker exec -w /app/apps/api pibs_api_demo sh -c "pkg dist-bundle/index.js --target node18-win-x64 --output pkg-dist/api-server.exe --public --compress GZip 2>&1 | tail -10; echo '[OK] pkg done'"
& docker exec -w /app/apps/api pibs_api_demo sh -c "ls -lh pkg-dist/api-server.exe 2>&1"

# ── Copy binary out ───────────────────────────────────────────────────────────
Write-Host "`nExtracting binary from container..." -ForegroundColor Yellow
& docker cp "pibs_api_demo:/app/apps/api/pkg-dist/api-server.exe" "$BINARIES\$BINARY_NAME"

if (Test-Path "$BINARIES\$BINARY_NAME") {
    $size = [math]::Round((Get-Item "$BINARIES\$BINARY_NAME").Length / 1MB, 1)
    Write-Host "`n=======================================" -ForegroundColor Green
    Write-Host " Sidecar Binary Ready!" -ForegroundColor Green
    Write-Host "=======================================" -ForegroundColor Green
    Write-Host "  File : $BINARIES\$BINARY_NAME"
    Write-Host "  Size : ${size} MB"
} else {
    Write-Host "`n[ERROR] Binary not found - check output above" -ForegroundColor Red
    exit 1
}
