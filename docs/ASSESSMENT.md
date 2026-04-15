# iHIMS System Assessment Baseline
**Date:** 2026-04-15  
**Assessed by:** Claude Code  
**Purpose:** Development baseline — do not re-assess unless major phase is added

---

## System Overview
intelligent Hospital Information System (iHIMS) — full hospital management system  
**Stack:** NestJS (API, port 3001) · Vite/React (Web, port 5175) · Vite/React (Patient Portal, port 5174) · PostgreSQL · Prisma ORM

**Monorepo:** npm workspaces + Turborepo  
**Node requirement:** v20+ (fnm at `C:\Users\Windows\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\fnm\node-versions\v20.20.2\installation\`)

---

## What Is Fully Built ✅

| Module | Pages | API | DB | Notes |
|--------|-------|-----|----|-------|
| Auth (login/logout/JWT) | ✅ | ✅ | Prisma | Sessions table |
| Patients (CRUD, bulk import) | ✅ | ✅ | Prisma | Excel import via XLSX |
| Doctors | ✅ | ✅ | Prisma | |
| Departments | ✅ | ✅ | Prisma | |
| Services / Service Catalog | ✅ | ✅ | Prisma | |
| Consultations + Prescriptions | ✅ | ✅ | Prisma | |
| EMR (vitals, charts, history) | ✅ | ✅ | Prisma | |
| Lab Requisitions & Results | ✅ | ✅ | Prisma | 26 hardcoded test templates |
| Radiology Orders | ✅ | ✅ | Prisma | |
| Pharmacy & Inventory | ✅ | ✅ | Prisma | |
| Queue Management | ✅ | ✅ | Prisma | No real-time push yet |
| HMO (registrations, claims, eligibility) | ✅ | ✅ | Prisma | Mock eligibility check |
| PhilHealth (claims, case rates, CF4) | ✅ | ✅ | Prisma | XML gen only, no API submit |
| Accounting / GL | ✅ | ✅ | Prisma | CoA, journal entries, statements |
| Analytics & BI | ✅ | ✅ | Prisma | Revenue, patient metrics, doctor perf |
| Rooms & Admissions | ✅ | ✅ | Prisma | |
| Operating Room + WHO Checklist | ✅ | ✅ | Prisma | |
| Blood Bank | ✅ | ✅ | Prisma | |
| Asset Management + Depreciation | ✅ | ✅ | Prisma | |
| Dialysis Center | ✅ | ✅ | Prisma | |
| Nursing (care plans, vitals, handover) | ✅ | ✅ | Prisma | Migrated from JSON in this session |
| Appointments | ✅ | ✅ | Prisma | |
| AI Clinical Support | ✅ | ✅ | Rule-based | 50+ hardcoded diagnosis rules, no ML |
| User Management | ✅ | ✅ | Prisma | |
| Audit Log | ✅ | ✅ | Prisma | |
| Settings Page | ✅ | ✅ | Prisma | SystemConfig model, ColorPicker, logo upload, live preview |
| Dynamic Branding | ✅ | ✅ | Prisma | White-label: name, logo, primary color, sidebar color |
| PDF Export (bills + discharge) | ✅ | — | — | jsPDF + autoTable |
| RBAC + Role-filtered sidebar | ✅ | ✅ | — | Guard component + Sidebar filtering |
| Patient Portal (separate app) | ✅ | ✅ | Prisma | 6 pages, appointments/bills/records |
| User Profile + Password Reset | ✅ | ✅ | Prisma | Profile edit, change password, forgot/reset flow |
| Real SMS (Semaphore) | ✅ | ✅ | Prisma | Real HTTPS call, simulation fallback, SmsLog to DB |
| Role-specific Dashboards | ✅ | — | — | 7 role variants with widgets |
| Contextual Help System | ✅ | — | — | HelpDrawer with 20+ articles, ? button in header |
| Real-time Queue (Socket.io) | ✅ | ✅ | Prisma | WebSocket push on add/call/complete/skip; Live badge |
| PayMongo Payment Gateway | ✅ | ✅ | Prisma | GCash/Maya links + card intents; simulation fallback |

---

## JSON Storage Modules — ALL MIGRATED ✅

All 6 previously flat-file modules now use Prisma/PostgreSQL:

| Module | Prisma Models | Notes |
|--------|--------------|-------|
| HIE | HieConsent, HieRequest, HieReferral, HieAuditEntry | FHIR R4 bundle preserved |
| DOH Reporting | DohSubmissionLog | FHSIS + PIDSR reports from Prisma |
| Barcode / RFID | BarcodeScan | Scan log capped at 100 via DB query |
| SMS | SmsTemplate, SmsLog | Templates seeded from DB on startup |
| Telemedicine | TelemedicineSession | roomCode @unique collision retry |
| Online Payments | PaymentIntent | Decimal amount; PayMongo or simulation |

---

## Stub / Missing Features ❌

### 🟡 Medium Priority — Medium Effort
| Gap | Description |
|-----|-------------|
| PhilHealth eClaims API submission | CF4 XML generated but never submitted to PhilHealth |
| HMO Direct Billing API | Eligibility check is local mock, not real HMO API |

### 🟡 Medium Priority — Large Effort
| Gap | Description |
|-----|-------------|
| Real Telemedicine Video (WebRTC) | VideoConsultationPage has media refs but no signaling server |

### 🟢 Low Priority
| Gap | Description |
|-----|-------------|
| AI upgrade to LLM | Currently rule-based; could integrate OpenAI/Claude API |
| Email notifications | No email sending anywhere in the system |

---

## Database
- **ORM:** Prisma (schema-first, `db push` — no versioned migrations)
- **Models:** 47 Prisma models across 9 functional domains
- **Enums:** 8 (UserRole, Gender, BloodType, ConsultationStatus, BillStatus, PaymentMethod, AdmissionStatus, RequisitionStatus)
- **Key:** All money fields use `@db.Decimal(10,2)` · Soft deletes via `isActive` flag · JSON fields for flexible nursing/handover data

---

## Credentials (Dev/Seed)
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | ADMIN |
| dr.santos | doctor123 | DOCTOR |
| dr.reyes | doctor123 | DOCTOR |
| dr.cruz | doctor123 | DOCTOR |
| staff | pibs2024 | RECEPTIONIST |
| nurse1 | pibs2024 | NURSE |
| billing1 | pibs2024 | BILLING |
| pharmacist1 | pibs2024 | PHARMACIST |

---

## Server Ports
| Service | Port | Command |
|---------|------|---------|
| API (Express/NestJS) | 3001 | `npm run dev` in apps/api |
| Web App | 5175 | `npm run dev` in apps/web |
| Patient Portal | 5174 | `npm run dev` in apps/patient-portal |

> Note: Port 5173 is occupied by Docker (PID 1752) — cannot be killed

---

## Git
- **Repo:** `https://github.com/melvin-akino/hospital-system`  
- **Branch:** `main`  
- **Last assessed commit:** `30c2e9a` (feat: filter sidebar navigation by user role)
