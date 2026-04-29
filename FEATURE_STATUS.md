# PIBS — Feature Status & Build Roadmap

> Last updated: 2026-04-28 (Session 5) — ALL SPRINTS COMPLETE ✅ | 295 unit tests passing
> System: iHIMS (Integrated Hospital Information Management System)

---

## Legend
| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented (backend + frontend) |
| 🔨 | In progress / being built |
| ⚠️ | Partial — backend exists, no UI (or vice versa) |
| ❌ | Not built |
| 🔴 P0 | Critical — revenue or patient safety at risk |
| 🟠 P1 | High — core clinical function blocked |
| 🟡 P2 | Medium — module incomplete |
| 🟢 P3 | Enhancement / polish |

---

## Sprint 1 — Revenue Flow (P0) `✅ COMPLETE — 2026-04-27`

| # | Item | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 1 | Admission auto-creates a bill (DRAFT) | 🔴 P0 | ✅ Done | Bill auto-created in same transaction; initial deposit recorded as Payment |
| 2 | Room charges post to patient bill | 🔴 P0 | ✅ Done | `POST /admissions/:id/post-room-charges` (idempotent); "Post Room Charges" button in Billing Detail page |
| 3 | Discharge finalizes bill (FINALIZED) | 🔴 P0 | ✅ Done | Discharge atomically: posts room charges, recalculates totals, sets bill → FINALIZED |
| 4 | Purchase Order full lifecycle (create → approve → receive → stock update) | 🔴 P0 | ✅ Done | New `PurchaseOrdersListPage` with approve/receive modal (batch + expiry capture); inventory auto-updated on receive |

---

## Sprint 2 — Clinical Documentation (P1) `✅ PARTIAL — 2026-04-27`

| # | Item | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 5 | Clinical Notes UI in EMR | 🟠 P1 | ✅ Done | `ClinicalNotesPanel` component in EMR Dashboard; timeline view; pin/edit/delete; all NoteTypes (Progress, Nursing, Assessment, etc.) |
| 6 | Prescriptions — API + UI | 🟠 P1 | ✅ Done | New `/prescriptions` module (API + routes); `PrescriptionsPanel` in EMR; printable Rx slip; mark dispensed; cancel |
| 7 | Discharge Summary structured form + print/PDF | 🟠 P1 | ✅ Done | `DischargeSummaryPage` at `/admissions/:id/discharge-summary`; printable; auto-opened after discharge; "Discharge Summary" button in Admitting drawer |

---

## Sprint 3 — Module Completeness (P2)

