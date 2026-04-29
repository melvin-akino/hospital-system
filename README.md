# iHIMS — intelligent Hospital Information System

A full-featured, white-label hospital management system built with Node.js, React, PostgreSQL, and Prisma. Covers the complete clinical, billing, pharmacy, and administrative workflow of a Philippine hospital in a single deployable monorepo.

---

## Quick Start (Docker — recommended)

> Docker Desktop must be running first.

```bash
git clone https://github.com/melvin-akino/hospital-system
cd hospital-system

# Build and start all 4 services in one command
docker compose up -d

# Seed the database (first run only)
docker exec pibs_api_demo sh -c "cd /app/apps/api && node /app/node_modules/ts-node/dist/bin.js prisma/seed.ts"
```

The stack starts in dependency order: **PostgreSQL → API (auto-migrates) → Staff Portal → Patient Portal**.

| App | URL |
|-----|-----|
| Staff Portal | http://localhost:5175 |
| Patient Portal | http://localhost:5175/portal |
| REST API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api/docs |
| PostgreSQL | localhost:5432 |

Staff login: `admin` / `admin123`  
Patient portal login: Patient ID + Date of Birth (no password — see credentials section below)

---

## Docker Management

```bash
docker compose up -d          # start everything
docker compose down           # stop everything
docker compose restart api    # restart one service
docker compose logs -f api    # stream logs for a service
docker compose logs -f        # stream all logs
docker compose build          # rebuild images after Dockerfile changes
docker compose ps             # show status of all containers
```

### Running Containers (demo stack)

The demo stack uses named containers instead of compose. Run status:

| Container | Image | Ports | Purpose |
|-----------|-------|-------|---------|
| `pibs_web_demo` | `pibs_web_portal` | `5175:5175` | Staff + Patient Portal (Vite dev server) |
| `pibs_api_demo` | — | `3001:3001` | REST API (ts-node-dev hot-reload) |
| `pibs_postgres_demo` | postgres:16 | `5432:5432` | PostgreSQL database |

> **Important — port mapping:** Vite is configured to run on port **5175** inside the container. Always use `-p 5175:5175` (not `5175:5173`) when running the web container manually.

```bash
# Start the web container correctly
docker run -d --name pibs_web_demo --network pibs_default \
  -p 5175:5175 \
  -e VITE_API_PROXY_TARGET=http://pibs_api_demo:3001 \
  pibs_web_portal

# Push a schema change and restart API
docker cp apps/api/prisma/schema.prisma pibs_api_demo:/app/apps/api/prisma/schema.prisma
docker exec pibs_api_demo sh -c "cd /app/apps/api && npx prisma db push --accept-data-loss"
docker restart pibs_api_demo

# Hot-copy a single backend file (ts-node-dev picks it up automatically)
docker cp apps/api/src/modules/billing/billing.controller.ts \
  pibs_api_demo:/app/apps/api/src/modules/billing/billing.controller.ts
```

Hot-reload is active — edits to files under `apps/web/src/` and `apps/api/src/` are reflected immediately without rebuilding.

---

## Alternative: Local Development (without Docker)

Requires Node.js 20 and a running PostgreSQL instance.

### Windows
```powershell
.\setup.ps1
```

### Linux / macOS
```bash
bash setup.sh
```

**Script options:**

