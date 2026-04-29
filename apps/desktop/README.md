# iHIMS Desktop App

Tauri v2 desktop wrapper for the **iHIMS** (Integrated Hospital Information Management System).

Produces cross-platform native installers:
| Platform | Format | Output |
|----------|--------|--------|
| Windows | NSIS (`.exe`) | `src-tauri/target/release/bundle/nsis/iHIMS_1.0.0_x64-setup.exe` |
| Windows | MSI (`.msi`) | `src-tauri/target/release/bundle/msi/iHIMS_1.0.0_x64_en-US.msi` |
| macOS | DMG (`.dmg`) | `src-tauri/target/release/bundle/dmg/iHIMS_1.0.0_x64.dmg` |
| Linux | AppImage | `src-tauri/target/release/bundle/appimage/i-hims_1.0.0_amd64.AppImage` |
| Linux | Debian | `src-tauri/target/release/bundle/deb/i-hims_1.0.0_amd64.deb` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    iHIMS Desktop (Tauri)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WebView2 (Windows) / WebKit (macOS/Linux)               │   │
│  │  → Serves built React/Vite app from apps/desktop/dist/  │   │
│  │  → Proxies /api/* to localhost:3001                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↕  Tauri IPC                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Rust Core (src-tauri/)                                  │   │
│  │  • Launches Node.js API sidecar on startup               │   │
│  │  • System tray icon with Open/Portal/Quit menu           │   │
│  │  • Health-polls API → shows splash until ready           │   │
│  │  • Auto-updater support (Tauri plugin-updater)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↕  Sidecar                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Node.js API (binaries/api-server.exe)                   │   │
│  │  • Express + Prisma ORM                                  │   │
│  │  • Connects to PostgreSQL (bundled or external)          │   │
│  │  • Serves REST API on localhost:3001                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↕  TCP                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (must be installed separately)               │   │
│  │  • pibs_db database                                      │   │
│  │  • User: pibs, Password: pibs_secret                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### For End Users (installing the app)
- **Windows 10/11** (x64) — WebView2 runtime (included in Windows 11, auto-installed for Windows 10)
- **PostgreSQL 16+** — [Download here](https://www.postgresql.org/download/windows/)

### For Developers (building from source)
- **Rust** 1.77+ — [rustup.rs](https://rustup.rs)
- **Node.js** 18+ — [nodejs.org](https://nodejs.org)
- **npm** 9+
- **Tauri CLI v2** — `cargo install tauri-cli --version "^2"`
- **PostgreSQL** (for local dev)
- **pkg** (for sidecar) — `npm install -g pkg @vercel/ncc`

#### Windows only:
- **Visual Studio Build Tools** (for MSVC compiler)
- **WebView2 SDK**
- **NSIS** (for installer packaging) — auto-installed by Tauri

#### macOS only:
- **Xcode Command Line Tools** — `xcode-select --install`
- **Apple Developer account** (for code signing, optional for dev builds)

---

## Development

```bash
# 1. Install desktop dependencies
cd apps/desktop
npm install

# 2. Start full dev environment (runs API + web + Tauri hot-reload)
npm run dev
```

This starts:
- Vite dev server on `http://localhost:5175`
- Tauri window loading the dev server
- (API must be started separately: `cd apps/api && npm run dev`)

---

## Building the Installer

### Quick Build (current platform)

**Windows (PowerShell):**
```powershell
cd apps/desktop
.\scripts\build-installer.ps1
```

**macOS / Linux:**
```bash
cd apps/desktop
./scripts/build-installer.sh
```

### Manual Steps

```bash
# 1. Build the web frontend
cd apps/web
VITE_API_PROXY_TARGET=http://localhost:3001 npm run build
cp -r dist ../desktop/dist

# 2. Build the API sidecar (requires pkg + ncc installed globally)
cd apps/desktop
node scripts/prepare-api-sidecar.js

# 3. Build Tauri installer
cargo tauri build
```

### Output Location
```
apps/desktop/src-tauri/target/release/bundle/
├── nsis/
│   └── iHIMS_1.0.0_x64-setup.exe     ← Windows installer
├── msi/
│   └── iHIMS_1.0.0_x64_en-US.msi     ← Windows MSI
├── dmg/
│   └── iHIMS_1.0.0_x64.dmg           ← macOS disk image
├── appimage/
│   └── i-hims_1.0.0_amd64.AppImage   ← Linux AppImage
└── deb/
    └── i-hims_1.0.0_amd64.deb        ← Debian/Ubuntu package
```

---

## First-Run Database Setup

On first launch, iHIMS checks for a PostgreSQL connection. If the database `pibs_db` doesn't exist, it will:

1. Show a setup wizard
2. Ask for PostgreSQL host, port, user, and password
3. Create the `pibs_db` database and run migrations (`prisma migrate deploy`)
4. Seed with demo data (optional)

Default connection (configure in `.env` or setup wizard):
```
DATABASE_URL=postgresql://pibs:pibs_secret@localhost:5432/pibs_db
```

---

## App Icons

Place custom icon files in `src-tauri/icons/`:
| File | Size | Used for |
|------|------|----------|
| `32x32.png` | 32×32 | System tray |
| `128x128.png` | 128×128 | App icon (small) |
| `128x128@2x.png` | 256×256 | App icon (HiDPI) |
| `icon.icns` | Multi-size | macOS |
| `icon.ico` | Multi-size | Windows |

Generate all sizes from a single 1024×1024 PNG source:
```bash
cargo tauri icon path/to/your-icon-1024.png
```

---

## Auto-Updates

The app uses `tauri-plugin-updater`. To configure:

1. Set up an update server endpoint (or use GitHub Releases)
2. In `tauri.conf.json`, add:
```json
{
  "plugins": {
    "updater": {
      "endpoints": ["https://your-update-server.com/api/update/{{target}}/{{arch}}/{{current_version}}"]
    }
  }
}
```
3. Sign releases with `TAURI_PRIVATE_KEY` and `TAURI_KEY_PASSWORD` environment variables

---

## Code Signing

### Windows (Code Signing Certificate)
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "path/to/private_key.pem"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "your_password"
cargo tauri build
```

### macOS (Apple Developer)
```bash
export APPLE_CERTIFICATE="Developer ID Application: ..."
export APPLE_CERTIFICATE_PASSWORD="password"
export APPLE_ID="your@apple.id"
export APPLE_TEAM_ID="XXXXXXXXXX"
cargo tauri build
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://pibs:pibs_secret@localhost:5432/pibs_db` | PostgreSQL connection string |
| `JWT_SECRET` | `pibs-desktop-secret-2025` | JWT signing secret (change for production!) |
| `PORT` | `3001` | API server port |
| `NODE_ENV` | `production` | Node.js environment |
