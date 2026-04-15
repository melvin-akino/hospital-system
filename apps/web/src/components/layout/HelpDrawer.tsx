import React from 'react';
import { Drawer, Typography, Collapse, Tag, Space, Divider } from 'antd';
import {
  QuestionCircleOutlined, BookOutlined, InfoCircleOutlined,
  BulbOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

interface HelpArticle {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
  warnings?: string[];
  roles?: string[];
}

// ── Help content map — keyed by route prefix ─────────────────────────────────
const HELP_CONTENT: Record<string, HelpArticle> = {
  '/dashboard': {
    title: 'Dashboard',
    description:
      'The Dashboard gives you a real-time overview of your work area. The widgets shown depend on your role.',
    steps: [
      'Review your KPI cards at the top for at-a-glance numbers.',
      'Check the tables below for actionable items (today\'s consultations, unpaid bills, etc.).',
      'Click any row to navigate to the full detail page.',
    ],
    tips: [
      'Admins see a hospital-wide view; clinical staff see their own schedule.',
      'Data refreshes automatically every time you navigate back to the dashboard.',
    ],
  },
  '/patients': {
    title: 'Patient Management',
    description: 'Search, register, and manage patient records.',
    steps: [
      'Use the search bar to find patients by name, patient number, or phone.',
      'Click "New Patient" to register a new patient.',
      'Click a patient row to view their full profile and medical history.',
      'Use the filter dropdowns to narrow results by gender or status.',
    ],
    tips: [
      'Patient numbers are auto-generated (PT-YYYYMMDD-XXXX).',
      'You can bulk-import patients via Excel using the Import button.',
      'PWD and Senior Citizen flags automatically apply discounts in billing.',
    ],
    warnings: [
      'Deleting a patient removes all their records permanently. Deactivate instead.',
    ],
    roles: ['Admin', 'Doctor', 'Nurse', 'Receptionist'],
  },
  '/consultations': {
    title: 'Consultations',
    description: 'Create and manage doctor–patient consultations (OPD visits).',
    steps: [
      'Click "New Consultation" and select the patient and doctor.',
      'Record chief complaint, findings (SOAP notes), and assessment.',
      'Add ICD-10 diagnosis codes for billing and PhilHealth claims.',
      'Prescriptions can be added directly from the consultation form.',
    ],
    tips: [
      'Completed consultations auto-generate billing items when a bill is created.',
      'Use the status filter to view only Scheduled, In-Progress, or Completed.',
    ],
    roles: ['Doctor', 'Nurse', 'Receptionist'],
  },
  '/billing': {
    title: 'Billing',
    description: 'Create bills, record payments, and manage patient accounts.',
    steps: [
      'Click "New Bill" and select a patient to start.',
      'Add services, lab tests, medications, and room charges as line items.',
      'Apply discounts: Senior Citizen (20%), PWD (20%), PhilHealth, or HMO.',
      'Click "Record Payment" to accept cash, GCash, Maya, card, or insurance.',
      'Download PDF for printed receipts or discharge billing summaries.',
    ],
    tips: [
      'A bill can have multiple partial payments.',
      'PhilHealth deductions are applied at the bill level after creating a claim.',
      'Use the "Download PDF" button for a printable billing statement.',
    ],
    warnings: [
      'Finalized bills cannot be edited. Cancel and re-create if corrections are needed.',
    ],
    roles: ['Billing', 'Admin'],
  },
  '/admissions': {
    title: 'Rooms & Admissions',
    description: 'Manage inpatient admissions, room assignments, and discharges.',
    steps: [
      'Go to Room Status to see bed availability by department.',
      'Click "Admit Patient" to create a new admission and assign a room.',
      'Monitor admitted patients from the Admissions list.',
      'When ready, open the admission and click "Discharge" to close the stay.',
      'Download the Discharge Summary PDF from the discharge form.',
    ],
    tips: [
      'Room charges accumulate daily and are automatically added to the bill.',
      'Transferred patients can be moved between rooms without re-admitting.',
    ],
    roles: ['Doctor', 'Nurse', 'Receptionist', 'Admin'],
  },
  '/nurses': {
    title: 'Nursing Station',
    description: 'Nurse dashboard for managing assigned patients across shifts.',
    steps: [
      'The dashboard shows all currently admitted patients for your shift.',
      'Click "Record Vitals" to log temperature, BP, HR, RR, O2 sat.',
      'Open "Care Plans" to view and update patient care goals and interventions.',
      'Use "Shift Handover" to document a summary for the next shift.',
    ],
    tips: [
      'Vital signs are automatically linked to the patient\'s EMR.',
      'Abnormal vitals (outside reference range) are flagged in the EMR.',
    ],
    roles: ['Nurse', 'Doctor'],
  },
  '/lab': {
    title: 'Laboratory & Radiology',
    description: 'Order lab tests, enter results, and review radiology reports.',
    steps: [
      'Go to Lab Requisitions → "New Order" to request tests for a patient.',
      'Select from 26+ standard test templates or add custom tests.',
      'Lab Techs enter results in "Lab Results → Enter Results".',
      'Results appear in the patient\'s EMR automatically.',
      'For radiology, use "Radiology Orders" to request imaging.',
    ],
    tips: [
      'Abnormal results are flagged with H (High) or L (Low) indicators.',
      'Reference ranges are preset per test but can be overridden per result.',
    ],
    roles: ['Doctor', 'Nurse', 'Lab Tech'],
  },
  '/pharmacy': {
    title: 'Pharmacy & Inventory',
    description: 'Manage medication catalog, stock levels, and purchase orders.',
    steps: [
      'Check "Stock Alerts" daily for items at or below minimum stock levels.',
      'Use "Purchase Orders" to request restocking from suppliers.',
      'The Inventory dashboard shows real-time stock by batch and expiry date.',
    ],
    tips: [
      'Set minimum stock levels per medication to trigger automatic alerts.',
      'Batch tracking helps manage FEFO (First Expired, First Out) dispensing.',
    ],
    warnings: [
      'Controlled substances require additional documentation — log all dispensing.',
    ],
    roles: ['Pharmacist', 'Admin'],
  },
  '/philhealth': {
    title: 'PhilHealth Claims',
    description: 'Process PhilHealth benefit claims and case rate applications.',
    steps: [
      'Create a claim from the Billing module or directly from PhilHealth → Create Claim.',
      'The system auto-looks up the case rate for the patient\'s ICD-10 code.',
      'Generate the CF4 XML form for submission.',
      'Update claim status after manual submission to PhilHealth.',
    ],
    tips: [
      'Case Rates are pre-loaded from the PhilHealth schedule — update them yearly.',
      'Both primary and secondary diagnoses are supported for case rate calculation.',
    ],
    roles: ['Billing', 'Admin'],
  },
  '/accounting': {
    title: 'Accounting / General Ledger',
    description: 'Chart of accounts, journal entries, and financial statements.',
    steps: [
      'Set up your Chart of Accounts first (Assets, Liabilities, Equity, Income, Expense).',
      'Create Journal Entries for all financial transactions.',
      'Use Trial Balance to verify debits equal credits before period close.',
      'Generate Income Statement and Balance Sheet for financial reporting.',
    ],
    tips: [
      'GL accounts follow a hierarchical structure — parent accounts roll up automatically.',
      'All billing payments auto-post to the Cash/Accounts Receivable GL accounts.',
    ],
    roles: ['Billing', 'Admin'],
  },
  '/hmo': {
    title: 'HMO Processing',
    description: 'Manage HMO member registrations, eligibility checks, and claims.',
    steps: [
      'Register the patient\'s HMO membership under HMO → Registrations.',
      'Use Eligibility Check before providing services to verify active coverage.',
      'After services, create an HMO Claim and attach the bill.',
      'Track claim status through approval, denial, or partial payment.',
    ],
    roles: ['Billing', 'Admin'],
  },
  '/analytics': {
    title: 'Analytics & Reports',
    description: 'Business intelligence dashboards for hospital performance.',
    steps: [
      'Revenue Report: monthly/quarterly income trends by service category.',
      'Patient Metrics: admission rates, average length of stay, diagnoses.',
      'Doctor Performance: consultation counts, revenue generated per doctor.',
    ],
    tips: [
      'Use the date range filter to compare periods.',
      'Export to PDF or CSV for management reporting.',
    ],
    roles: ['Admin', 'Billing'],
  },
  '/or': {
    title: 'Operating Room',
    description: 'Schedule surgeries and complete WHO surgical safety checklists.',
    steps: [
      'Book a surgery via "Book Surgery" — select surgeon, patient, procedure, and time.',
      'View the daily OR Schedule to avoid conflicts.',
      'Before starting surgery, complete the WHO Surgical Safety Checklist.',
    ],
    warnings: [
      'The WHO checklist must be completed before the surgical incision.',
    ],
    roles: ['Doctor', 'Nurse', 'Admin'],
  },
  '/appointments': {
    title: 'Appointments',
    description: 'Schedule and manage outpatient appointments.',
    steps: [
      'Click "Book Appointment" to schedule for a patient.',
      'Check "Availability" to see open slots per doctor.',
      'SMS reminders are sent automatically 24 hours before the appointment.',
    ],
    tips: [
      'Appointments can be converted to consultations on the day of the visit.',
    ],
    roles: ['Receptionist', 'Doctor', 'Nurse', 'Admin'],
  },
  '/users': {
    title: 'User Management',
    description: 'Create and manage staff accounts and role assignments.',
    steps: [
      'Click "New User" to create a staff account.',
      'Assign the appropriate role (Doctor, Nurse, Billing, etc.).',
      'Use the toggle to activate or deactivate accounts without deleting them.',
      'You cannot deactivate your own account.',
    ],
    warnings: [
      'Role assignments control what pages and actions the user can access.',
      'Deactivated users cannot log in but their records are preserved.',
    ],
    roles: ['Admin', 'Super Admin'],
  },
  '/settings': {
    title: 'System Settings',
    description: 'Configure hospital profile, discounts, integrations, and notifications.',
    steps: [
      'Hospital Profile: set name, address, license number, and logo.',
      'Preferences: adjust Senior Citizen and PWD discount rates.',
      'Integrations: enter API keys for PhilHealth eClaims, Semaphore SMS, and payment gateways.',
      'Security: set password policies and session timeouts.',
    ],
    tips: [
      'Semaphore API Key is required for SMS notifications to work.',
      'Payment gateway credentials are needed for GCash and Maya QR payments.',
    ],
    roles: ['Admin', 'Super Admin'],
  },
  '/audit-log': {
    title: 'Audit Log',
    description: 'Track all user actions for compliance and security review.',
    steps: [
      'Filter by username, module, action type, or date range.',
      'Each log entry shows who did what and when.',
      'Export logs for DOH compliance reports.',
    ],
    tips: [
      'Audit logs are write-once — they cannot be edited or deleted.',
      'All user management, billing, and patient record changes are logged.',
    ],
    roles: ['Admin', 'Super Admin'],
  },
  '/profile': {
    title: 'My Profile',
    description: 'Manage your own account details and password.',
    steps: [
      'Click "Edit" to update your display name, email, or phone number.',
      'Use "Change Password" to update your password.',
      'Enter your current password to confirm before setting a new one.',
    ],
    tips: [
      'Adding a phone number enables SMS-based password reset.',
      'Changing your password signs out all other active sessions.',
    ],
  },
  '/emr': {
    title: 'Electronic Medical Records',
    description: 'Complete patient medical history in one view.',
    steps: [
      'Access a patient\'s EMR from their Patient Detail page.',
      'View consultation history, prescriptions, lab results, and vitals over time.',
      'The Vital Signs Chart shows trends across visits.',
    ],
    roles: ['Doctor', 'Nurse', 'Admin'],
  },
  '/dialysis': {
    title: 'Dialysis Center',
    description: 'Schedule and monitor hemodialysis sessions.',
    steps: [
      'Schedule sessions from the Dialysis Schedule page.',
      'Track active sessions in real-time from "Active Sessions".',
      'Log Kt/V (dialysis adequacy) at the end of each session.',
      'Machines management shows maintenance status for each machine.',
    ],
    roles: ['Doctor', 'Nurse', 'Admin'],
  },
  '/telemedicine': {
    title: 'Telemedicine',
    description: 'Conduct video consultations with patients remotely.',
    steps: [
      'Book a session and share the room code with the patient.',
      'The patient connects via the Patient Portal.',
      'Start the session and record consultation notes during the call.',
      'End the session and generate a follow-up prescription if needed.',
    ],
    tips: [
      'Ensure stable internet before starting a video session.',
      'Consultation notes are saved to the patient\'s EMR.',
    ],
    roles: ['Doctor', 'Admin'],
  },
};

const DEFAULT_HELP: HelpArticle = {
  title: 'PIBS Help',
  description:
    'Philippine Integrated Billing System — hospital management platform covering clinical, billing, pharmacy, and administrative workflows.',
  steps: [
    'Use the sidebar to navigate between modules.',
    'Your role controls which modules you can access.',
    'Click the ? button in the top bar on any page for contextual help.',
  ],
  tips: [
    'Press Ctrl+K (or ⌘K on Mac) to quickly search patients.',
    'The header shows your current role and username.',
    'Log out from the user menu in the top right.',
  ],
};

function getArticle(pathname: string): HelpArticle {
  // Exact match first
  if (HELP_CONTENT[pathname]) return HELP_CONTENT[pathname];
  // Prefix match (longest prefix wins)
  const prefixes = Object.keys(HELP_CONTENT)
    .filter((k) => pathname.startsWith(k) && k !== '/')
    .sort((a, b) => b.length - a.length);
  if (prefixes.length) return HELP_CONTENT[prefixes[0]];
  return DEFAULT_HELP;
}

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
}

