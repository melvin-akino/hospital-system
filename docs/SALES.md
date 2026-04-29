# iHIMS — Sales & Project Overview

**intelligent Hospital Information System**  
Full-stack hospital management platform built for Philippine healthcare facilities

---

## One-Line Pitch

> A production-ready, white-label hospital information system covering every department — clinical, billing, pharmacy, insurance, and administration — in a single deployable codebase.

---

## What Was Built

A complete **Hospital Information System (HIS)** from the ground up. This is not a template or a partially-implemented demo — every module has a working API, a connected database, and a fully functional React UI.

**By the numbers:**

| Metric | Count |
|--------|-------|
| Feature modules | 30+ |
| API endpoints | 200+ |
| React pages | 85 |
| Database models | 50+ |
| React Query hooks | 30 |
| User roles | 9 |
| Lines of code (approx.) | 60,000+ |

---

## Core Feature Modules

### 🏥 Clinical Operations
- **Patient Management** — registration, demographics, bulk Excel import, patient number generation
- **Consultations** — doctor-patient encounters, ICD-10 coding, e-prescriptions
- **Electronic Medical Records (EMR)** — vitals timeline, medical history, charts, allergies, medications
- **Nursing** — care plans, vitals monitoring, shift handover, nursing notes
- **Appointments** — scheduling, availability calendar, doctor slots, SMS reminders
- **Queue Management** — real-time patient queue via WebSocket (Socket.io); live display board
- **Admissions** — bed management, room assignment, admission/discharge workflows
- **Operating Room** — surgery scheduling, WHO surgical safety checklist
- **Dialysis Center** — treatment session tracking, machine management, patient schedules
- **Blood Bank** — blood unit inventory, cross-matching, donor database, transfusion requests

### 💊 Pharmacy & Laboratory
- **Pharmacy** — medication catalog, inventory management, dispensing, purchase orders, stock alerts
- **Laboratory** — requisitions, 26 test templates, results entry and viewing
- **Radiology** — order management, results attachment

### 💰 Finance & Insurance
- **Billing** — bill generation, payment processing, balance tracking, PDF export
- **Online Payments** — GCash, Maya, and credit card via PayMongo; automatic receipt generation
- **HMO Direct Billing** — eligibility verification, authorization requests, claim submission (Maxicare, Philam, Intellicare)
- **PhilHealth** — CF4 claim generation, case rates lookup, eClaims API integration
- **Accounting / GL** — chart of accounts, journal entries, trial balance, income statement, balance sheet

### 📊 Analytics & Reporting
- **Analytics Dashboard** — revenue trends, patient volume, doctor performance metrics
- **DOH Reporting** — FHSIS and PIDSR epidemiological report generation
- **Asset Management** — equipment inventory, maintenance scheduling, depreciation reports
- **Audit Log** — tamper-evident record of every system action with user, timestamp, and IP

### 🔗 Integrations & Advanced Features
- **AI Clinical Support** — Claude LLM-powered diagnosis suggestions, drug interaction checking, vital sign narrative generation; built-in 30-rule fallback engine for offline use
- **Telemedicine** — video consultations via WebRTC (peer-to-peer); Daily.co integration for TURN relay, recording, and analytics; real-time chat relay via Socket.io
- **SMS Notifications** — appointment reminders, admission alerts via Semaphore; template management
- **Email Notifications** — password reset, appointment confirmations, telemedicine booking with room link
- **HIE / Interoperability** — Health Information Exchange, FHIR R4 bundle generation, patient referrals, consent management
- **Barcode / RFID** — patient wristband generation, medication scanning, asset tracking

### 👤 Platform
- **Patient Portal** (separate app) — patient-facing: view appointments, bills, medical records, lab results
- **User Management** — 9 roles with fine-grained route and UI-level permissions
- **White-Label Branding** — system name, tagline, logo, primary color, sidebar color; configurable per client from the admin UI
- **Settings** — full system configuration panel
- **Help Center** — contextual help drawer (? button on every page) + full searchable Help Center with workflows, FAQ, and keyboard shortcuts

---

## Technical Highlights

### Architecture
- **Monorepo** (npm workspaces + Turborepo): API, staff portal, patient portal, and shared types in one repository
- **Docker Compose** — one command starts all 4 services (PostgreSQL, API, staff portal, patient portal)
- **Hot-reload** — source file changes reflect in the browser instantly in development

### API Design
- RESTful Express.js API with 200+ endpoints
- **OpenAPI 3.0 (Swagger UI)** — full interactive documentation at `/api/docs`
- Consistent response envelope: `{ success, message, data, total, page }` across all endpoints
- **Rate limiting** on all authentication endpoints (brute-force protection)

### Security
- JWT authentication with 7-day expiry
- bcryptjs password hashing (cost factor 12)
- Per-role access control enforced at both API route and React route level
- Helmet.js security headers
- Full audit trail of all write operations

### Simulation Mode
Every external integration works **without real API keys** — the system degrades gracefully:
- No PayMongo key → payments are simulated, auto-confirmed after 30s
- No Semaphore key → SMS logged to console and database
- No Claude key → built-in diagnosis rule engine activates
- No PhilHealth key → claim numbers generated locally, auto-approved
- No HMO key → eligibility returns simulated approval

This means the system is fully demonstrable without any paid credentials.

