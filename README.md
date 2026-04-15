# iHIMS — intelligent Hospital Information System

A full-featured, white-label hospital management system built with Node.js, React, PostgreSQL, and Prisma.

---

## Quick Start

### Windows

```powershell
.\setup.ps1
```

### Linux / macOS

```bash
bash setup.sh
```

That's it. The script handles everything: database creation, schema push, seed data, and launching all three servers.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 20 LTS | Install via [fnm](https://github.com/Schniz/fnm) (recommended) |
| **Docker Desktop** | Any recent | Used to run PostgreSQL |
| **Git** | Any | For cloning the repository |

### Installing Node.js 20 via fnm

**Windows:**
```powershell
winget install Schniz.fnm
fnm install 20
fnm use 20
```

**macOS:**
```bash
brew install fnm
fnm install 20
fnm use 20
```

**Linux:**
```bash
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc
fnm install 20
fnm use 20
```

---

## What the Setup Script Does

The script runs 7 steps automatically:

| Step | Action |
|------|--------|
| **1** | Locates Node.js 20 (searches fnm, nvm, volta, PATH, Homebrew) |
| **2** | Starts a PostgreSQL 15 container named `pibs-postgres` via Docker |
| **3** | Copies `.env.example` → `.env` for each app (skips if `.env` already exists) |
| **4** | Runs `npm install` from the repo root (installs all workspace dependencies) |
| **5** | Runs `prisma db push` to create/sync all database tables, then `prisma generate` |
| **6** | Seeds the database with departments, doctors, services, sample patients, medications, and rooms |
| **7** | Starts the API, web app, and patient portal in separate processes |

### Script Options

**Windows (PowerShell):**
```powershell
.\setup.ps1                  # Full setup + start
.\setup.ps1 -SkipSeed        # Don't re-seed (keeps existing data)
.\setup.ps1 -SkipStart       # Setup only, don't start servers
.\setup.ps1 -ResetDb         # Drop and recreate PostgreSQL container
```

**Linux / macOS:**
```bash
bash setup.sh                 # Full setup + start
bash setup.sh --skip-seed     # Don't re-seed
bash setup.sh --skip-start    # Setup only
bash setup.sh --reset-db      # Drop and recreate PostgreSQL container
```

---

## Application URLs

| App | URL | Description |
|-----|-----|-------------|
| **Web App** | http://localhost:5175 | Staff/admin interface |
| **API** | http://localhost:3001 | REST API + Socket.io |
| **Patient Portal** | http://localhost:5174 | Patient-facing portal |
| **API Health** | http://localhost:3001/health | Health check endpoint |

---

## Default Login Credentials

> **Change all passwords before deploying to production.**

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Super Admin |
| `admin2` | `pibs2024` | Admin |
| `dr.santos` | `doctor123` | Doctor (Internal Medicine) |
| `dr.reyes` | `doctor123` | Doctor (Pediatrics) |
| `dr.cruz` | `doctor123` | Doctor (Surgery) |
| `billing1` | `pibs2024` | Billing Staff |
| `nurse1` | `pibs2024` | Nurse |
| `nurse2` | `pibs2024` | Nurse |
| `receptionist1` | `pibs2024` | Receptionist |
| `pharmacist1` | `pibs2024` | Pharmacist |
| `labtech1` | `pibs2024` | Lab Technician |
| `radtech1` | `pibs2024` | Radiology Technician |

---

## Architecture

