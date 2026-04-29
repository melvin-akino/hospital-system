# iHIMS System Assessment
**Last updated:** 2026-04-25 (v2 — Department Charges & Permission System)  
**Assessed by:** Claude Code  
**Purpose:** Living technical baseline — updated after each major build session

---

## System Overview

**intelligent Hospital Information System (iHIMS)** — Full hospital management platform covering clinical, billing, pharmacy, and administrative workflows for Philippine hospitals.

| Layer | Technology |
|-------|-----------|
| **API** | Node.js 20, Express.js 4, TypeScript 5 |
| **ORM** | Prisma 5 (schema-push, no versioned migrations) |
| **Database** | PostgreSQL 16 |
| **Real-time** | Socket.io 4 (queue display, telemedicine signalling) |
| **Staff Portal** | React 18, Ant Design 5, Vite 5 (port 5175) |
| **Patient Portal** | React 18, Ant Design 5, Vite 5 (port 5174) |
| **State** | Zustand 4 (auth, branding), TanStack Query v5 |
| **Auth** | JWT + bcryptjs, express-rate-limit |
| **API Docs** | Swagger UI — OpenAPI 3.0 at `/api/docs` |
| **Tests** | Jest 29 + ts-jest |
| **Containers** | Docker Compose (4-container stack) |
| **Monorepo** | npm workspaces + Turborepo |

**Node requirement:** v20 LTS (tested on v20.20.2 via fnm)

---

## Containers (Docker Compose)

| Container | Image | Port | Notes |
|-----------|-------|------|-------|
| `pibs_postgres` | postgres:16-alpine | 5432 | Named volume `pibs_postgres_data` |
| `pibs_api` | pibs-api (custom) | 3001 | Runs `prisma db push` on startup, then ts-node-dev |
| `pibs_web` | pibs-web (custom) | 5175 | Vite dev server, hot-reload via volume mount |
| `pibs_patient_portal` | pibs-patient-portal (custom) | 5174 | Vite dev server, hot-reload via volume mount |

Startup order: `postgres` (health-checked) → `api` → `web` + `patient-portal`

---

## What Is Fully Built ✅

### Core Clinical

| Module | Pages | API | DB | Notes |
|--------|-------|-----|----|-------|
| Auth (login/logout/JWT/password reset) | ✅ | ✅ | Prisma | Sessions table, forgot/reset flow |
| Patients (CRUD, bulk Excel import) | ✅ | ✅ | Prisma | Excel import via XLSX, soft delete |
| Doctors | ✅ | ✅ | Prisma | Profile, schedule, specialty |
| Departments | ✅ | ✅ | Prisma | |
| Services / Service Catalog | ✅ | ✅ | Prisma | |
| Consultations + Prescriptions | ✅ | ✅ | Prisma | ICD-10 codes, e-prescriptions |
| EMR (vitals, charts, history) | ✅ | ✅ | Prisma | Chart view, timeline |
| Lab Requisitions & Results | ✅ | ✅ | Prisma | 26 hardcoded test templates |
| Radiology Orders & Results | ✅ | ✅ | Prisma | |
| Pharmacy & Inventory | ✅ | ✅ | Prisma | Stock alerts, purchase orders |
| Queue Management | ✅ | ✅ | Prisma | Real-time push via Socket.io |
| Nursing (care plans, vitals, handover) | ✅ | ✅ | Prisma | Shift handover, care plan CRUD |
| Appointments | ✅ | ✅ | Prisma | Availability calendar, SMS reminders |
| Admissions | ✅ | ✅ | Prisma | Room management, admit/discharge |
| Operating Room + WHO Checklist | ✅ | ✅ | Prisma | |
| Dialysis Center | ✅ | ✅ | Prisma | Session tracking, machine mgmt |
| Blood Bank | ✅ | ✅ | Prisma | Inventory, cross-match, donors |
| AI Clinical Support (LLM + rule-based) | ✅ | ✅ | — | Claude API; 30-rule fallback; `aiEngine` field |

### Finance & Insurance