### Testing
- Jest + ts-jest test suite covering: response utilities, JWT middleware, RBAC, AI rules engine, billing calculations
- TypeScript strict mode throughout

---

## Deployment

- **Development:** `docker compose up -d` — ready in under 2 minutes
- **Production-ready path:** Swap Vite dev server for `vite build` + nginx; use managed PostgreSQL (AWS RDS, Supabase, etc.); configure HTTPS via nginx/Caddy; set live API keys
- **White-label deployment:** Branding updated from the admin UI — no code changes required per client

---

## Third-Party API Recommendations

All integrations have free or low-cost entry points suitable for pilot/demo:

| Service | Purpose | Free Option | Cost After Free |
|---------|---------|-------------|-----------------|
| **PayMongo** | GCash, Maya, card payments | Full sandbox, no credit card | 3.5% + ₱15/transaction |
| **Anthropic Claude** | AI clinical support | ~$5 free credits, no card | Pay-per-token (~$3–15/million tokens) |
| **Daily.co** | Telemedicine video rooms | 10,000 participant-minutes/month free | $0.004/minute after |
| **Semaphore SMS** | Patient SMS notifications | No free tier | ₱0.50/SMS, credits valid 12 months |
| **SendGrid** | Email notifications | 100 emails/day free, no card | $19.95/month for 40K emails |

---

## Roles Supported

| Role | Primary Use |
|------|------------|
| Super Admin | Full system access, branding, user management |
| Admin | Hospital-wide operations, no system config |
| Doctor | EMR, consultations, lab orders, AI support, telemedicine |
| Nurse | Care plans, vitals, admissions, shift handover |
| Receptionist | Appointments, patient registration, queue |
| Billing | Bills, payments, HMO claims, PhilHealth |
| Pharmacist | Inventory, dispensing |
| Lab Tech | Requisitions, results entry |
| Radiology Tech | Radiology orders, results |

---

## Stack Summary (for technical clients)

```
Backend:   Node.js 20 · Express.js · TypeScript · Prisma ORM · PostgreSQL 16
Frontend:  React 18 · Ant Design 5 · Vite 5 · Zustand · TanStack Query v5
Real-time: Socket.io 4 (queue, telemedicine)
Auth:      JWT · bcryptjs · RBAC · express-rate-limit
Docs:      Swagger UI (OpenAPI 3.0)
Tests:     Jest 29 · ts-jest
Deploy:    Docker Compose (4 containers)
Monorepo:  npm workspaces · Turborepo
```

---

## Freelancer.com Listing

### Title
**Full-Stack Hospital Information System (HIS) — Node.js, React, PostgreSQL, Docker**

### Short Description
Delivered a production-ready, white-label Hospital Information System covering 30+ modules including EMR, billing, pharmacy, AI clinical support, telemedicine, PhilHealth eClaims, HMO direct billing, online payments, and a patient-facing portal — all in a single Dockerized monorepo.

### Full Description
Built a complete intelligent Hospital Information System (iHIMS) from the ground up using a modern TypeScript stack. The system is designed specifically for Philippine healthcare facilities and handles every department from front desk to finance.

**What was delivered:**
- 30+ fully implemented feature modules with UI, API, and database
- 9 user roles with fine-grained access control at both API and UI level
- Full white-labeling: clients can customize name, logo, and colors from the admin panel
- AI-powered clinical support (Claude API) with built-in rule-based fallback
- Real-time queue management and telemedicine video via WebSocket
- Philippine-specific integrations: PayMongo, Semaphore SMS, PhilHealth eClaims, HMO APIs (Maxicare, Philam, Intellicare)
- Interactive API documentation (Swagger/OpenAPI 3.0)
- Docker Compose for one-command deployment
- Patient-facing portal (separate app) for self-service appointment and billing

**All external integrations degrade gracefully** — the system runs fully without any paid API keys, using simulation mode for payments, SMS, AI, and insurance APIs.

### Tags
`nodejs` `reactjs` `typescript` `postgresql` `prisma` `docker` `hospital-management` `healthcare` `emr` `billing` `philhealth` `hmo` `paymongo` `ant-design` `rest-api` `socket.io` `webrtc` `swagger`

### Skills Used
Node.js, Express.js, TypeScript, React.js, PostgreSQL, Prisma ORM, Docker, Docker Compose, Ant Design, Vite, Zustand, TanStack Query, Socket.io, WebRTC, JWT Authentication, REST API Design, OpenAPI/Swagger, Jest, Turborepo, npm Workspaces

### Industry
Healthcare / Medical IT / Hospital Information Systems

---

## Competitive Advantages

1. **Complete out of the box** — not a scaffold or starter kit; every module has working UI, API, and database
2. **Simulation mode** — fully demonstrable to clients without any paid API subscriptions
3. **Philippine-specific** — PhilHealth CF4/eClaims, HMO direct billing (Maxicare, Philam, Intellicare), PayMongo, Semaphore SMS baked in
4. **White-label ready** — one codebase, unlimited clients with per-client branding from the admin UI
5. **One-command deployment** — `docker compose up -d` and the full stack is live
6. **Modern stack** — TypeScript throughout, React 18, Prisma 5, tested, documented

---

*&copy; 2026 iHIMS — Proprietary. All rights reserved.*
