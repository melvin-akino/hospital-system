import React, { useState, useMemo } from 'react';
import {
  Drawer, Typography, Collapse, Tag, Space, Divider, Input, Button, Empty,
} from 'antd';
import {
  QuestionCircleOutlined, BookOutlined, InfoCircleOutlined,
  BulbOutlined, WarningOutlined, SearchOutlined, ReadOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

export interface HelpArticle {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
  warnings?: string[];
  roles?: string[];
  category?: string;
}

// ── Complete help content map — keyed by route prefix ────────────────────────
export const HELP_CONTENT: Record<string, HelpArticle> = {
  '/dashboard': {
    title: 'Dashboard',
    category: 'Navigation',
    description:
      'The Dashboard gives you a real-time overview of your work area. Widgets adapt to your role automatically.',
    steps: [
      'Review KPI cards at the top for at-a-glance numbers (patients today, revenue, beds available, etc.).',
      'Check tables below for actionable items — pending consultations, overdue bills, low stock alerts.',
      'Click any row to navigate directly to the full detail page.',
    ],
    tips: [
      'Admins see a hospital-wide view; clinical staff see their own schedule.',
      'Data refreshes automatically each time you navigate back to the dashboard.',
      'Role-based widgets: Doctors see their queue; Billing sees unpaid bills.',
    ],
    roles: ['All roles'],
  },
  '/patients': {
    title: 'Patient Management',
    category: 'Clinical',
    description: 'Search, register, update, and manage patient demographic records.',
    steps: [
      'Use the search bar to find patients by name, patient number, or phone number.',
      'Click "New Patient" to open the registration form.',
      'Fill in demographics, contact details, blood type, PhilHealth number, and HMO info.',
      'Click a patient row to view their full profile, medical history, and documents.',
      'Use the Excel Import button to bulk-upload hundreds of patients at once.',
    ],
    tips: [
      'Patient numbers are auto-generated in format P-YYYY-XXXXX.',
      'PWD and Senior Citizen flags automatically apply 20% discounts in billing.',
      'You can upload patient ID photos and insurance cards from the patient detail page.',
      'The patient search is also accessible from consultations, billing, and lab order forms.',
    ],
    warnings: [
      'Deleting a patient is permanent. Use the Deactivate toggle instead to preserve records.',
    ],
    roles: ['Admin', 'Doctor', 'Nurse', 'Receptionist'],
  },
  '/consultations': {
    title: 'Consultations',
    category: 'Clinical',
    description: 'Create and manage doctor–patient consultations and outpatient visits.',
    steps: [
      'Click "New Consultation" and select the patient and attending doctor.',
      'Set the scheduled date/time and enter the Chief Complaint.',
      'Record SOAP notes: Subjective, Objective, Assessment, and Plan.',
      'Add ICD-10 diagnosis codes — these flow automatically to billing and PhilHealth claims.',
      'Add prescriptions directly from the consultation form.',
      'Set status to "Completed" when the encounter is done.',
    ],
    tips: [
      'Completed consultations auto-populate billing line items when a bill is created.',
      'Use the ICD-10 search box — type a keyword and it searches the full code list.',
      'Prescriptions added here notify the pharmacy module automatically.',
    ],
    roles: ['Doctor', 'Nurse', 'Receptionist'],
  },
  '/emr': {
    title: 'Electronic Medical Records (EMR)',
    category: 'Clinical',
    description: 'Complete longitudinal patient health record — vitals, consultations, labs, and history.',
    steps: [
      'Access a patient\'s EMR from their Patient Detail page → "View EMR" tab.',
      'Review the vital signs chart to see trends across visits.',
      'See all past consultations, prescriptions, lab results, and imaging reports.',
      'Allergy and medication history are prominently displayed at the top.',
    ],
    tips: [
      'The EMR is read-only here; data is entered from the source module (consultations, lab, nursing).',
      'Print the EMR summary from the Download button for referral letters.',
    ],
    roles: ['Doctor', 'Nurse', 'Admin'],
  },
  '/lab': {
    title: 'Laboratory & Radiology',
    category: 'Clinical',
    description: 'Order lab tests and imaging, enter results, and view reports.',
    steps: [
      'Go to Lab Requisitions → "New Order" to request tests for a patient.',
      'Select from 26+ standard test templates (CBC, BMP, LFT, UA, etc.) or type custom tests.',
      'Set urgency: Routine, Urgent, or STAT.',
      'Lab Technicians enter results via "Lab Results → Enter Results".',
      'Results appear in the patient\'s EMR immediately upon saving.',
      'For imaging, use "Radiology Orders" to request X-ray, CT, MRI, ultrasound, etc.',
    ],
    tips: [
      'Abnormal results are automatically flagged with H (High) or L (Low) indicators.',
      'Reference ranges are pre-configured per test template but can be overridden.',
      'STAT orders trigger an alert badge on the Lab Tech dashboard.',
    ],
    roles: ['Doctor', 'Nurse', 'Lab Tech', 'Radiology Tech'],
  },
  '/pharmacy': {
    title: 'Pharmacy & Inventory',
    category: 'Pharmacy',
    description: 'Manage the medication catalog, track stock levels, and process purchase orders.',
    steps: [
      'Check "Stock Alerts" daily — items at or below minimum stock appear here.',
      'Go to Inventory to view real-time stock quantities, batch numbers, and expiry dates.',
      'Use "Purchase Orders" to request restocking from registered suppliers.',
      'Dispense medications against a doctor\'s prescription from the Dispensing module.',
      'Update received stock when a purchase order is fulfilled.',
    ],
    tips: [
      'Set minimum stock levels per item to get automatic reorder alerts.',
      'FEFO dispensing (First Expired, First Out) is enforced by expiry date sort.',
      'Controlled substances are tracked separately with signature audit.',
    ],
    warnings: [
      'Controlled substances require supervisor countersignature for dispensing.',
      'Never dispense against a cancelled or already-dispensed prescription.',
    ],
    roles: ['Pharmacist', 'Admin'],
  },
  '/billing': {
    title: 'Billing',
    category: 'Finance',
    description: 'Create patient bills, apply insurance deductions, and record payments.',
    steps: [
      'Click "New Bill" and select the patient.',
      'Add line items: services, lab tests, medications, room charges, and professional fees.',
      'Apply discounts: Senior Citizen (20%), PWD (20%), or custom percentage.',
      'Attach PhilHealth or HMO coverage to auto-calculate the insurance deduction.',
      'Click "Record Payment" and select the payment method (Cash, GCash, Maya, Card, etc.).',
      'Download the billing statement PDF using the Download button.',
    ],
    tips: [
      'A single bill can accumulate multiple partial payments.',
      'PhilHealth case rates are auto-applied when you link an approved claim.',
      'Online payment links (GCash/Maya) are generated from the bill detail page.',
    ],
    warnings: [
      'Once a bill is marked PAID, it cannot be edited. Cancel and recreate if corrections are needed.',
    ],
    roles: ['Billing', 'Admin'],
  },
  '/queue': {
    title: 'Queue Management',
    category: 'Operations',
    description: 'Manage the real-time outpatient queue and waiting room display.',
    steps: [
      'Go to Queue Management to see today\'s queue for each department.',
      'Click "Add to Queue" to register a patient in the waiting list.',
      'Set priority: Normal, Urgent, or Emergency.',
      'Click "Call" to summon the next patient — the display board updates instantly.',
      'Mark "Complete" or "Skip" as patients are seen.',
    ],
    tips: [
      'The Queue Display page is designed for a waiting room TV screen (full screen).',
      'Real-time updates use WebSocket — no page refresh needed.',
      'Emergency and Urgent patients are automatically sorted to the front.',
    ],
    roles: ['Receptionist', 'Nurse', 'Doctor', 'Admin'],
  },
  '/appointments': {
    title: 'Appointments',
    category: 'Operations',
    description: 'Schedule and manage outpatient doctor appointments.',
    steps: [
      'Click "Book Appointment" and select the patient, doctor, date, and time.',
      'Check "Doctor Availability" to see which slots are open.',
      'Confirmation emails and SMS reminders are sent to the patient automatically.',
      'On the day of the appointment, convert it to a Consultation from the appointment detail.',
    ],
    tips: [
      'Appointments can recur — use the recurring booking option for follow-ups.',
      'SMS reminders are sent 24 hours before the appointment if Semaphore is configured.',
    ],
    roles: ['Receptionist', 'Doctor', 'Nurse', 'Admin'],
  },
  '/admissions': {
    title: 'Rooms & Admissions',
    category: 'Clinical',
    description: 'Manage inpatient admissions, room assignments, and discharges.',
    steps: [
      'Go to Room Status to see available beds by room type and department.',
      'Click "Admit Patient" to open the admission form — assign a room and admitting doctor.',
      'Monitor all admitted patients from the Admissions list.',
      'Record daily nursing notes and vital signs from the Nursing module.',
      'When ready, click "Discharge" to complete the stay and download the Discharge Summary PDF.',
    ],
    tips: [
      'Daily room charges are automatically added to the patient\'s open bill.',
      'Patients can be transferred between rooms without creating a new admission.',
    ],
    roles: ['Doctor', 'Nurse', 'Receptionist', 'Admin'],
  },
  '/nurses': {
    title: 'Nursing Station',
    category: 'Clinical',
    description: 'Nurse dashboard for monitoring patients, recording vitals, and managing care plans.',
    steps: [
      'The Nursing Dashboard shows all currently admitted patients for your ward.',
      'Click "Record Vitals" to log temperature, BP, heart rate, respiratory rate, and SpO2.',
      'Open "Care Plans" to view and update nursing diagnoses, goals, and interventions.',
      'Use "Shift Handover" at the end of your shift to document a summary for the incoming team.',
    ],
    tips: [
      'Vital signs are automatically linked to the patient\'s EMR on save.',
      'Abnormal vitals are flagged in red on the patient list.',
      'Care plan templates are available to speed up documentation.',
    ],
    roles: ['Nurse', 'Doctor'],
  },
  '/hmo': {
    title: 'HMO Processing',
    category: 'Finance',
    description: 'Manage HMO member registrations, run eligibility checks, and process claims.',
    steps: [
      'Register the patient\'s HMO membership under HMO → Registrations (card number, validity dates).',
      'Before rendering services, run an Eligibility Check to verify active coverage.',
      'After services, create an HMO Claim and attach the patient\'s bill.',
      'Submit the claim to the HMO and track approval status.',
      'Once approved, post the HMO payment against the patient\'s bill.',
    ],
    tips: [
      'Eligibility checks use the real HMO API if credentials are configured in Settings.',
      'Each HMO (Maxicare, Philam, Intellicare) is configured independently.',
      'Simulation mode is used when no API credentials are set — results are marked "(Simulated)".',
    ],
    roles: ['Billing', 'Admin'],
  },
  '/philhealth': {
    title: 'PhilHealth Claims',
    category: 'Finance',
    description: 'Process PhilHealth benefit claims, apply case rates, and submit via eClaims.',
    steps: [
      'Verify the patient\'s PhilHealth eligibility before admission or consultation.',
      'Ensure the consultation has the correct ICD-10 diagnosis codes.',
      'Create a PhilHealth claim — the system auto-matches the case rate from the schedule.',
      'Generate the CF4 claim form for manual submission, or submit via the eClaims API.',
      'Track claim status and post the PhilHealth deduction to the patient\'s bill once approved.',
    ],
    tips: [
      'Case rates are pre-loaded and updated yearly from the PhilHealth schedule.',
      'Dual diagnosis claims (primary + secondary) are supported.',
      'eClaims API submission is available if PhilHealth credentials are configured in Settings.',
    ],
    warnings: [
      'PhilHealth eligibility must be verified before the claim is submitted.',
      'Claims submitted with wrong ICD codes will be denied — use the correct primary diagnosis.',
    ],
    roles: ['Billing', 'Admin'],
  },
  '/accounting': {
    title: 'Accounting / General Ledger',
    category: 'Finance',
    description: 'Manage the chart of accounts, post journal entries, and generate financial statements.',
    steps: [
      'Set up your Chart of Accounts first: Assets, Liabilities, Equity, Revenue, and Expense.',
      'Post Journal Entries for all financial transactions (double-entry bookkeeping).',
      'Use Trial Balance to verify that total debits equal total credits before period close.',
      'Generate the Income Statement (P&L) and Balance Sheet for management reporting.',
    ],
    tips: [
      'GL accounts use a hierarchical structure — parent accounts roll up automatically.',
      'All billing payments auto-post to Cash/Accounts Receivable GL accounts when configured.',
      'Use the date filter on statements to generate period-specific reports.',
    ],
    roles: ['Billing', 'Admin'],
  },
  '/analytics': {
    title: 'Analytics & Reports',
    category: 'Management',
    description: 'Business intelligence dashboards for hospital performance and revenue analysis.',
    steps: [
      'Revenue Dashboard: view monthly and quarterly income trends by service category.',
      'Patient Metrics: track admission counts, average length of stay, and top diagnoses.',
      'Doctor Performance: see consultation volumes, revenue generated, and patient load per physician.',
      'Use the date range picker to compare any two time periods.',
    ],
    tips: [
      'Charts can be exported as PNG images from the chart context menu.',
      'All analytics use real-time data — no need to generate reports manually.',
    ],
    roles: ['Admin', 'Billing'],
  },
  '/or': {
    title: 'Operating Room',
    category: 'Clinical',
    description: 'Schedule surgeries, track OR utilization, and complete WHO surgical safety checklists.',
    steps: [
      'Book a surgery via "Book Surgery" — select the surgeon, patient, procedure, OR room, and time.',
      'View the daily OR Schedule to check for conflicts before confirming a booking.',
      'Before starting: complete the Sign-In section of the WHO Surgical Safety Checklist.',
      'At the time of incision: complete the Time-Out section.',
      'After closing: complete the Sign-Out section to finish the checklist.',
    ],
    warnings: [
      'The WHO checklist is mandatory before every surgical incision — do not skip.',
      'All three checklist phases must be signed by the circulating nurse and surgeon.',
    ],
    roles: ['Doctor', 'Nurse', 'Admin'],
  },
  '/bloodbank': {
    title: 'Blood Bank',
    category: 'Clinical',
    description: 'Manage blood unit inventory, donor records, and transfusion requests.',
    steps: [
      'Register blood donors and their donation history under Donor Database.',
      'Add received blood units to inventory with blood type, component, and expiry.',
      'Create a Transfusion Request for a patient — select blood type and component needed.',
      'Match and issue units from inventory; update the transfusion record after administration.',
    ],
    tips: [
      'Blood units are tracked by expiry date — oldest units are prioritized for issue (FEFO).',
      'Cross-match results should be entered before issuing units to a patient.',
    ],
    warnings: [
      'Verify ABO/Rh compatibility before issuing — never skip cross-matching.',
    ],
    roles: ['Doctor', 'Nurse', 'Admin'],
  },
  '/dialysis': {
    title: 'Dialysis Center',
    category: 'Clinical',
    description: 'Schedule, monitor, and document hemodialysis sessions.',
    steps: [
      'Add patients to the Dialysis Schedule — assign machine, shift, and frequency (e.g., 3x/week).',
      'Track active sessions from "Active Sessions" — see real-time status for each machine.',
      'During a session, log access site condition, pre/post vitals, and any complications.',
      'At session end, record Kt/V (dialysis adequacy index) and post-session weight.',
      'Machine Management tracks maintenance schedules and current machine status.',
    ],
    tips: [
      'Kt/V targets: ≥1.2 per session for standard hemodialysis.',
      'Machine downtime status prevents booking on machines under maintenance.',
    ],
    roles: ['Doctor', 'Nurse', 'Admin'],
  },
  '/assets': {
    title: 'Asset Management',
    category: 'Management',
    description: 'Track hospital equipment, schedule maintenance, and calculate depreciation.',
    steps: [
      'Register new equipment: name, serial number, purchase date, cost, and department.',
      'Assign depreciation method (Straight-Line or Declining Balance) and useful life.',
      'Schedule and record maintenance events from the Maintenance log.',
      'View the Depreciation Report for the current book value of all assets.',
    ],
    tips: [
      'Assets nearing end-of-life are flagged in the depreciation report.',
      'Maintenance reminders can be set by date or usage hours.',
    ],
    roles: ['Admin'],
  },
  '/telemedicine': {
    title: 'Telemedicine',
    category: 'Clinical',
    description: 'Conduct WebRTC video consultations with patients remotely.',
    steps: [
      'Book a session via Telemedicine → "Book Session" — set patient, doctor, and schedule.',
      'A unique room code is generated; a confirmation email with the join link is sent to the patient.',
      'On the consultation time, click "Start Session" to enter the video room.',
      'The patient joins from their Patient Portal using the room code.',
      'Use the in-session chat, screen share, and mute controls during the call.',
      'Record consultation notes and prescriptions during or after the session.',
    ],
    tips: [
      'Both parties need a stable internet connection and a device with camera/microphone.',
      'Screen sharing works from the button in the video room controls.',
      'Consultation notes are saved directly to the patient\'s EMR.',
    ],
    warnings: [
      'Video sessions use peer-to-peer WebRTC — no third-party server stores the video stream.',
    ],
    roles: ['Doctor', 'Admin'],
  },
  '/ai': {
    title: 'AI Clinical Decision Support',
    category: 'Clinical',
    description: 'AI-powered tools for diagnosis suggestions, drug interactions, readmission risk, and vital sign analysis.',
    steps: [
      'Symptom Checker: Enter patient symptoms, age, and gender → get ranked differential diagnoses with ICD-10 codes.',
      'Drug Interactions: Select 2+ medications → check for MINOR, MODERATE, MAJOR, or CONTRAINDICATED interactions.',
      'Readmission Risk: Search for a patient → get a risk score (LOW/MEDIUM/HIGH) with contributing factors.',
      'Vital Signs Analysis: Search for a patient → get automated analysis of their latest vitals with recommendations.',
      'Allergy Checker: Select patient + medication → cross-check against known allergies and cross-reactivities.',
    ],
    tips: [
      'When Claude API is configured, results use the LLM engine (shown with "AI (LLM)" badge).',
      'Without an API key, the rule-based engine is used (shown with "Rule-based" badge).',
      'AI results are decision support only — always apply clinical judgment.',
    ],
    warnings: [
      'AI suggestions are NOT a substitute for clinical examination, history-taking, or laboratory tests.',
    ],
    roles: ['Doctor', 'Nurse', 'Admin'],
  },
  '/doh': {
    title: 'DOH Reporting',
    category: 'Compliance',
    description: 'Generate FHSIS and PIDSR epidemiological reports for the Department of Health.',
    steps: [
      'Select the report period (weekly, monthly, quarterly).',
      'Choose the report type: FHSIS (Field Health Service Information System) or PIDSR (disease surveillance).',
      'The system aggregates patient data from consultations and diagnoses automatically.',
      'Review the generated report and submit to your DOH region.',
    ],
    tips: [
      'Accurate ICD-10 coding in consultations is essential for correct DOH report counts.',
      'Reports are generated from actual patient data — no manual entry needed.',
    ],
    roles: ['Admin'],
  },
  '/hie': {
    title: 'HIE / Interoperability',
    category: 'Compliance',
    description: 'Health Information Exchange — patient consent, referrals, and FHIR R4 bundles.',
    steps: [
      'Register patient consent for health data sharing under HIE → Consent Management.',
      'Create referrals to other facilities with clinical summaries attached.',
      'Generate FHIR R4 bundles for interoperability with other health information systems.',
      'Track all data access and sharing events in the HIE Audit Log.',
    ],
    tips: [
      'Patient consent is required before any data can be shared with external systems.',
      'FHIR R4 bundles follow the Philippine Health Data Exchange (PHDE) profile.',
    ],
    roles: ['Admin', 'Doctor'],
  },
  '/barcode': {
    title: 'Barcode & RFID',
    category: 'Operations',
    description: 'Scan patient wristbands, medication barcodes, and track assets with RFID.',
    steps: [
      'Print patient wristbands from the Patient Wristband page (QR code with patient ID).',
      'Use the Scanner page to scan barcodes for patient identification at bedside.',
      'Medication scanning verifies the right drug, dose, and patient before administration.',
      'Asset RFID tags are scanned to update asset location and status.',
    ],
    tips: [
      'The scanner works with any USB barcode reader or smartphone camera scanner.',
      'All scans are logged with timestamp and user in the scan history.',
    ],
    roles: ['Nurse', 'Pharmacist', 'Admin'],
  },
  '/sms': {
    title: 'SMS Notifications',
    category: 'Operations',
    description: 'Manage SMS templates and view sent message history.',
    steps: [
      'Go to SMS → Templates to view and create message templates.',
      'Templates support placeholders like {{patient_name}}, {{appointment_date}}, {{bill_amount}}.',
      'SMS messages are automatically sent for appointments, billing, and password resets.',
      'View the SMS log to see all sent messages and delivery status.',
    ],
    tips: [
      'SMS requires Semaphore API Key configured in Settings → Integrations.',
      'Without an API key, messages are logged to the console (simulation mode).',
    ],
    roles: ['Admin'],
  },
  '/payments': {
    title: 'Online Payments',
    category: 'Finance',
    description: 'Accept GCash, Maya, and card payments via PayMongo.',
    steps: [
      'From a patient\'s bill, click "Pay Online" to generate a payment link.',
      'Select the payment method: GCash, Maya, or credit/debit card.',
      'Share the payment link with the patient via SMS or email.',
      'Once paid, the bill status updates automatically via webhook.',
      'View all online payment transactions in Payments → Transaction History.',
    ],
    tips: [
      'PayMongo credentials must be configured in Settings → Integrations.',
      'Without credentials, simulation mode is used (payments are marked paid instantly).',
      'Test payments use PayMongo test keys — no real money is charged.',
    ],
    roles: ['Billing', 'Admin'],
  },
  '/users': {
    title: 'User Management',
    category: 'Administration',
    description: 'Create, update, and manage staff accounts and role assignments.',
    steps: [
      'Click "New User" to create a staff account with username, role, and temporary password.',
      'Assign the role that matches the staff member\'s function (Doctor, Nurse, Billing, etc.).',
      'Use the Active toggle to enable or disable login access.',
      'Staff can change their own password from My Profile after first login.',
    ],
    warnings: [
      'Role assignments control which pages and actions the user can access — assign carefully.',
      'Deactivated users cannot log in but their records and audit trail are preserved.',
      'You cannot deactivate your own account.',
    ],
    roles: ['Admin', 'Super Admin'],
  },
  '/settings': {
    title: 'System Settings & Branding',
    category: 'Administration',
    description: 'Configure hospital profile, white-label branding, and integration credentials.',
    steps: [
      'Branding: Set hospital name, subtitle, logo, primary color, and sidebar color.',
      'Changes take effect immediately across all connected clients.',
      'Integrations: Enter API keys for PhilHealth eClaims, Semaphore SMS, PayMongo, and Claude AI.',
      'SMTP: Configure email server for password resets and appointment confirmations.',
    ],
    tips: [
      'Logo accepts PNG, JPG, SVG, or WebP up to 2 MB.',
      'Branding changes are broadcast via WebSocket — no page refresh needed.',
      'All integration credentials are stored server-side — never visible to browser clients.',
    ],
    roles: ['Admin', 'Super Admin'],
  },
  '/audit': {
    title: 'Audit Log',
    category: 'Administration',
    description: 'Complete audit trail of all user actions for compliance and security review.',
    steps: [
      'Filter by username, module, action type, or date range to narrow results.',
      'Each log entry shows: who, what action, which record, and when.',
      'Export the filtered log to CSV for DOH compliance or security audits.',
    ],
    tips: [
      'Audit logs are write-once — no one can edit or delete them, including Super Admins.',
      'All CRUD operations, login events, and billing changes are logged.',
    ],
    roles: ['Admin', 'Super Admin'],
  },
  '/profile': {
    title: 'My Profile',
    category: 'Navigation',
    description: 'View and update your own account details and password.',
    steps: [
      'Click "Edit" to update your display name, email, or contact number.',
      'Use "Change Password" to set a new password.',
      'You must provide your current password to confirm the change.',
    ],
    tips: [
      'Adding a phone number enables SMS-based password reset.',
      'Changing your password signs out all other active sessions for security.',
    ],
    roles: ['All roles'],
  },
  '/departments': {
    title: 'Departments',
    category: 'Administration',
    description: 'Manage hospital departments and their associated resources.',
    steps: [
      'Add departments with their name, code, and head of department.',
      'Departments are used to organize doctors, rooms, lab sections, and queues.',
      'Deactivate departments that are no longer in use.',
    ],
    roles: ['Admin', 'Super Admin'],
  },
  '/doctors': {
    title: 'Doctors',
    category: 'Administration',
    description: 'Manage doctor profiles, specializations, and availability schedules.',
    steps: [
      'Add doctors with their PRC license number, specialization, and department.',
      'Set consultation schedules under each doctor\'s profile.',
      'Schedules are used for appointment booking availability checks.',
    ],
    roles: ['Admin'],
  },
  '/services': {
    title: 'Service Catalog',
    category: 'Administration',
    description: 'Manage the hospital\'s billable services and their prices.',
    steps: [
      'Add services under the appropriate category (Lab, Radiology, Room, Professional Fee, etc.).',
      'Set the standard price for each service.',
      'Services appear as selectable items when creating bills and consultation orders.',
    ],
    tips: [
      'Update service prices periodically to reflect current PhilHealth case rates and HMO contracts.',
    ],
    roles: ['Admin'],
  },

  // ── NEW FEATURES (Sessions 2–4) ────────────────────────────────────────────

  '/icu': {
    title: 'ICU Monitor',
    category: 'Clinical',
    description: 'Real-time intensive care unit dashboard — vital trends, fluid balance, and critical alerts.',
    steps: [
      'Navigate to ICU Monitor to see all current ICU patients side-by-side.',
      'Each patient card shows the latest vitals: BP, HR, SpO2, temperature, and respiratory rate.',
      'Record Intake & Output (I&O) — select fluid type, volume (mL), and route.',
      'The running 24-hour fluid balance is calculated automatically.',
      'Abnormal vitals are highlighted in red — click the patient card for the full detail view.',
      'Ventilator settings and Glasgow Coma Scale (GCS) scores are tracked per patient.',
    ],
    tips: [
      'Fluid balance updates immediately each time an I&O entry is saved.',
      'Critical threshold: >2,000 mL overload or <-2,000 mL deficit triggers a warning badge.',
      'All ICU events are logged in the patient\'s EMR automatically.',
    ],
    warnings: [
      'ICU Monitor is for monitoring only — abnormal values must be verified clinically.',
    ],
    roles: ['Doctor', 'Nurse', 'Admin'],
  },

  '/ob': {
    title: 'OB / Partograph',
    category: 'Clinical',
    description: 'Obstetric dashboard for managing deliveries, partograph recording, and APGAR scoring.',
    steps: [
      'Go to OB Dashboard to see active deliveries in progress.',
      'Open a delivery record to view or enter partograph data points.',
      'Record cervical dilation (cm), fetal head descent, and contractions at timed intervals.',
      'The partograph plots automatically — alert lines trigger when labor deviates from normal.',
      'After delivery, record the baby\'s APGAR scores at 1 minute and 5 minutes.',
      'Add maternal vital signs and any complications to the delivery record.',
    ],
    tips: [
      'APGAR score 7–10 = Normal; 4–6 = Moderate concern; 0–3 = Requires resuscitation.',
      'Gestational age and EDD are calculated from the LMP date entered in the patient\'s record.',
      'Completed deliveries are linked to the mother\'s EMR and the newborn\'s patient record.',
    ],
    warnings: [
      'A flat or descending partograph line crossing the Action Line requires immediate obstetric review.',
    ],
    roles: ['Doctor', 'Nurse', 'Admin'],
  },

  '/admitting': {
    title: 'Discharge Summary',
    category: 'Clinical',
    description: 'Generate structured discharge summaries with diagnosis, treatment, and follow-up instructions.',
    steps: [
      'Go to Admitting → Discharge Summary for any admitted patient.',
      'Fill in the admission and discharge diagnoses (ICD-10 codes).',
      'Summarize clinical course: procedures performed, lab findings, and treatment given.',
      'Enter discharge condition: Improved, Stable, Transferred, or other.',
      'Add follow-up instructions, activity restrictions, and diet orders.',
      'Print or download the Discharge Summary PDF for the patient and referring physician.',
    ],
    tips: [
      'Diagnosis codes entered here are used for PhilHealth claims and DOH reporting.',
      'The summary auto-populates from the admission record — fill in only what is missing.',
      'Discharge condition "Expired" generates a Death Summary instead.',
    ],
    roles: ['Doctor', 'Nurse', 'Admin'],
  },

  '/workspace': {
    title: 'Doctor Workspace',
    category: 'Clinical',
    description: 'Personal physician dashboard combining today\'s schedule, patient tasks, and quick actions.',
    steps: [
      'Open Doctor Workspace to see your complete workday at a glance.',
      'Today\'s Queue shows your current position and patients waiting.',
      'Pending Consultations list your scheduled outpatient and inpatient encounters.',
      'Lab Results Requiring Review are highlighted — click to view and sign off.',
      'Active Problem List shows open issues across all your current patients.',
      'Use Quick Actions to write a new prescription, order labs, or start a consultation.',
    ],
    tips: [
      'The workspace refreshes automatically — no need to reload.',
      'Items in the Active Problem List are pulled from all active admissions and recent consultations.',
      'Doctors can access the workspace from any device including tablets.',
    ],
    roles: ['Doctor'],
  },

  '/lab-queue': {
    title: 'Lab Work Queue',
    category: 'Clinical',
    description: 'Prioritized worklist for laboratory technicians showing all pending specimen processing.',
    steps: [
      'Open Lab Work Queue to see all pending lab requisitions sorted by priority.',
      'STAT orders appear at the top in red — these must be processed within 60 minutes.',
      'Click a requisition to open the result entry form.',
      'Mark specimens as "Collected" when the sample arrives.',
      'Enter test values and flag abnormal results — click "Complete" when done.',
      'Verified results are immediately visible in the patient\'s EMR.',
    ],
    tips: [
      'TAT (turnaround time) targets: STAT = 60 min, URGENT = 4 hours, ROUTINE = 8 hours.',
      'TAT breach warnings appear when a result is overdue.',
      'The queue auto-refreshes every 30 seconds via WebSocket.',
    ],
    roles: ['Lab Tech', 'Doctor', 'Nurse', 'Admin'],
  },

  '/nursing': {
    title: 'Nursing Station',
    category: 'Clinical',
    description: 'Ward-level nursing station with patient list, room status, and housekeeping management.',
    steps: [
      'See all patients in your ward from the Nursing Station overview.',
      'Room Status panel shows which rooms are Clean, Dirty, In Progress, or Out of Service.',
      'When a patient is discharged, mark the room as "Dirty" to trigger the cleaning workflow.',
      'Housekeeping staff update the room to "In Progress" then "Inspected".',
      'Charge Nurse inspects and marks the room "Clean" — it becomes available for new admissions.',
    ],
    tips: [
      'Only CLEAN rooms can be assigned to new admissions.',
      'Room status updates are visible to the admissions desk in real-time.',
      'The cleaning workflow: Dirty → In Progress → Inspected → Clean.',
    ],
    roles: ['Nurse', 'Admin'],
  },

  '/billing/soa': {
    title: 'Billing Statement of Account (SOA)',
    category: 'Finance',
    description: 'Generate a formal Statement of Account with itemized charges, insurance deductions, and balance summary.',
    steps: [
      'Open any bill and click "View SOA" or navigate to Billing → SOA.',
      'The SOA shows all line items grouped by category (Room, Lab, Pharmacy, Nursing, etc.).',
      'Insurance deductions (PhilHealth and HMO) are shown separately below the gross total.',
      'Senior/PWD discount is applied and shown as a separate line item.',
      'Payment history is listed at the bottom, with the outstanding balance highlighted.',
      'Click "Print SOA" to generate the printable PDF for the patient.',
    ],
    tips: [
      'The SOA auto-updates in real-time as new charges or payments are added.',
      'A separate summary for the HMO\'s "hospital statement" can also be printed.',
      'SOA format follows the standard DOH billing format for PhilHealth compliance.',
    ],
    roles: ['Billing', 'Admin', 'Doctor'],
  },

  '/pharmacy/inventory': {
    title: 'Pharmacy Inventory & Batch Tracking',
    category: 'Pharmacy',
    description: 'Multi-batch lot tracking for medications — monitor expiry, receive stock, and recall batches.',
    steps: [
      'Go to Pharmacy → Inventory to view all items with current stock levels.',
      'Click an item to see all its batches with batch number, expiry date, and remaining quantity.',
      'When receiving a delivery, click "Receive Batch" — enter the batch number, expiry date, and quantity.',
      'To recall a batch (e.g., product recall), change its status to RECALLED — it will not be dispensed.',
      'Quarantine a batch if quality issues are suspected — it is held for investigation.',
      'Stock alerts trigger automatically when available quantity drops below the reorder point.',
    ],
    tips: [
      'Dispensing uses FIFO (First In, First Out) by default — oldest batches are issued first.',
      'Near-expiry items (within 90 days) are highlighted in orange in the inventory list.',
      'Recalled and Quarantined batches are excluded from the available stock count.',
    ],
    warnings: [
      'RECALLED batches cannot be dispensed to patients — ensure batch status is updated immediately upon recall.',
    ],
    roles: ['Pharmacist', 'Admin'],
  },

  '/portal': {
    title: 'Patient Portal',
    category: 'Operations',
    description: 'Self-service web portal for patients to view health records, appointments, lab results, prescriptions, and bills.',
    steps: [
      'Patients access the portal at: /portal/login',
      'Login credentials: Patient Number (e.g., P-2024-00001) + Date of Birth.',
      'Dashboard shows upcoming appointments, recent lab results, active prescriptions, and balance due.',
      'Appointments: view upcoming and past appointments; book a new appointment with any available doctor.',
      'Lab Results: view all laboratory and radiology results with normal/abnormal indicators.',
      'Prescriptions: view active and historical prescriptions with drug names, dosage, and instructions.',
      'Bills: view all bills with itemized charges and outstanding balance.',
      'Profile: view personal information registered in the hospital system.',
    ],
    tips: [
      'Portal login uses Date of Birth — no separate password is needed.',
      'Appointments booked through the portal require staff confirmation within 24 hours.',
      'The portal is accessible from any device — mobile, tablet, or desktop.',
    ],
    warnings: [
      'The portal only shows records linked to the logged-in patient\'s account.',
    ],
    roles: ['Patient'],
  },
};

export const DEFAULT_HELP: HelpArticle = {
  title: 'iHIMS Help Center',
  category: 'Navigation',
  description:
    'intelligent Hospital Information System — full hospital management covering clinical, billing, pharmacy, and administrative workflows.',
  steps: [
    'Use the sidebar to navigate between modules.',
    'Your role determines which modules you can access.',
    'Click the ? button in the top bar on any page for contextual help.',
    'Visit the Help Center for step-by-step workflow guides.',
  ],
  tips: [
    'The header shows your current role and username.',
    'Log out from the user menu (avatar) in the top right corner.',
    'Admins can configure branding, integrations, and user accounts from Settings.',
  ],
};

export function getArticle(pathname: string): HelpArticle {
  if (HELP_CONTENT[pathname]) return HELP_CONTENT[pathname];
  const prefixes = Object.keys(HELP_CONTENT)
    .filter((k) => pathname.startsWith(k) && k !== '/')
    .sort((a, b) => b.length - a.length);
  if (prefixes.length) return HELP_CONTENT[prefixes[0]!];
  return DEFAULT_HELP;
}

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
}