| Flag | Effect |
|------|--------|
| `-SkipSeed` / `--skip-seed` | Skip seeding (keeps existing data) |
| `-SkipStart` / `--skip-start` | Setup only, don't start servers |
| `-ResetDb` / `--reset-db` | Drop and recreate the database |

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Docker Desktop** | Any recent | Required for Docker setup |
| **Node.js** | 20 LTS | For local dev; install via [fnm](https://github.com/Schniz/fnm) |
| **Git** | Any | |

**Install Node.js 20 via fnm (local dev only):**
```bash
# Windows
winget install Schniz.fnm && fnm install 20 && fnm use 20

# macOS
brew install fnm && fnm install 20 && fnm use 20

# Linux
curl -fsSL https://fnm.vercel.app/install | bash && source ~/.bashrc && fnm install 20
```

---

## Default Login Credentials

> **Change all passwords before deploying to production.**

### Staff Portal — http://localhost:5175

All accounts use password **`pibs2024`** except `admin` which uses `admin123`.

Each role lands on a different default page after login based on their department assignment.

#### Administrators

| Username | Password | Role | Default Page |
|----------|----------|------|-------------|
| `admin` | `admin123` | Super Admin | `/dashboard` |
| `admin2` | `pibs2024` | Admin | `/dashboard` |
| `bilsup1` | `pibs2024` | Billing Supervisor | `/billing` |

#### Doctors

| Username | Password | Display Name | Department | Default Page |
|----------|----------|--------------|------------|-------------|
| `er.doctor1` | `pibs2024` | Dr. Mark Lim | Emergency | `/er-dashboard` |
| `icu.doctor1` | `pibs2024` | Dr. Liza Ong | ICU | `/icu-dashboard` |
| `ob.doctor1` | `pibs2024` | Dr. Gloria Sia | OB-GYN | `/ob-dashboard` |
| `or.doctor1` | `pibs2024` | Dr. Felix Tan | OR | `/or-dashboard` |
| `dr.santos` | `pibs2024` | — | General | `/workspace` |
| `dr.reyes` | `pibs2024` | — | General | `/workspace` |
| `dr.cruz` | `pibs2024` | — | General | `/workspace` |

#### Nurses

| Username | Password | Display Name | Department | Default Page |
|----------|----------|--------------|------------|-------------|
| `er.nurse1` | `pibs2024` | Ana Reyes RN | Emergency | `/er-dashboard` |
| `icu.nurse1` | `pibs2024` | Ben Torres RN | ICU | `/icu-dashboard` |
| `ob.nurse1` | `pibs2024` | Rose Dela Cruz RN | OB-GYN | `/ob-dashboard` |
| `or.nurse1` | `pibs2024` | Maya Ramos RN | OR | `/or-dashboard` |
| `nurse1` | `pibs2024` | — | General Ward | `/nursing-station` |
| `nurse2` | `pibs2024` | — | General Ward | `/nursing-station` |

#### Receptionists / Front Desk

| Username | Password | Display Name | Department | Default Page |
|----------|----------|--------------|------------|-------------|
| `admitting1` | `pibs2024` | Luz Magno | Admitting | `/admitting` |
| `er.receptionist` | `pibs2024` | Cora Bautista | Emergency | `/er-dashboard` |
| `medrec1` | `pibs2024` | Jun Vargas | Med Records | `/medical-records` |
| `receptionist1` | `pibs2024` | — | Admitting | `/admitting` |

#### Clinical Support

| Username | Password | Role | Default Page |
|----------|----------|------|-------------|
| `billing1` | `pibs2024` | Billing Staff | `/billing` |
| `pharmacist1` | `pibs2024` | Pharmacist | `/pharmacy-queue` |
| `labtech1` | `pibs2024` | Lab Technician | `/lab-queue` |
| `radtech1` | `pibs2024` | Radiology Tech | `/radiology-queue` |

---

### Patient Portal — http://localhost:5175/portal

Patients log in using their **Patient ID** and **Date of Birth** — no password required.

| Patient ID | First Name | Last Name | Date of Birth |
|------------|------------|-----------|---------------|
| `PAT-000001` | Juan | Cruz | March 15, 1985 |
| `PAT-000002` | Maria | Reyes | July 20, 1948 |
| `PAT-000003` | Pedro | Santos | December 1, 1990 |
| `PAT-000004` | Luisa | Mendoza | May 10, 1972 |
| `PAT-000005` | Roberto | Villanueva | September 25, 1965 |

The patient portal provides read-only access to: appointments (+ self-booking), lab results, prescriptions, bills, and personal profile. It uses a separate JWT from the staff portal and has its own teal-themed layout at `/portal/*`.

---

## API Keys & Third-Party Integrations

All integrations run in **simulation / fallback mode** when credentials are absent — the system works fully out of the box without any API keys. Add keys only when you want to activate real external services.

### Free / Trial API Keys

| Service | What It Enables | Free Tier | Signup |
|---------|----------------|-----------|--------|
| **PayMongo** | GCash, Maya, card payments | Full sandbox — no credit card needed | https://dashboard.paymongo.com/signup |
| **Anthropic (Claude)** | AI diagnosis, drug interactions, vitals narrative | ~$5 free credits, no card required | https://console.anthropic.com |
| **Daily.co** | Telemedicine video rooms | 10,000 participant-minutes/month free | https://dashboard.daily.co/signup |
| **Semaphore SMS** | Patient SMS notifications | No free tier; ₱0.50/SMS, credits valid 12 months | https://semaphore.co |
| **Agora** | Alternative video SDK | 10,000 minutes/month free | https://www.agora.io |

### Setting API Keys

Edit `apps/api/.env` (or set environment variables in `docker-compose.yml`), then restart:

```bash
# Docker
docker compose restart api

# Local dev — just restart the API server
```

---

### PayMongo (Online Payments)

```
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxx
PAYMONGO_WEBHOOK_SECRET=whsk_xxxxxxxxxxxx   # optional — for webhook verification
APP_URL=http://localhost:5175               # used in payment redirect URLs
```

1. Sign up at https://dashboard.paymongo.com/signup (no credit card)
2. Go to **Developers → API Keys → Test keys**
3. Copy the **Secret key** (starts with `sk_test_`)
4. Test card: `4343 4343 4343 4343`, any future expiry, any CVV

Without a key the system **simulates** payment links — checkout URLs are generated locally, payments auto-confirm after 30 seconds, and a *(Simulated)* badge is shown in the UI.

---

### Anthropic Claude API (AI Clinical Support)

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx
CLAUDE_MODEL=claude-sonnet-4-20250514
```

1. Sign up at https://console.anthropic.com (no credit card, ~$5 free credits)
2. Go to **API Keys → Create Key**

Without a key the system uses the built-in 30-rule symptom engine and drug-interaction table. The `aiEngine` field in responses is `"llm"` (real) or `"rule-based"` (fallback) so the frontend shows the appropriate badge.

---

### Daily.co (Telemedicine Video)

```
DAILY_API_KEY=your_daily_api_key_here
DAILY_DOMAIN=your-subdomain.daily.co
```

1. Sign up at https://dashboard.daily.co/signup (no credit card)
2. Copy your **API key** from the Dashboard
3. Note your **domain** (e.g. `yourhospital.daily.co`)

Without a key the telemedicine module uses a WebRTC peer-to-peer room — functional for internal/demo use but without Daily.co's TURN relay, recording, and analytics features.

---

### Semaphore SMS

```
SEMAPHORE_API_KEY=your_semaphore_key_here
SEMAPHORE_SENDER_NAME=IHIMS            # optional: registered sender ID
```

1. Sign up at https://semaphore.co
2. Go to **Account → API** and copy your API key
3. Purchase credits (₱0.50/SMS, valid 12 months; minimum top-up applies)

Without a key SMS messages are logged to the console and stored in the database with `status: SIMULATED`.

---

### Enabling Email (SMTP)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourhospital.com
SMTP_PASS=your-app-password
SMTP_FROM=iHIMS <noreply@yourhospital.com>
```

Use a **Gmail App Password** (not your main password) or any SMTP relay. Without credentials, email content is printed to the console.

Emails sent for: password reset, security alerts, appointment confirmations, telemedicine booking (includes room code + join link).

**Free SMTP options:**
- [SendGrid](https://sendgrid.com) — 100 emails/day free, no credit card
- [Resend](https://resend.com) — 100 emails/day free, modern API

---

### PhilHealth eClaims API

```
PHILHEALTH_API_URL=https://eclaims.philhealth.gov.ph/api/v2
PHILHEALTH_FACILITY_CODE=your_facility_code
PHILHEALTH_API_KEY=your_bearer_token
```

Register your facility at the [PhilHealth eClaims portal](https://eclaims.philhealth.gov.ph). Without credentials the system generates transmittal numbers locally, auto-approves claims after 60 seconds, and shows a *(Simulated)* badge.

---

### HMO Direct Billing APIs

Each HMO is configured independently — unconfigured HMOs fall back to simulation.

**Maxicare** (OAuth2):
```
MAXICARE_API_URL=https://api.maxicare.com.ph/v1
MAXICARE_FACILITY_CODE=your_facility_code
MAXICARE_CLIENT_ID=your_client_id
MAXICARE_CLIENT_SECRET=your_client_secret
```

**PhilamLife Health** (API key):
```
PHILAM_API_URL=https://api.philamlife.com/hmo/v2
PHILAM_FACILITY_CODE=your_provider_code
PHILAM_API_KEY=your_api_key
```

**Intellicare** (API key):
```
INTELLICARE_API_URL=https://api.intellicare.com.ph/v1
INTELLICARE_FACILITY_CODE=your_facility_code
INTELLICARE_API_KEY=your_api_key
```

---

## Full Environment Variable Reference

### `apps/api/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://pibs:pibs_secret@localhost:5432/pibs_db` | PostgreSQL connection string |
| `JWT_SECRET` | *(change this!)* | Secret for JWT signing |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `PORT` | `3001` | API port |
| `NODE_ENV` | `development` | `development` or `production` |
| `CORS_ORIGIN` | `http://localhost:5175` | Allowed browser origin |
| `APP_URL` | `http://localhost:5175` | Used in PayMongo redirect URLs |
| `PAYMONGO_SECRET_KEY` | *(blank → simulation)* | PayMongo secret key |
| `PAYMONGO_WEBHOOK_SECRET` | *(blank)* | Webhook signature verification |
| `SEMAPHORE_API_KEY` | *(blank → simulation)* | Semaphore SMS key |
| `SEMAPHORE_SENDER_NAME` | `IHIMS` | SMS sender ID |
| `ANTHROPIC_API_KEY` | *(blank → rule-based fallback)* | Claude API key |
| `CLAUDE_MODEL` | `claude-sonnet-4-20250514` | Model to use |
| `DAILY_API_KEY` | *(blank → P2P WebRTC)* | Daily.co API key |
| `DAILY_DOMAIN` | *(blank)* | Daily.co subdomain |
| `SMTP_HOST` | *(blank → console log)* | SMTP server host |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | *(blank)* | SMTP username |
| `SMTP_PASS` | *(blank)* | SMTP password/app-password |
| `SMTP_FROM` | `iHIMS <noreply@hospital.com>` | From address |
| `PHILHEALTH_API_URL` | *(blank → simulation)* | PhilHealth eClaims base URL |
| `PHILHEALTH_FACILITY_CODE` | *(blank)* | Accredited facility code |
| `PHILHEALTH_API_KEY` | *(blank)* | PhilHealth bearer token |
| `MAXICARE_API_URL` | *(blank → simulation)* | Maxicare API URL |
| `MAXICARE_CLIENT_ID` | *(blank)* | Maxicare OAuth2 client ID |
| `MAXICARE_CLIENT_SECRET` | *(blank)* | Maxicare OAuth2 secret |
| `MAXICARE_FACILITY_CODE` | *(blank)* | Maxicare facility code |
| `PHILAM_API_URL` | *(blank → simulation)* | PhilamLife HMO API URL |
| `PHILAM_API_KEY` | *(blank)* | Philam API key |
| `PHILAM_FACILITY_CODE` | *(blank)* | Philam provider code |
| `INTELLICARE_API_URL` | *(blank → simulation)* | Intellicare API URL |
| `INTELLICARE_API_KEY` | *(blank)* | Intellicare API key |
| `INTELLICARE_FACILITY_CODE` | *(blank)* | Intellicare facility code |

### `apps/web/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | API base URL (direct) |
| `VITE_API_PROXY_TARGET` | `http://localhost:3001` | Vite dev proxy target (set to `http://api:3001` in Docker) |

---

## Architecture

```
iHIMS/
├── apps/
│   ├── api/                         # Express.js REST API (port 3001)
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema (50+ models)
│   │   │   └── seed.ts              # Initial data seeder
│   │   └── src/
│   │       ├── modules/             # 35 feature modules
│   │       │   └── patient-portal/  # Patient portal endpoints (separate JWT)
│   │       ├── middleware/          # JWT auth, RBAC, rate limiting
│   │       ├── lib/                 # Prisma client, Socket.io, Swagger
│   │       └── server.ts            # Entry point
│   └── web/                         # React app — Staff + Patient Portal (port 5175)
│       └── src/
│           ├── pages/               # 90+ feature pages
│           │   └── portal/          # Patient portal pages (/portal/*)
│           ├── components/          # Layout, ErrorBoundary, HelpDrawer
│           ├── hooks/               # React Query hooks
│           ├── store/               # Zustand (authStore, portalAuthStore, branding)
│           └── lib/                 # api.ts (staff), portalApi.ts (patient portal)
├── packages/
│   └── shared/                      # Shared TypeScript types + Zod schemas
├── FEATURE_STATUS.md                # Sprint tracker — all 20 items complete
├── README.md                        # This file
├── ASSESSMENT.md                    # Feature completeness assessment
├── SALES.md                         # Sales & pitch document
├── apps/api/Dockerfile              # API container
├── apps/web/Dockerfile              # Web container (staff + patient portal)
├── docker-compose.yml               # Full stack orchestration
├── .dockerignore
├── setup.ps1                        # Windows local-dev setup
└── setup.sh                         # Linux/macOS local-dev setup
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | Node.js 20, Express.js, TypeScript |
| **ORM** | Prisma 5 (schema-push) |
| **Database** | PostgreSQL 16 |
| **Real-time** | Socket.io (queue, telemedicine signalling) |
| **Web UI** | React 18, Ant Design 5, Vite 5 |
| **State** | Zustand (auth, branding), TanStack Query v5 |
| **Auth** | JWT + bcryptjs, per-route rate limiting (express-rate-limit) |
| **API Docs** | Swagger UI (OpenAPI 3.0) at `/api/docs` |
| **Testing** | Jest + ts-jest (utils, middleware, business logic) |
| **Build** | Turborepo, npm workspaces |
| **Containers** | Docker (4-container compose stack) |

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
| **Admissions** | Room management, admission/discharge workflows |
| **Operating Room** | OR scheduling, WHO surgical safety checklist |
| **Dialysis** | Session tracking, machine management |
| **Blood Bank** | Blood unit inventory, cross-matching, donors |
| **Asset Management** | Equipment tracking, depreciation reporting |
| **Nursing** | Care plans, shift handover, vitals monitoring |
| **Appointments** | Scheduling, availability calendar, SMS reminders |
| **Telemedicine** | Virtual consultations, WebRTC video, Daily.co integration |
| **HMO** | Registrations, eligibility checks, direct billing APIs |
| **PhilHealth** | CF4 XML generation, case rates, eClaims API |
| **Accounting** | Chart of accounts, journal entries, trial balance, P&L |
| **Analytics** | Revenue analytics, patient metrics, doctor performance |
| **DOH Reporting** | FHSIS and PIDSR epidemiological reports |
| **HIE** | Health Information Exchange, FHIR R4 bundles, referrals |
| **Barcode / RFID** | Patient wristbands, medication scanning, asset tracking |
| **SMS Notifications** | Semaphore integration, template management |
| **Online Payments** | GCash, Maya, card via PayMongo |
| **AI Clinical Support** | Claude LLM + 30-rule fallback: diagnosis, drug interactions, vitals |
| **Help Center** | Contextual HelpDrawer (? button) + full Help Center page |
| **User Management** | Roles, permissions, user CRUD |
| **Audit Log** | Complete tamper-evident audit trail |
| **Settings / Branding** | White-label: name, logo, primary color, sidebar color |
| **Patient Portal** | Self-service: appointments, bills, medical records, lab results |

---

## Roles & Permissions

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Everything — all modules, system settings, branding |
| `ADMIN` | All clinical + user management (no branding) |
| `DOCTOR` | EMR, consultations, lab orders, prescriptions, telemedicine, AI |
| `NURSE` | Care plans, vitals, admissions, shift handover |
| `RECEPTIONIST` | Appointments, patient registration, queue management |
| `BILLING` | Billing, payments, HMO claims, PhilHealth |
| `PHARMACIST` | Pharmacy inventory, dispensing |
| `LAB_TECH` | Lab requisitions, results entry |
| `RADIOLOGY_TECH` | Radiology orders, results |

---

## White-Label / Branding

iHIMS supports full white-labeling per client. Log in as Admin → **Settings → Branding**:

- **System Name** — shown in login page, sidebar, browser tab
- **Tagline** — shown on login screen
- **Logo** — PNG/JPG/SVG/WebP, max 2MB
- **Primary Color** — buttons, links, active states
- **Sidebar Color** — navigation background

Changes take effect immediately for all connected clients.

---

## API Documentation

Interactive API documentation (Swagger UI) is available at:
```
http://localhost:3001/api/docs
```

Raw OpenAPI 3.0 spec (JSON) at:
```
http://localhost:3001/api/docs.json
```

Covers all 35 modules with request/response schemas, authentication requirements, and example payloads.

---

## Security

- **Rate limiting** on all auth endpoints (login: 10/15 min, forgot-password: 3/hr, reset: 5/hr, change-password: 5/15 min)
- **JWT authentication** on all protected routes
- **RBAC** — role-based access control at both route and UI level
- **Helmet.js** — security headers
- **CORS** — configured per environment
- **bcryptjs** (cost 12) for password hashing
- **Audit log** — every create/update/delete is logged with user, timestamp, and IP

---

## Database Management

### Via Docker

```bash
# Connect to PostgreSQL
docker exec -it pibs_postgres_demo psql -U pibs -d pibs_db

# Re-run seed (safe — uses upsert)
docker exec pibs_api_demo sh -c "cd /app/apps/api && node /app/node_modules/ts-node/dist/bin.js prisma/seed.ts"

# Push schema changes
docker exec pibs_api_demo sh -c "cd /app/apps/api && npx prisma db push --accept-data-loss"

# Open Prisma Studio (run from host)
cd apps/api && npx prisma studio
```

### Via Local Dev

```powershell
# Re-push schema
.\setup.ps1 -SkipSeed -SkipStart

# Full reset (DELETES ALL DATA)
.\setup.ps1 -ResetDb
```

---

## Testing

```bash
# Run all tests
cd apps/api && npm test

# Watch mode
npm run test:watch

# With coverage report
npm run test:coverage
```

Test suites cover: response utilities, JWT middleware, RBAC middleware, AI clinical rules engine, billing calculations.

---

## Troubleshooting

### Site loads but shows a blank page / can't connect

The most common cause is a wrong port mapping when starting the web container manually. Vite is configured to run on port **5175** inside the container — always map `5175:5175`, never `5175:5173`:

```bash
# Wrong — nothing listening on container port 5173
docker run -p 5175:5173 pibs_web_portal

# Correct
docker run -p 5175:5175 -e VITE_API_PROXY_TARGET=http://pibs_api_demo:3001 pibs_web_portal
```

### Docker: port already in use

```bash
# Find what's using the port
netstat -ano | findstr :5432   # Windows
lsof -i :5432                  # macOS/Linux

# Stop conflicting containers
docker ps        # find the container name
docker stop <container>
```

### Docker: containers keep restarting

```bash
docker compose logs api        # check error output
docker compose down && docker compose up -d --build
```

### Docker: old postgres container blocking port 5432

```bash
docker stop pibs-postgres      # stop the old standalone container
docker compose up -d           # bring up the compose stack
```

### Local dev: "Node.js 20 not found"

```bash
fnm install 20 && fnm use 20
node --version   # should show v20.x.x
```

### Local dev: "EPERM: operation not permitted" (Windows Prisma DLL)

```powershell
powershell -Command "Get-Process node | Stop-Process -Force"
.\setup.ps1 -SkipSeed -SkipStart
```

### White screen after login

An `ErrorBoundary` catches all render errors and displays the error message + stack trace instead of a blank page. If you see a blank page without the error card, open browser DevTools → Console to view the error.

### Re-run setup without losing data

```bash
docker compose restart         # Docker
.\setup.ps1 -SkipSeed          # Windows local
bash setup.sh --skip-seed      # Linux/macOS local
```

---

## Production Deployment

Before going live:

1. **Change all default passwords** (or re-seed with strong credentials)
2. **Set a strong `JWT_SECRET`**: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
3. **Set `NODE_ENV=production`** in the API env
4. **Use a managed PostgreSQL** (AWS RDS, Supabase, etc.) — not the Docker dev container
5. **Switch PayMongo to live keys** (`sk_live_...`)
6. **Set up HTTPS** behind nginx or Caddy with a TLS certificate
7. **Configure firewall** — only expose ports 80/443 publicly; keep 3001, 5432 internal
8. **Set up regular database backups**
9. **Use production Docker images** built with `docker build --target production`

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