| # | Item | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 8  | Purchase Order list page + detail view + receive UI | 🟡 P2 | ✅ Done | `PurchaseOrdersListPage` with approve/receive modal; batch + expiry capture; inventory auto-updated |
| 9  | ICU — drip rate, IV fluid balance, ventilator, sedation (RASS), code status | 🟡 P2 | ✅ Done | `IcuAdmissionRecord` DB model; `ICUMonitorDrawer` with IV Drips tab, I&O Balance tab, Ventilator tab; Code Status + RASS per bed; drip rate/unit/concentration management |
| 10 | OB — partograph, fetal heart rate, delivery notes, APGAR scoring | 🟡 P2 | ✅ Done | `ObstetricRecord` DB model; `PartographDrawer` with cervical progress chart + FHR monitoring timeline; G/P/A, presentation, membranes; APGAR @ 1/5/10 min on delivery form |
| 11 | OR — surgery scheduling linked to admissions, surgeon/anesthesiologist assignment | 🟡 P2 | ✅ Done | `SurgeryFormPage` updated: admission search autocomplete (links surgery to admission), anesthesiology fields (type + name), surgical team fields (scrub/circulating nurse) |
| 12 | Lab — pending results work queue for lab technicians | 🟡 P2 | ✅ Done | `LabWorkQueuePage` at `/lab/work-queue`; STAT/URGENT/ROUTINE priority sort; TAT progress bar; batch Start; In Processing tab; Completed Today tab |
| 13 | Pharmacy charge-to-bill (depends on Sprint 1 #1 being complete) | 🟡 P2 | ✅ Unblocked | Sprint 1 #1 complete; Pharmacy POS Charge-to-Bill now has a bill to post to |

---

## Sprint 4 — Enhancements (P3) `✅ COMPLETE — 2026-04-27`

| # | Item | Priority | Status | Notes |
|---|------|----------|--------|-------|
| 14 | Discharge Summary PDF / printable letter | 🟢 P3 | ✅ Done | `DischargeSummaryPage` with `@media print` CSS; auto-redirect after discharge; linked from Admitting drawer |
| 15 | EMR — Active Problem List (chronic conditions) | 🟢 P3 | ✅ Done | `PatientProblem` DB model; `ActiveProblemListPanel` component; ACTIVE/CHRONIC/RESOLVED/INACTIVE status; ICD-10 code field; severity; "Problem List" tab in EMR Dashboard |
| 16 | Inventory — batch/lot tracking on PO receive | 🟢 P3 | ✅ Done | `InventoryBatch` DB model; batch record created on every PO receive; `BatchesDrawer` in Inventory Dashboard with per-batch quantity progress, expiry tags, quarantine/recall actions (stock auto-decremented); `GET /inventory/:itemId/batches` + `PUT /inventory/batches/:batchId` API |
| 17 | Billing — SOA (Statement of Account) printable | 🟢 P3 | ✅ Done | `BillingSOAPage` at `/billing/:id/soa`; categorized by service type (Room, Lab, OR, Pharmacy, etc.); payment history; deductions; signature lines; "Print SOA" button in billing detail |
| 18 | Room Management — housekeeping status | 🟢 P3 | ✅ Done | `housekeepingStatus` field on Room (CLEAN/CLEANING/DIRTY/MAINTENANCE); `PUT /rooms/:id/housekeeping` endpoint; popover-based status update in Rooms Dashboard; filter by HK status; last cleaned timestamp |
| 19 | Doctor Workspace — pending labs, Rx-to-sign, co-sign notes | 🟢 P3 | ✅ Done | Pending Lab Orders widget with STAT/URGENT priority; Active Prescriptions widget with quick Dispensed action; click-through to Lab Work Queue |
| 20 | Patient Portal | 🟢 P3 | ✅ Done | Login via PatientNo + DOB (separate JWT); `PortalLayout` with teal sidebar; Dashboard, Appointments (+ book), Lab Results (abnormal flag), Prescriptions, Bills (payment progress), Profile; `/portal/*` routes isolated from staff UI |

---

## Fully Implemented Modules ✅

| Module | Key Pages | Notes |
|--------|-----------|-------|
| Patient Management | List, Form, Detail, bulk import | Full CRUD + document upload |
| Admissions / Bed Mgmt | Admitting wizard, Room board, Discharge form | Multi-step intake, consent, room assignment |
| Billing | List, Form, Detail, Payments, Ordered Services queue | Payment recording, finalization, cancellation |
| Pharmacy POS | POS Terminal, Sales & Z-Report | GL auto-posting, receipt, void |
| Pharmacy Inventory | Dashboard, Medications, Stock Alerts | Low stock + expiry alerts |
| Pharmacy Suppliers | List, Add/Edit, Detail drawer | Full CRUD, soft-delete |
| Laboratory | Order Form, Requisition List, Result Entry, Result View | Lab + Radiology workflow |
| Nursing Station | Dashboard, Vitals Entry, Care Plans, Shift Handover | Task management included |
| Operating Room | Dashboard, Schedule, Surgery Form, WHO Checklist | No demo data yet |
| HMO Processing | Registration, Claims, Eligibility, Direct Billing | Full HMO workflow |
| PhilHealth | Claims, CF4 generation, eClaims submission | Case rates reference |
| Accounting / GL | Chart of Accounts, Journal Entry, Trial Balance, P&L, Balance Sheet | GL auto-posted by Pharmacy POS |
| Analytics | KPI Dashboard, Revenue, Patient Metrics, Doctor Performance | Department analytics included |
| Queue Management | Display board, Queue operations | Per-department with analytics |
| Appointments | Calendar, Booking, Availability | Doctor availability management |
| Blood Bank | Inventory, Donors, Transfusions | Expiry alerts |
| Dialysis Center | Schedule, Sessions, Machines | Active session tracking |
| Asset Management | Inventory, Maintenance log, Depreciation | Full asset lifecycle |
| Barcode / RFID | Scanner, Patient wristbands | Scan log |
| Telemedicine | Schedule, Video Consultation, Notes | Full session lifecycle |
| AI Clinical Support | Diagnosis, Drug interactions, Readmission risk, Vitals analysis | Claude API integration |
| SMS Notifications | Templates, Send, Bulk, Appointment reminders | Delivery logs |
| Online Payments | GCash, Maya, Card | Webhook handler, transaction history |
| HIE / Interoperability | FHIR bundle, Consent, Record sharing, Referrals | Audit trail |
| Department Charges | Charge requests, Approvals, Ordered services billing | Bulk billing |
| Consultations | List, Form, Detail, Billing link | Completion workflow |
| Doctors & Services | Directory, Profiles, Service catalog | Department assignment |
| Settings & Admin | System settings, User management, Audit log | RBAC |
| ICU Dashboard | Patient board, Vitals | Basic monitoring only (see Sprint 3 #9) |
| OB Dashboard | Delivery board | Basic tracking only (see Sprint 3 #10) |

---

## Unit Test Coverage (Session 5)

| Test File | Suite | Tests | Status |
|-----------|-------|-------|--------|
| `billing/billing.calculations.test.ts` | Billing calculations | 20 | ✅ Pass |
| `ai/ai.rules.test.ts` | AI symptom & drug interaction rules | 20 | ✅ Pass |
| `utils/response.test.ts` | API response helpers | 16 | ✅ Pass |
| `middleware/auth.test.ts` | Auth middleware (existing) | — | ✅ Pass |
| `auth/auth.middleware.test.ts` | JWT parsing, RBAC, portal payload | 25 | ✅ Pass |
| `patient-portal/patient-portal.test.ts` | Portal login DOB matching, appointment filtering, billing | 28 | ✅ Pass |
| `admissions/admissions.calculations.test.ts` | Room charges, LOS, consents, discounts | 30 | ✅ Pass |
| `pharmacy/pharmacy.inventory.test.ts` | Batch status, FIFO allocation, expiry, reorder | 35 | ✅ Pass |
| `lab/lab.tat.test.ts` | TAT targets, TAT breach detection, templates | 30 | ✅ Pass |
| `prescriptions/prescriptions.logic.test.ts` | Rx validation, status transitions, drug interaction severity | 35 | ✅ Pass |
| `queue/queue.logic.test.ts` | Ticket format, priority, status transitions, sorting | 28 | ✅ Pass |
| `nurses/housekeeping.logic.test.ts` | Housekeeping states, ICU I&O balance, APGAR, gestational age | 48 | ✅ Pass |
| **TOTAL** | **12 suites** | **295** | **✅ All pass** |

---

## Known Bugs Fixed

| Date | Bug | Fix |
|------|-----|-----|
| 2026-04-27 | Pharmacy POS item search returned all items regardless of query | Backend `getInventory` read `q` param but POS sent `search`; fixed to accept both + added generic/brand name to search filter |
| 2026-04-27 | Login broken inside Docker | `VITE_API_PROXY_TARGET` defaulted to `localhost`; fixed to point to `http://pibs_api_demo:3001` |
| 2026-04-27 | ICU Dashboard vitals 404 | Route was `/vitals`; corrected to `/patients/:id/vital-signs` |
| 2026-04-27 | OrderedServices billing page JSX render error | Arrow function returned object instead of JSX; fixed column render pattern |
| 2026-04-27 | Discharge always navigated to `/admissions/list` | Now navigates to `/admissions/:id/discharge-summary` so summary is shown immediately after discharge |
| 2026-04-27 | Lab Work Queue used wrong API prefix `/lab/requisitions` | Fixed to `/lab-requisitions` to match actual API route |
| 2026-04-27 | InventoryItem single batchNo/expiryDate overwritten on each PO receive | Added `InventoryBatch` model; receive now creates a new batch record while still updating the parent item's convenience fields |
| 2026-04-28 | Patient Portal login returned 401 ("No token provided") | Route ordering bug in `routes/index.ts` — `onlinePaymentRoutes` middleware blocked portal login; fixed by mounting `patientPortalRoutes` before `onlinePaymentRoutes` |
| 2026-04-28 | Patient Portal Appointments page logged user out | Three root causes: (1) `PortalAppointmentsPage` called `/doctors` (staff endpoint) with portalApi — fixed by adding public `GET /patient-portal/doctors` endpoint; (2) portalApi interceptor logged out on any 401 — fixed to check URL includes `/patient-portal/`; (3) Doctor model uses `specialty` not `specialization` — fixed field name |
| 2026-04-28 | Vite port mapping wrong in Docker (`-p 5175:5173`) | `vite.config.ts` sets `port: 5175`; Docker must use `-p 5175:5175` |

---

## Architecture Notes

- **API**: `ts-node-dev` hot-reload, Prisma ORM, Express — no compile step needed
- **Frontend**: Vite + React + Ant Design, lazy-loaded routes
- **DB**: PostgreSQL (`pibs_db`), user `pibs`, password `pibs_secret`
- **Containers**: `pibs_api_demo` (port 3001), `pibs_web_demo` (port 5175), `pibs_postgres_demo` (port 5432) on network `pibs_default`
- **GL Accounts**: 1000 Cash, 1100 AR, 1120 HMO Receivable, 1130 PhilHealth Receivable, 1210 Pharmacy Inventory, 4400 Pharmacy Revenue, 5200 COGS
- **Demo credentials**: admin/admin123 (Super Admin), pharmacist1/pibs2024 (Pharmacist), er.doctor1/pibs2024, nurse1/pibs2024

---

*This document is updated as features are built. Check `Status` column for current state.*