| Module | Pages | API | DB | Notes |
|--------|-------|-----|----|-------|
| Billing (bills, payments, reconciliation) | ✅ | ✅ | Prisma | PDF export via jsPDF |
| Online Payments (PayMongo) | ✅ | ✅ | Prisma | GCash, Maya, card; simulation fallback |
| HMO (registrations, eligibility, claims) | ✅ | ✅ | Prisma | Maxicare OAuth2, Philam, Intellicare; per-HMO simulation |
| PhilHealth (CF4, case rates, eClaims) | ✅ | ✅ | Prisma | XML generation; eClaims REST; simulation fallback |
| Accounting / GL | ✅ | ✅ | Prisma | CoA, journal entries, trial balance, P&L, balance sheet |
| Analytics & BI | ✅ | ✅ | Prisma | Revenue, patient metrics, doctor performance |

### Operations & Compliance

| Module | Pages | API | DB | Notes |
|--------|-------|-----|----|-------|
| Asset Management + Depreciation | ✅ | ✅ | Prisma | Equipment tracking |
| DOH Reporting | ✅ | ✅ | Prisma | FHSIS, PIDSR reports |
| HIE / Interoperability | ✅ | ✅ | Prisma | FHIR R4 bundles, consent, referrals |
| Barcode / RFID | ✅ | ✅ | Prisma | Wristbands, med scanning, asset scan |
| Audit Log | ✅ | ✅ | Prisma | Tamper-evident trail |

### Platform & Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| Telemedicine (video, chat) | ✅ | WebRTC P2P + Socket.io signalling; Daily.co integration ready |
| SMS Notifications | ✅ | Semaphore HTTPS; SmsLog to DB; simulation fallback |
| Email Notifications | ✅ | Zero-dep SMTP client; password reset, appointment, telemedicine |
| Real-time Queue | ✅ | Socket.io push on add/call/complete/skip |
| Dynamic Branding | ✅ | White-label: name, subtitle, logo, primary color, sidebar color |
| RBAC + Role-filtered sidebar | ✅ | Guard component, 9 roles, per-route authorization |
| User Management | ✅ | Full CRUD, role assignment |
| Settings / Branding | ✅ | SystemConfig model, ColorPicker, logo upload, live preview |
| User Profile + Password Change | ✅ | Edit profile, change password, forgot/reset flow |
| PDF Export | ✅ | Bills, discharge summaries via jsPDF + autoTable |
| Role-specific Dashboards | ✅ | 7 role variants (Admin, Doctor, Nurse, Billing, Receptionist, Pharmacist, Lab) |
| Patient Portal (separate app) | ✅ | 6 pages: dashboard, appointments, bills, records, lab results, login |
| Help Center | ✅ | HelpDrawer (? button, 30 articles, search) + full HelpCenterPage (/help) |
| Error Boundary | ✅ | React class ErrorBoundary — shows error + stack instead of blank screen |
| Rate Limiting | ✅ | express-rate-limit: login 10/15min, forgot-pw 3/hr, reset 5/hr, change-pw 5/15min |
| Swagger / OpenAPI | ✅ | Full OpenAPI 3.0 spec at `/api/docs`; raw JSON at `/api/docs.json` |
| Jest Test Suite | ✅ | Response utils, JWT middleware, RBAC, AI rules engine, billing calculations |
| Docker Compose Stack | ✅ | 4-container stack; hot-reload volumes; auto-migration on API start |

---

## Database

- **ORM:** Prisma 5 (schema-push, no versioned migrations)
- **Models:** 50+ Prisma models across 9 functional domains
- **Enums:** 8 (UserRole, Gender, BloodType, ConsultationStatus, BillStatus, PaymentMethod, AdmissionStatus, RequisitionStatus)
- **Money fields:** `@db.Decimal(10,2)` throughout
- **Soft deletes:** `isActive` flag on patient, user, medication
- **Audit:** Separate `AuditLog` model for all write operations
- **JSON fields:** Used for flexible nursing/handover data and lab template results

---

## API Security

| Mechanism | Implementation |
|-----------|---------------|
| JWT verification | `authenticate` middleware on all protected routes |
| Role check | `authorize(...roles)` middleware, accepts multiple roles |
| Rate limiting | `express-rate-limit` per-route — 4 limiters on auth endpoints |
| Security headers | `helmet()` — CSP, HSTS, X-Frame-Options, etc. |
| CORS | `cors({ origin: CORS_ORIGIN })` — env-configured |
| Password hashing | `bcryptjs` cost factor 12 |

---

## Test Coverage

