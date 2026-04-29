/**
 * prepare-api-sidecar.js
 *
 * Builds the Node.js API into a single executable for bundling as a Tauri sidecar.
 *
 * This script:
 *  1. Compiles the API TypeScript code (tsc)
 *  2. Uses @vercel/ncc to bundle the compiled output into a single file
 *  3. Uses pkg (or Node SEA) to produce a standalone binary per target platform
 *  4. Places the binary in src-tauri/binaries/ with the correct Tauri naming convention
 *
 * Prerequisites:
 *   npm install -g @vercel/ncc pkg
 *
 * Usage:
 *   node scripts/prepare-api-sidecar.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..', '..');
const API_DIR = path.join(ROOT, 'apps', 'api');
const BINARIES_DIR = path.join(__dirname, '..', 'src-tauri', 'binaries');

// Tauri target triple for current machine
const TARGET_MAP = {
  win32: 'x86_64-pc-windows-msvc',
  darwin: 'x86_64-apple-darwin',
  linux: 'x86_64-unknown-linux-gnu',
};

const platform = os.platform();
const targetTriple = TARGET_MAP[platform] || 'x86_64-unknown-linux-gnu';
const binaryName = platform === 'win32'
  ? `api-server-${targetTriple}.exe`
  : `api-server-${targetTriple}`;

console.log(`\n🔨 Preparing API sidecar for ${platform} (${targetTriple})`);

// Step 1: Build TypeScript
console.log('\n[1/4] Compiling TypeScript...');
execSync('npm run build', { cwd: API_DIR, stdio: 'inherit' });

// Step 2: Bundle with ncc into a single file
console.log('\n[2/4] Bundling with @vercel/ncc...');
const nccOutDir = path.join(API_DIR, 'dist-bundle');
execSync(`npx ncc build ${path.join(API_DIR, 'dist', 'server.js')} -o ${nccOutDir} --no-source-map-register`, {
  stdio: 'inherit',
});

// Step 3: Package as self-contained binary with pkg
console.log('\n[3/4] Packaging as standalone binary with pkg...');

// pkg target mapping
const PKG_TARGET_MAP = {
  win32: 'node18-win-x64',
  darwin: 'node18-macos-x64',
  linux: 'node18-linux-x64',
};
const pkgTarget = PKG_TARGET_MAP[platform] || 'node18-linux-x64';
const outputBinary = path.join(BINARIES_DIR, binaryName);

execSync(
  `npx pkg ${path.join(nccOutDir, 'index.js')} --target ${pkgTarget} --output ${outputBinary}`,
  { stdio: 'inherit' }
);

// Step 4: Make executable on Unix
if (platform !== 'win32') {
  fs.chmodSync(outputBinary, '755');
}

console.log(`\n✅ API sidecar built: ${outputBinary}`);
console.log('\nNext steps:');
console.log('  npm run build  (from apps/desktop/ to produce the installer)');