const HelpDrawer: React.FC<HelpDrawerProps> = ({ open, onClose }) => {
  const location = useLocation();
  const article = getArticle(location.pathname);

  return (
    <Drawer
      title={
        <Space>
          <QuestionCircleOutlined style={{ color: '#1890ff' }} />
          <span>Help</span>
          <Tag color="blue" style={{ marginLeft: 4 }}>{article.title}</Tag>
        </Space>
      }
      placement="right"
      width={380}
      open={open}
      onClose={onClose}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Overview */}
        <div>
          <Space style={{ marginBottom: 8 }}>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <Text strong>Overview</Text>
          </Space>
          <Paragraph type="secondary">{article.description}</Paragraph>
        </div>

        {/* Steps */}
        {article.steps && article.steps.length > 0 && (
          <div>
            <Space style={{ marginBottom: 8 }}>
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
          <div>
            <Divider style={{ margin: '0 0 12px' }} />
            <Collapse
              ghost
              items={[{
                key: 'tips',
                label: (
                  <Space>
                    <BulbOutlined style={{ color: '#faad14' }} />
                    <Text strong>Tips & Shortcuts</Text>
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
          </div>
        )}

        {/* Warnings */}
        {article.warnings && article.warnings.length > 0 && (
          <div>
            <Divider style={{ margin: '0 0 12px' }} />
            <Space style={{ marginBottom: 8 }}>
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
          </div>
        )}

        {/* Applicable roles */}
        {article.roles && article.roles.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Divider style={{ margin: '0 0 12px' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>Available to: </Text>
            <Space wrap size={4} style={{ marginTop: 4 }}>
              {article.roles.map((r) => (
                <Tag key={r} style={{ fontSize: 11 }}>{r}</Tag>
              ))}
            </Space>
          </div>
        )}

        {/* Footer */}
        <Divider style={{ margin: '4px 0' }} />
        <Text type="secondary" style={{ fontSize: 11 }}>
          PIBS v1.0 · Philippine Integrated Billing System
        </Text>
      </Space>
    </Drawer>
  );
};

export default HelpDrawer;