```
iHIMS/
├── apps/
│   ├── api/                   # Express.js REST API (port 3001)
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Database schema (50+ models)
│   │   │   └── seed.ts        # Initial data seeder
│   │   └── src/
│   │       ├── modules/       # Feature modules (30+ modules)
│   │       ├── middleware/    # Auth, error handling, RBAC
│   │       ├── lib/           # Prisma client, Socket.io
│   │       └── server.ts      # Entry point
│   ├── web/                   # React web app (port 5175)
│   │   └── src/
│   │       ├── pages/         # Feature pages
│   │       ├── components/    # Shared components
│   │       ├── hooks/         # React Query hooks
│   │       ├── store/         # Zustand state (auth, branding)
│   │       └── lib/           # API client, Socket.io client
│   └── patient-portal/        # React patient portal (port 5174)
├── packages/
│   └── shared/                # Shared TypeScript types
├── docs/
│   └── ASSESSMENT.md          # Feature completeness tracking
├── setup.ps1                  # Windows setup script
├── setup.sh                   # Linux/macOS setup script
└── stop.sh                    # Linux/macOS stop script
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | Node.js 20, Express.js, TypeScript |
| **ORM** | Prisma (schema-push, no migrations) |
| **Database** | PostgreSQL 15 (via Docker) |
| **Real-time** | Socket.io (queue updates) |
| **Web UI** | React 18, Ant Design 5, Vite |
| **State** | Zustand (auth, branding), React Query (server state) |
| **Auth** | JWT (access tokens), bcryptjs (passwords) |
| **Build** | Turborepo (monorepo), npm workspaces |

---

## Environment Configuration

### API (`apps/api/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5432/pibs` | PostgreSQL connection string |
| `JWT_SECRET` | *(change this!)* | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
| `PORT` | `3001` | API server port |
| `NODE_ENV` | `development` | Environment mode |
| `CORS_ORIGIN` | `http://localhost:5173,...` | Allowed CORS origins |
| `APP_URL` | `http://localhost:5175` | Used in PayMongo redirect URLs |
| `PAYMONGO_SECRET_KEY` | *(blank)* | PayMongo API key (leave blank for simulation) |
| `PAYMONGO_WEBHOOK_SECRET` | *(blank)* | PayMongo webhook signature secret |
| `SEMAPHORE_API_KEY` | *(blank)* | Semaphore SMS API key (leave blank for simulation) |

### Enabling Real Payments (PayMongo)

1. Create an account at https://dashboard.paymongo.com
2. Go to **Developers → API Keys**
3. Copy the **Secret key** (`sk_live_...` or `sk_test_...`)
4. Add to `apps/api/.env`:
   ```
   PAYMONGO_SECRET_KEY=sk_test_your_key_here
   ```
5. Restart the API server

### Enabling Real SMS (Semaphore)

1. Create an account at https://semaphore.co
2. Go to **Account → API** and copy your API key
3. Add to `apps/api/.env`:
   ```
   SEMAPHORE_API_KEY=your_semaphore_api_key
   ```
4. Restart the API server

---

## White-Label / Branding

iHIMS supports full white-labeling per client. After logging in as Admin:

1. Navigate to **Settings → Branding**
2. Update:
   - **System Name** — appears in login page, sidebar, browser tab
   - **System Subtitle** — tagline shown on login page
   - **Logo** — upload PNG/JPG/SVG/WebP (max 2MB)
   - **Primary Color** — buttons, links, highlights
   - **Sidebar Color** — navigation background
3. Click **Save Settings** — changes take effect immediately across all connected clients

---

## Roles & Permissions

| Role | Access Level |
|------|-------------|
| `SUPER_ADMIN` | Full access to all modules + system settings + branding |
| `ADMIN` | All clinical modules + user management (no branding) |
| `DOCTOR` | EMR, consultations, lab orders, prescriptions, telemedicine |
| `NURSE` | Nursing care plans, vitals, admissions, shift handover |
| `RECEPTIONIST` | Appointments, patient registration, queue management |
| `BILLING` | Billing, payments, HMO claims, PhilHealth |
| `PHARMACIST` | Pharmacy inventory, dispensing |
| `LAB_TECH` | Lab requisitions, results entry |
| `RADIOLOGY_TECH` | Radiology orders, results |

---

## Database Management

### View / Reset database

```powershell
# Windows: Connect to PostgreSQL
docker exec -it pibs-postgres psql -U postgres -d pibs

# Re-push schema after changes
.\setup.ps1 -SkipSeed -SkipStart

# Full reset (DELETES ALL DATA)
.\setup.ps1 -ResetDb
```

### Manual Prisma commands