const HelpDrawer: React.FC<HelpDrawerProps> = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const article = getArticle(location.pathname);

  // Search across all articles
  const searchResults = useMemo(() => {
    if (!search.trim() || search.trim().length < 2) return [];
    const q = search.toLowerCase();
    return Object.entries(HELP_CONTENT)
      .filter(([, a]) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.steps?.some((s) => s.toLowerCase().includes(q)) ||
        a.tips?.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [search]);

  const handleOpenHelpCenter = () => {
    navigate('/help');
    onClose();
  };

  return (
    <Drawer
      title={
        <Space>
          <QuestionCircleOutlined style={{ color: '#1677ff' }} />
          <span>Help</span>
          <Tag color="blue" style={{ marginLeft: 4 }}>{article.title}</Tag>
        </Space>
      }
      placement="right"
      width={400}
      open={open}
      onClose={onClose}
      extra={
        <Button
          type="link"
          icon={<ReadOutlined />}
          size="small"
          onClick={handleOpenHelpCenter}
        >
          Help Center
        </Button>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Search */}
        <Input
          placeholder="Search help articles..."
          prefix={<SearchOutlined style={{ color: '#bbb' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />

        {/* Search results */}
        {search.trim().length >= 2 && (
          searchResults.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No articles found" style={{ margin: 0 }} />
          ) : (
            <div>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </Text>
              {searchResults.map(([path, a]) => (
                <div
                  key={path}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, marginBottom: 4, background: '#f5f5f5' }}
                  onClick={() => { navigate(path); setSearch(''); onClose(); }}
                >
                  <Text strong style={{ fontSize: 13 }}>{a.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{a.description.substring(0, 80)}…</Text>
                </div>
              ))}
            </div>
          )
        )}

        {/* Contextual article — hidden while searching */}
        {!search.trim() && (
          <>
            {/* Overview */}
            <div>
              <Space style={{ marginBottom: 6 }}>
                <InfoCircleOutlined style={{ color: '#1677ff' }} />
                <Text strong>Overview</Text>
              </Space>
              <Paragraph type="secondary" style={{ margin: 0 }}>{article.description}</Paragraph>
            </div>

            {/* Steps */}
            {article.steps && article.steps.length > 0 && (
              <div>
                <Space style={{ marginBottom: 6 }}>
                  <BookOutlined style={{ color: '#52c41a' }} />
                  <Text strong>How to use</Text>
                </Space>
                <ol style={{ paddingLeft: 20, margin: 0 }}>
                  {article.steps.map((step, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <Text>{step}</Text>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Tips */}
            {article.tips && article.tips.length > 0 && (
              <>
                <Divider style={{ margin: '4px 0' }} />
                <Collapse
                  ghost
                  size="small"
                  items={[{
                    key: 'tips',
                    label: (
                      <Space>
                        <BulbOutlined style={{ color: '#faad14' }} />
                        <Text strong>Tips & Notes</Text>
                      </Space>
                    ),
                    children: (
                      <ul style={{ paddingLeft: 20, margin: 0 }}>
                        {article.tips!.map((tip, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            <Text type="secondary">{tip}</Text>
                          </li>
                        ))}
                      </ul>
                    ),
                  }]}
                />
              </>
            )}

            {/* Warnings */}
            {article.warnings && article.warnings.length > 0 && (
              <>
                <Divider style={{ margin: '4px 0' }} />
                <Space style={{ marginBottom: 6 }}>
                  <WarningOutlined style={{ color: '#ff4d4f' }} />
                  <Text strong type="danger">Important</Text>
                </Space>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {article.warnings.map((w, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <Text type="danger">{w}</Text>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Roles */}
            {article.roles && article.roles.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <Divider style={{ margin: '4px 0 10px' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Available to: </Text>
                <Space wrap size={4} style={{ marginTop: 4 }}>
                  {article.roles.map((r) => (
                    <Tag key={r} style={{ fontSize: 11 }}>{r}</Tag>
                  ))}
                </Space>
              </div>
            )}

            <Divider style={{ margin: '4px 0' }} />
            <Button
              block
              icon={<ReadOutlined />}
              onClick={handleOpenHelpCenter}
            >
              Open Full Help Center
            </Button>
          </>
        )}
      </Space>
    </Drawer>
  );
};

export default HelpDrawer;
