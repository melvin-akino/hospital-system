<#
.SYNOPSIS
  Build the iHIMS desktop installer for Windows.

.DESCRIPTION
  Full build pipeline:
    1. Build the web frontend (Vite)
    2. Prepare the Node.js API sidecar binary (via pkg)
    3. Build the Tauri application
    4. Output the installer to: apps/desktop/src-tauri/target/release/bundle/

.PARAMETER Target
  Build target: windows | mac | linux | all (default: current platform)

.PARAMETER Debug
  Build in debug mode (faster, no code optimization)

.EXAMPLE
  .\scripts\build-installer.ps1
  .\scripts\build-installer.ps1 -Target windows
  .\scripts\build-installer.ps1 -Debug
#>

param(
    [ValidateSet("windows", "mac", "linux", "all")]
    [string]$Target = "windows",
    [switch]$Debug
)

$ErrorActionPreference = "Stop"
$ROOT = Resolve-Path "$PSScriptRoot\..\..\..\"
$API_DIR = Join-Path $ROOT "apps\api"
$WEB_DIR = Join-Path $ROOT "apps\web"
$DESKTOP_DIR = Join-Path $ROOT "apps\desktop"

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host " iHIMS Desktop Installer Build" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host " Root:    $ROOT"
Write-Host " Target:  $Target"
Write-Host " Mode:    $(if ($Debug) { 'Debug' } else { 'Release' })"
Write-Host ""

# ── Step 1: Install dependencies ──────────────────────────────────────────────
Write-Host "[1/5] Installing dependencies..." -ForegroundColor Yellow

Push-Location $ROOT
npm install 2>&1 | Write-Host
Pop-Location

# ── Step 2: Build API TypeScript ──────────────────────────────────────────────
Write-Host "`n[2/5] Building API (TypeScript → JavaScript)..." -ForegroundColor Yellow

Push-Location $API_DIR
npx tsc -p tsconfig.build.json 2>&1 | Write-Host
Pop-Location

# ── Step 3: Bundle API as sidecar ─────────────────────────────────────────────
Write-Host "`n[3/5] Building API sidecar binary..." -ForegroundColor Yellow

Push-Location $DESKTOP_DIR
node scripts/prepare-api-sidecar.js 2>&1 | Write-Host
Pop-Location

# ── Step 4: Build web frontend ────────────────────────────────────────────────
Write-Host "`n[4/5] Building web frontend (Vite)..." -ForegroundColor Yellow

Push-Location $WEB_DIR
$env:VITE_API_BASE_URL = "http://localhost:3001/api"
npm run build 2>&1 | Write-Host

# Copy web dist into desktop's expected location
$webDist = Join-Path $WEB_DIR "dist"
$desktopDist = Join-Path $DESKTOP_DIR "dist"
if (Test-Path $desktopDist) { Remove-Item $desktopDist -Recurse -Force }
Copy-Item $webDist $desktopDist -Recurse
Write-Host "  Copied web dist → apps/desktop/dist"
Pop-Location

# ── Step 5: Build Tauri installer ─────────────────────────────────────────────
Write-Host "`n[5/5] Building Tauri installer..." -ForegroundColor Yellow

Push-Location $DESKTOP_DIR

# Ensure cargo-tauri is available
$env:PATH = "C:\Users\$env:USERNAME\.cargo\bin;$env:PATH"

$buildArgs = @("tauri", "build")
if ($Debug) { $buildArgs += "--debug" }

switch ($Target) {
    "windows" { $buildArgs += @("--target", "x86_64-pc-windows-msvc") }
    "mac"     { $buildArgs += @("--target", "x86_64-apple-darwin") }
    "linux"   { $buildArgs += @("--target", "x86_64-unknown-linux-gnu") }
    "all"     { } # Build for current platform (cross-compilation requires additional setup)
}

cargo @buildArgs 2>&1 | Write-Host
Pop-Location

# ── Output ────────────────────────────────────────────────────────────────────
Write-Host "`n=======================================" -ForegroundColor Green
Write-Host " Build Complete!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

$bundleDir = Join-Path $DESKTOP_DIR "src-tauri\target\release\bundle"
if (Test-Path $bundleDir) {
    Write-Host "`nInstaller artifacts:"
    Get-ChildItem $bundleDir -Recurse -Include "*.exe","*.msi","*.dmg","*.AppImage","*.deb","*.rpm" |
        ForEach-Object { Write-Host "  $($_.FullName)" }
} else {
    Write-Host "`nBundle directory not found. Check build output above for errors."
}