```powershell
$NODE20 = "C:\Users\<user>\AppData\Roaming\fnm\node-versions\v20.20.2\installation"

# Push schema changes
& "$NODE20\node.exe" node_modules\prisma\build\index.js db push --schema=apps\api\prisma\schema.prisma

# Regenerate client after schema change
& "$NODE20\node.exe" node_modules\prisma\build\index.js generate --schema=apps\api\prisma\schema.prisma

# Open Prisma Studio (GUI database browser)
& "$NODE20\node.exe" node_modules\prisma\build\index.js studio --schema=apps\api\prisma\schema.prisma
```

---

## Modules Overview

| Module | Description |
|--------|-------------|
| **Patients** | Registration, demographics, bulk Excel import |
| **Consultations** | Doctor consultations, prescriptions, ICD-10 codes |
| **EMR** | Electronic Medical Records — vitals, charts, history |
| **Laboratory** | Requisitions, 26 test templates, results entry |
| **Radiology** | Orders and results |
| **Pharmacy** | Inventory management, dispensing, stock alerts |
| **Billing** | Bills, payments, HMO claims, online payments |
| **Queue Management** | Real-time queue display via Socket.io |
| **Admissions** | Room management, admission/discharge |
| **Operating Room** | OR scheduling, WHO safety checklist |
| **Dialysis** | Session tracking, machine management |
| **Blood Bank** | Blood unit inventory, cross-matching |
| **Asset Management** | Equipment tracking, depreciation |
| **Nursing** | Care plans, shift handover, vitals monitoring |
| **Appointments** | Scheduling, reminders |
| **Telemedicine** | Virtual consultations, session management |
| **HMO** | HMO registrations, eligibility, claims |
| **PhilHealth** | CF4 XML generation, case rates, eClaims |
| **Accounting** | Chart of accounts, journal entries, financial reports |
| **Analytics** | Revenue analytics, patient metrics, doctor performance |
| **DOH Reporting** | FHSIS and PIDSR epidemiological reports |
| **HIE** | Health Information Exchange, FHIR R4 bundles, referrals |
| **Barcode/RFID** | Patient wristbands, medication scanning, asset tracking |
| **SMS** | Template management, Semaphore integration |
| **Online Payments** | GCash, Maya, card via PayMongo |
| **AI Clinical Support** | Rule-based diagnosis suggestions, drug interactions |
| **User Management** | Roles, permissions, user CRUD |
| **Audit Log** | Complete audit trail of all system actions |
| **Settings / Branding** | White-label configuration, logo upload, color scheme |
| **Patient Portal** | Patient-facing: appointments, bills, records |

---

## Troubleshooting

### "Docker daemon is not running"
Open Docker Desktop and wait for it to fully start before running setup.

### "Node.js 20 not found"
Install via fnm and ensure the version is activated:
```bash
fnm install 20
fnm use 20
node --version   # should show v20.x.x
```

### "EPERM: operation not permitted" (Windows Prisma DLL)
The API server is holding the Prisma DLL. Kill it first:
```powershell
powershell -Command "Get-Process node | Stop-Process -Force"
# Then re-run setup
.\setup.ps1 -SkipSeed -SkipStart
```

### PostgreSQL connection refused
```powershell
docker start pibs-postgres
docker ps   # verify it's running
```

### Port already in use
Check what's using the port and kill it:
```powershell
# Find process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Re-run setup safely (no data loss)
```powershell
.\setup.ps1 -SkipSeed      # Windows
bash setup.sh --skip-seed  # Linux/Mac
```

---

## Production Deployment Notes

Before deploying to production:

1. **Change all default passwords** in the database (or re-seed with strong passwords)
2. **Set a strong `JWT_SECRET`**: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
3. **Set `NODE_ENV=production`** in the API `.env`
4. **Use a real PostgreSQL instance** (not the Docker dev container)
5. **Set `PAYMONGO_SECRET_KEY`** to a live key (not test key)
6. **Set up HTTPS** behind a reverse proxy (nginx/caddy)
7. **Configure firewall** to block direct access to ports 3001, 5432
8. **Set up regular database backups**

---

## Repository

```
GitHub: https://github.com/melvin-akino/hospital-system
Branch: main
```

---

## License

Proprietary — All rights reserved.  
&copy; 2026 iHIMS. For licensing inquiries contact the development team.