| Suite | File | Tests |
|-------|------|-------|
| Response utilities | `src/utils/response.test.ts` | successResponse, errorResponse, paginatedResponse |
| Auth middleware | `src/middleware/auth.test.ts` | authenticate (no token, bad format, invalid JWT, user not found, valid), authorize (no user, wrong role, correct role) |
| AI rules engine | `src/modules/ai/ai.rules.test.ts` | Symptom matching score, exact match, partial ≥50%, result ordering, max 5 results |
| Billing calculations | `src/modules/billing/billing.calculations.test.ts` | calculateBillTotal, calculateBalance (floor 0), PhilHealth 70/30, HMO deduction, getBillStatus |

Run: `cd apps/api && npm test`

---

## Integration Status

| Integration | Status | Notes |
|-------------|--------|-------|
| PayMongo | ✅ implemented | GCash/Maya links + card payment intents; simulation when key absent |
| Semaphore SMS | ✅ implemented | Real HTTPS POST; `SmsLog` to DB; simulation when key absent |
| Anthropic Claude | ✅ implemented | Diagnosis, drug interactions, vital narrative; rule-based fallback |
| PhilHealth eClaims | ✅ implemented | REST gateway; local XML generation + simulation fallback |
| Maxicare API | ✅ implemented | OAuth2 client credentials flow; simulation fallback |
| PhilamLife HMO | ✅ implemented | API key auth; simulation fallback |
| Intellicare HMO | ✅ implemented | API key auth; simulation fallback |
| Daily.co (video) | ⚠️ ready | Telemedicine works via P2P WebRTC; Daily.co key enables TURN + recording |
| SendGrid / SMTP | ✅ implemented | Any SMTP; zero-dependency client built-in; console log fallback |
| FHIR R4 (HIE) | ✅ implemented | Bundle builder in hie.controller.ts |

---

## Ports & URLs

| Service | Port | URL |
|---------|------|-----|
| API | 3001 | http://localhost:3001 |
| Swagger Docs | 3001 | http://localhost:3001/api/docs |
| Staff Portal | 5175 | http://localhost:5175 |
| Patient Portal | 5174 | http://localhost:5174 |
| PostgreSQL | 5432 | localhost:5432 (user: pibs, pass: pibs_secret, db: pibs_db) |

---

## Seed Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | SUPER_ADMIN |
| admin2 | pibs2024 | ADMIN |
| dr.santos | doctor123 | DOCTOR (Internal Medicine) |
| dr.reyes | doctor123 | DOCTOR (Pediatrics) |
| dr.cruz | doctor123 | DOCTOR (Surgery) |
| nurse1 | pibs2024 | NURSE |
| nurse2 | pibs2024 | NURSE |
| billing1 | pibs2024 | BILLING |
| receptionist1 | pibs2024 | RECEPTIONIST |
| pharmacist1 | pibs2024 | PHARMACIST |
| labtech1 | pibs2024 | LAB_TECH |
| radtech1 | pibs2024 | RADIOLOGY_TECH |

---

## Known Limitations / Future Work

| Item | Priority | Notes |
|------|----------|-------|
| Daily.co full integration | Medium | Wire DAILY_API_KEY to room creation API; currently uses P2P WebRTC |
| Production Docker images | Medium | Multi-stage builds with `vite build` + nginx for static serving |
| E2E test suite | Low | Playwright/Cypress for full user-flow testing |
| PhilHealth CF4 XML submission | Low | Generation works; live submission needs accredited facility credentials |
| Mobile app (patient) | Low | Patient portal is responsive web; native app not planned |

---

## Git

- **Repo:** `https://github.com/melvin-akino/hospital-system`
- **Branch:** `main`
- **Build session history:**
  - `2026-04-15` — Initial assessment baseline
  - `2026-04-17` — All JSON modules migrated to Prisma; telemedicine, SMS, payments, PhilHealth eClaims, HMO APIs, email, AI/LLM implemented
  - `2026-04-18` — Rate limiting, Swagger/OpenAPI, Jest tests, Help Center (HelpDrawer + HelpCenterPage)
  - `2026-04-22` — Docker Compose stack (4 containers), `.dockerignore`, Dockerfiles for all 3 apps
  - `2026-04-25` — ErrorBoundary added, missing `useBrandingStore` import fixed in Sidebar, `.ant-layout` CSS fixed, DB seeded
  - `2026-04-25 v2` — Department Charge system: DepartmentCharge model, ChargeRequest approval workflow, UserPermission model, BILLING_SUPERVISOR role, permission-aware sidebar, Dept Charges page, Charge Requests page, User Permissions drawer in User Management
