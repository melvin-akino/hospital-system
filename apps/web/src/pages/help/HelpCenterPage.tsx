import React, { useState, useMemo } from 'react';
import {
  Row, Col, Card, Input, Typography, Tag, Space, Collapse, Tabs, Divider,
  List, Badge, Alert,
} from 'antd';
import {
  SearchOutlined, BookOutlined, BulbOutlined, WarningOutlined,
  InfoCircleOutlined, RocketOutlined, UserOutlined, TeamOutlined,
  MedicineBoxOutlined, DollarOutlined, SettingOutlined, BarChartOutlined,
  QuestionCircleOutlined, KeyOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { HELP_CONTENT, DEFAULT_HELP, type HelpArticle } from '../../components/layout/HelpDrawer';

const { Title, Text, Paragraph } = Typography;

// ── Category metadata ─────────────────────────────────────────────────────────
const CATEGORIES: Record<string, { icon: React.ReactNode; color: string }> = {
  Navigation:    { icon: <RocketOutlined />,      color: '#1677ff' },
  Clinical:      { icon: <MedicineBoxOutlined />, color: '#52c41a' },
  Finance:       { icon: <DollarOutlined />,      color: '#722ed1' },
  Pharmacy:      { icon: <MedicineBoxOutlined />, color: '#13c2c2' },
  Operations:    { icon: <TeamOutlined />,        color: '#fa8c16' },
  Management:    { icon: <BarChartOutlined />,    color: '#eb2f96' },
  Compliance:    { icon: <BookOutlined />,        color: '#52c41a' },
  Administration:{ icon: <SettingOutlined />,     color: '#8c8c8c' },
};

// ── Role quick-start guides ───────────────────────────────────────────────────
const ROLE_GUIDES: Record<string, { icon: React.ReactNode; color: string; steps: string[]; modules: string[] }> = {
  Doctor: {
    icon: <MedicineBoxOutlined />,
    color: '#87d068',
    steps: [
      'Open Doctor Workspace for a unified view of your queue, tasks, and pending reviews.',
      'Open the Queue module to call your next patient.',
      'Create a new Consultation — record SOAP notes and ICD-10 codes.',
      'Add prescriptions from within the consultation form.',
      'Order lab or radiology tests using the requisition form.',
      'Review results needing sign-off from the Lab Work Queue.',
      'Access the patient\'s full EMR from their patient detail page.',
      'For telemedicine sessions, go to Telemedicine → My Sessions.',
      'Use AI Clinical Support for differential diagnosis assistance.',
    ],
    modules: ['Workspace', 'Dashboard', 'Queue', 'Consultations', 'EMR', 'Lab Work Queue', 'Telemedicine', 'AI Support'],
  },
  Nurse: {
    icon: <TeamOutlined />,
    color: '#108ee9',
    steps: [
      'Start at the Nursing Station — see all admitted patients and room housekeeping status.',
      'Record vital signs for each patient from the "Record Vitals" button.',
      'Review and update care plans for assigned patients.',
      'For ICU patients, record Intake & Output (I&O) to track fluid balance.',
      'Use the Queue module to manage the outpatient waiting area.',
      'When a patient is discharged, mark their room as "Dirty" to trigger the cleaning workflow.',
      'Complete the Shift Handover form at the end of your shift.',
      'Document medication administration using the Barcode scanner for safety.',
    ],
    modules: ['Nursing Station', 'ICU Monitor', 'Queue', 'Patients', 'Lab', 'Admissions', 'Barcode'],
  },
  Receptionist: {
    icon: <UserOutlined />,
    color: '#13c2c2',
    steps: [
      'Register new patients from Patients → New Patient.',
      'Book appointments from the Appointments module.',
      'Add walk-in patients to the queue from Queue Management.',
      'Process admissions from Admissions → Admit Patient.',
      'Look up patient info and print wristbands from the Patient detail page.',
    ],
    modules: ['Patients', 'Appointments', 'Queue', 'Admissions'],
  },
  Billing: {
    icon: <DollarOutlined />,
    color: '#722ed1',
    steps: [
      'Open the Billing module and click "New Bill" for a patient.',
      'Add services, room charges, lab tests, and medications as line items.',
      'Apply PhilHealth case rates and HMO deductions if applicable.',
      'Verify patient eligibility: run HMO Eligibility Check or PhilHealth verification.',
      'Record payments as they are made — cash, card, GCash, or insurance.',
      'Generate and download billing statements as PDF.',
      'Post journal entries in the Accounting module for financial reporting.',
    ],
    modules: ['Billing', 'HMO', 'PhilHealth', 'Payments', 'Accounting', 'Analytics'],
  },
  Pharmacist: {
    icon: <MedicineBoxOutlined />,
    color: '#fa8c16',
    steps: [
      'Check Stock Alerts first — reorder any items that are low.',
      'Review pending prescriptions from the Dispensing queue.',
      'Scan medication barcodes to verify correctness before dispensing.',
      'When stock arrives, click "Receive Batch" — enter the batch number, expiry date, and quantity.',
      'Check near-expiry alerts — batches expiring within 90 days are highlighted.',
      'If a product recall is issued, change the affected batch status to RECALLED immediately.',
      'Run expiry date reports to pull near-expired medications from shelves.',
    ],
    modules: ['Pharmacy', 'Inventory & Batch Tracking', 'Barcode', 'Purchase Orders'],
  },
  Admin: {
    icon: <SettingOutlined />,
    color: '#2db7f5',
    steps: [
      'Set up hospital branding in Settings → Branding (name, logo, colors).',
      'Create staff user accounts in User Management with the correct roles.',
      'Configure service catalog in Services — add all billable items with prices.',
      'Set up departments and doctor profiles.',
      'Configure integration credentials: PayMongo, Semaphore, PhilHealth API, Claude AI.',
      'Monitor the Audit Log for suspicious access or changes.',
      'Review Analytics reports for hospital performance.',
    ],
    modules: ['Settings', 'Users', 'Departments', 'Services', 'Doctors', 'Audit Log', 'Analytics'],
  },
};

// ── Common workflows ──────────────────────────────────────────────────────────
const WORKFLOWS = [
  {
    title: 'Patient Registration → Consultation → Billing',
    category: 'OPD Workflow',
    color: '#1677ff',
    steps: [
      { label: 'Register patient', detail: 'Patients → New Patient (or find existing)' },
      { label: 'Add to queue', detail: 'Queue Management → Add to Queue' },
      { label: 'Call patient', detail: 'Doctor clicks "Call Next" in the queue' },
      { label: 'Create consultation', detail: 'Consultations → New Consultation' },
      { label: 'Record SOAP notes + ICD codes', detail: 'Doctor fills in findings and diagnosis' },
      { label: 'Add prescriptions', detail: 'Within consultation form → Add Prescription' },
      { label: 'Create bill', detail: 'Billing → New Bill (auto-populates from consultation)' },
      { label: 'Record payment', detail: 'Billing → Record Payment (cash, card, GCash)' },
    ],
  },
  {
    title: 'Patient Admission → Discharge',
    category: 'Inpatient Workflow',
    color: '#52c41a',
    steps: [
      { label: 'Verify eligibility', detail: 'HMO Eligibility Check or PhilHealth verification' },
      { label: 'Admit patient', detail: 'Admissions → Admit Patient → assign room and doctor' },
      { label: 'Record daily vitals', detail: 'Nursing Station → Record Vitals' },
      { label: 'Create care plan', detail: 'Nursing → Care Plans → New Plan' },
      { label: 'Order labs & imaging', detail: 'Lab Requisitions → New Order' },
      { label: 'Doctor rounds & consultations', detail: 'Consultations → New (inpatient type)' },
      { label: 'Prepare discharge summary', detail: 'Admissions → Discharge → fill notes' },
      { label: 'Generate final bill', detail: 'Billing → includes all room charges automatically' },
      { label: 'Process PhilHealth/HMO claim', detail: 'PhilHealth or HMO module → Create Claim' },
    ],
  },
  {
    title: 'Lab Requisition → Results',
    category: 'Lab Workflow',
    color: '#722ed1',
    steps: [
      { label: 'Doctor orders tests', detail: 'Lab Requisitions → New Order → select tests + urgency' },
      { label: 'Requisition appears in Lab', detail: 'Lab Tech sees pending orders on their dashboard' },
      { label: 'Collect specimen', detail: 'Mark specimen collected in the requisition' },
      { label: 'Enter results', detail: 'Lab Results → Enter Results → fill values + mark abnormals' },
      { label: 'Results auto-posted to EMR', detail: 'Doctor sees results in patient\'s EMR immediately' },
    ],
  },
  {
    title: 'PhilHealth Claim Processing',
    category: 'Insurance Workflow',
    color: '#fa8c16',
    steps: [
      { label: 'Verify PhilHealth membership', detail: 'PhilHealth → Eligibility Check' },
      { label: 'Consultation with ICD-10 code', detail: 'Ensure correct primary diagnosis is coded' },
      { label: 'Create PhilHealth claim', detail: 'PhilHealth → Claims → New Claim' },
      { label: 'System looks up case rate', detail: 'Auto-matched from the PhilHealth case rate schedule' },
      { label: 'Generate CF4 form', detail: 'Download XML/PDF for submission' },
      { label: 'Submit claim', detail: 'Via eClaims API (if configured) or manual upload' },
      { label: 'Post deduction to bill', detail: 'Once approved, apply PhilHealth deduction to balance' },
    ],
  },
  {
    title: 'Telemedicine Session',
    category: 'Virtual Care Workflow',
    color: '#13c2c2',
    steps: [
      { label: 'Book session', detail: 'Telemedicine → Book Session → set patient, doctor, schedule' },
      { label: 'Patient receives email', detail: 'Booking confirmation with room code and join link' },
      { label: 'Doctor starts session', detail: 'Telemedicine → My Sessions → Start Session' },
      { label: 'Patient joins via portal', detail: 'Patient Portal → Telemedicine → Enter room code' },
      { label: 'Conduct consultation', detail: 'Video call with chat and screen share available' },
      { label: 'Record notes + prescription', detail: 'Fill consultation notes during or after the call' },
      { label: 'Notes saved to EMR', detail: 'Consultation is stored in the patient\'s record' },
    ],
  },
  {
    title: 'Room Discharge → Housekeeping → Re-Admission',
    category: 'Nursing Workflow',
    color: '#52c41a',
    steps: [
      { label: 'Patient discharged', detail: 'Admissions → Discharge → fill discharge summary' },
      { label: 'Mark room dirty', detail: 'Nursing Station → Room Status → Mark as Dirty' },
      { label: 'Housekeeping starts', detail: 'Housekeeping staff → Room → Start Cleaning (In Progress)' },
      { label: 'Cleaning completed', detail: 'Housekeeping staff → Mark as Inspected' },
      { label: 'Charge Nurse inspects', detail: 'Nursing Station → Inspect → Mark as Clean' },
      { label: 'Room available', detail: 'Room appears as AVAILABLE for new admissions' },
      { label: 'Admit new patient', detail: 'Admissions → Admit Patient → assign the clean room' },
    ],
  },
  {
    title: 'Patient Portal — Patient Self-Service',
    category: 'Patient Workflow',
    color: '#0d9488',
    steps: [
      { label: 'Navigate to portal', detail: 'Visit: /portal/login from any browser' },
      { label: 'Login', detail: 'Enter Patient Number (e.g. P-2024-00001) + Date of Birth' },
      { label: 'View health summary', detail: 'Dashboard shows appointments, labs, Rx, and balance' },
      { label: 'Book appointment', detail: 'Appointments → Book Appointment → pick doctor and date/time' },
      { label: 'View lab results', detail: 'Lab Results → see all tests with normal/abnormal flags' },
      { label: 'Check prescriptions', detail: 'Prescriptions → view active meds and instructions' },
      { label: 'View bills', detail: 'Bills → see itemized charges and outstanding balance' },
    ],
  },
  {
    title: 'ICU Monitoring — Fluid Balance',
    category: 'ICU Workflow',
    color: '#eb2f96',
    steps: [
      { label: 'Open ICU Monitor', detail: 'Navigate to ICU Monitor → see all ICU patient cards' },
      { label: 'Record intake', detail: 'Click patient → I&O tab → Add Intake (IV fluids, oral intake)' },
      { label: 'Record output', detail: 'Add Output (urine, drains, NG tube output)' },
      { label: 'Check balance', detail: 'Running balance updates automatically (Intake − Output)' },
      { label: 'Monitor critical threshold', detail: 'Warning badge appears if balance > ±2,000 mL' },
      { label: 'Record vitals', detail: 'Enter BP, HR, SpO2, temperature at each assessment time' },
      { label: 'GCS / Vent settings', detail: 'Update Glasgow Coma Scale and ventilator parameters if applicable' },
    ],
  },
  {
    title: 'Pharmacy Batch Receiving & Recall',
    category: 'Pharmacy Workflow',
    color: '#fa8c16',
    steps: [
      { label: 'New stock arrives', detail: 'Pharmacy → Inventory → select item → Receive Batch' },
      { label: 'Enter batch details', detail: 'Batch number, expiry date, quantity, supplier, cost per unit' },
      { label: 'Batch saved as ACTIVE', detail: 'New batch added to available stock immediately' },
      { label: 'Dispensing uses FIFO', detail: 'Oldest active batches are used first during dispensing' },
      { label: 'Recall issued by supplier', detail: 'Inventory → find batch → Change status to RECALLED' },
      { label: 'Recalled batch excluded', detail: 'Stock count updates; recalled batch skipped by dispensing' },
      { label: 'Quarantine for investigation', detail: 'Set status to QUARANTINE while investigating quality issue' },
    ],
  },
];

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Quick patient search (from any page)' },
  { keys: ['?'], description: 'Open contextual help drawer' },
  { keys: ['Esc'], description: 'Close modal or drawer' },
  { keys: ['Enter'], description: 'Submit form / confirm dialog' },
  { keys: ['Ctrl', '/'], description: 'Focus search bar on list pages' },
  { keys: ['←', '→'], description: 'Navigate between pagination pages' },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'How do I reset a staff member\'s password?',
    a: 'Go to User Management, find the user, click Edit, and set a temporary password. The staff member can then change it from their profile.',
  },
  {
    q: 'Why are SMS notifications not being sent?',
    a: 'SMS requires a Semaphore API Key. Go to Settings → Integrations and enter your Semaphore API key. Without it, the system logs messages to the server console instead of sending them.',
  },
  {
    q: 'How do I accept GCash or Maya payments?',
    a: 'Configure your PayMongo Secret Key in Settings → Integrations. Then from any bill, click "Pay Online" to generate a checkout link. Without credentials, the system simulates the payment.',
  },
  {
    q: 'The AI Symptom Checker shows "Rule-based" instead of AI. Why?',
    a: 'The LLM mode requires a Claude API Key in Settings → Integrations (ANTHROPIC_API_KEY). Without it, the built-in rule-based engine is used instead.',
  },
  {
    q: 'How do I bulk import patients from Excel?',
    a: 'Go to Patients → Import. Download the Excel template, fill it in with patient data, and upload the file. The system validates each row and reports any errors.',
  },
  {
    q: 'How do PhilHealth case rates work?',
    a: 'Case rates are loaded from the official PhilHealth schedule. When you create a PhilHealth claim, the system looks up the ICD-10 code and auto-applies the matching case rate. The rate covers 70% hospital share and 30% professional fee.',
  },
  {
    q: 'Why can\'t a user access certain pages?',
    a: 'Access is controlled by the user\'s Role. Each role has a predefined set of accessible modules (e.g., Billing staff cannot access the Nursing module). Check User Management and verify the correct role is assigned.',
  },
  {
    q: 'How do I change the hospital name and logo?',
    a: 'Go to Settings → Branding. Update the System Name, upload a logo (PNG/JPG/SVG, max 2MB), and adjust colors. Changes broadcast immediately to all logged-in users.',
  },
  {
    q: 'How does the real-time queue work?',
    a: 'The queue uses WebSocket (Socket.io). When a patient is added, called, or completed, all staff browser tabs update instantly — no refresh needed. The Queue Display page is designed for a waiting-room TV.',
  },
  {
    q: 'How do I generate a DOH FHSIS report?',
    a: 'Go to DOH Reporting, select the reporting period and report type (FHSIS or PIDSR). The system aggregates data from patient consultations and diagnoses automatically. ICD-10 codes in consultations must be accurate for correct counts.',
  },
  {
    q: 'How do patients log in to the Patient Portal?',
    a: 'Patients visit /portal/login and enter their Patient Number (format: P-YYYY-NNNNN, printed on their registration card or wristband) plus their Date of Birth. No separate password is required. The token expires after 7 days.',
  },
  {
    q: 'How does the ICU Fluid Balance work?',
    a: 'Nurses record Intake (IV fluids, oral, NG tube feeds) and Output (urine, drains, emesis) for each ICU patient. The system calculates the running 24-hour balance as Intake − Output. A warning badge appears when the balance exceeds ±2,000 mL.',
  },
  {
    q: 'What happens when a medication batch is recalled?',
    a: 'Change the batch status to RECALLED in Pharmacy → Inventory. The recalled batch is immediately excluded from available stock and will not be dispensed. Run a report of all patients who received that batch for investigation.',
  },
  {
    q: 'Why is a room not available for a new admission even though the patient was discharged?',
    a: 'Rooms must go through the housekeeping cycle before they can be assigned again: Dirty → In Progress → Inspected → Clean. Only rooms with status CLEAN can be assigned to new admissions. Ask the nursing station to complete the housekeeping checklist.',
  },
  {
    q: 'What is the Doctor Workspace?',
    a: 'The Doctor Workspace is a personalized dashboard that aggregates everything a physician needs in one view: their queue position, today\'s scheduled consultations, pending lab results, active problem list, and quick-action buttons. Access it from the sidebar under Workspace.',
  },
  {
    q: 'How does the Lab Work Queue differ from Lab Requisitions?',
    a: 'Lab Requisitions is for doctors to order tests. Lab Work Queue is the technician-facing prioritized worklist showing all pending specimens to process. STAT orders appear at the top in red. TAT breach warnings show when turnaround time targets are exceeded (STAT=60 min, URGENT=4h, ROUTINE=8h).',
  },
  {
    q: 'How do I print a Statement of Account (SOA)?',
    a: 'Open the patient\'s bill and click "View SOA" or navigate to Billing → SOA. The SOA shows all charges grouped by category, insurance deductions, discounts, payment history, and outstanding balance. Click "Print SOA" to generate the PDF.',
  },
  {
    q: 'How does the OB Partograph work?',
    a: 'Navigate to OB Dashboard and open an active delivery record. Enter cervical dilation (cm), fetal head descent station, and contraction frequency at each assessment time. The system plots the partograph automatically. An alert is triggered when the cervical dilation curve crosses the Alert Line (4 hours from expected normal progress).',
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────
const HelpCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allArticles = useMemo(
    () => Object.entries(HELP_CONTENT) as [string, HelpArticle][],
    []
  );

  const filteredArticles = useMemo(() => {
    let articles = allArticles;
    if (selectedCategory) {
      articles = articles.filter(([, a]) => a.category === selectedCategory);
    }
    if (search.trim().length >= 2) {
      const q = search.toLowerCase();
      articles = articles.filter(
        ([, a]) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.steps?.some((s) => s.toLowerCase().includes(q)) ||
          a.tips?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return articles;
  }, [allArticles, search, selectedCategory]);

  const categories = useMemo(
    () => [...new Set(allArticles.map(([, a]) => a.category).filter(Boolean))],
    [allArticles]
  ) as string[];

  const tabItems = [
    {
      key: 'browse',
      label: <Space><BookOutlined />Browse Articles</Space>,
      children: (
        <div>
          {/* Search + filter */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={14}>
              <Input
                size="large"
                placeholder="Search all help articles..."
                prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={10}>
              <Space wrap>
                <Tag
                  style={{ cursor: 'pointer', padding: '4px 12px', fontSize: 13 }}
                  color={!selectedCategory ? 'blue' : 'default'}
                  onClick={() => setSelectedCategory(null)}
                >
                  All ({allArticles.length})
                </Tag>
                {categories.map((cat) => {
                  const count = allArticles.filter(([, a]) => a.category === cat).length;
                  return (
                    <Tag
                      key={cat}
                      style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}
                      color={selectedCategory === cat ? (CATEGORIES[cat]?.color || 'blue') : 'default'}
                      onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    >
                      {CATEGORIES[cat]?.icon} {cat} ({count})
                    </Tag>
                  );
                })}
              </Space>
            </Col>
          </Row>

          {/* Article grid */}
          {filteredArticles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <QuestionCircleOutlined style={{ fontSize: 48, marginBottom: 12 }} />
              <br />
              No articles match your search.
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {filteredArticles.map(([path, article]) => (
                <Col xs={24} sm={12} lg={8} key={path}>
                  <Card
                    hoverable
                    size="small"
                    style={{ height: '100%', cursor: 'pointer' }}
                    onClick={() => navigate(path)}
                    title={
                      <Space>
                        <span style={{ color: CATEGORIES[article.category || '']?.color || '#1677ff' }}>
                          {CATEGORIES[article.category || '']?.icon || <InfoCircleOutlined />}
                        </span>
                        <Text strong style={{ fontSize: 14 }}>{article.title}</Text>
                      </Space>
                    }
                    extra={article.category ? <Tag style={{ fontSize: 11 }}>{article.category}</Tag> : null}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {article.description.substring(0, 100)}{article.description.length > 100 ? '…' : ''}
                    </Text>
                    {article.roles && (
                      <div style={{ marginTop: 8 }}>
                        {article.roles.slice(0, 3).map((r) => (
                          <Tag key={r} style={{ fontSize: 10, marginBottom: 2 }}>{r}</Tag>
                        ))}
                        {article.roles.length > 3 && (
                          <Tag style={{ fontSize: 10 }}>+{article.roles.length - 3}</Tag>
                        )}
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'quickstart',
      label: <Space><RocketOutlined />Quick Start by Role</Space>,
      children: (
        <Row gutter={[24, 24]}>
          {Object.entries(ROLE_GUIDES).map(([role, guide]) => (
            <Col xs={24} lg={12} key={role}>
              <Card
                title={
                  <Space>
                    <span style={{ color: guide.color, fontSize: 18 }}>{guide.icon}</span>
                    <Text strong>{role}</Text>
                  </Space>
                }
                size="small"
              >
                <ol style={{ paddingLeft: 20, margin: '0 0 12px' }}>
                  {guide.steps.map((step, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 13 }}>{step}</Text>
                    </li>
                  ))}
                </ol>
                <Divider style={{ margin: '8px 0' }} />
                <Text type="secondary" style={{ fontSize: 11 }}>Key modules: </Text>
                <Space wrap size={4} style={{ marginTop: 4 }}>
                  {guide.modules.map((m) => (
                    <Tag key={m} style={{ fontSize: 11 }}>{m}</Tag>
                  ))}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      ),
    },
    {
      key: 'workflows',
      label: <Space><BookOutlined />Workflows</Space>,
      children: (
        <Row gutter={[24, 24]}>
          {WORKFLOWS.map((wf) => (
            <Col xs={24} lg={12} key={wf.title}>
              <Card
                title={
                  <Space>
                    <Badge color={wf.color} />
                    <Text strong>{wf.title}</Text>
                    <Tag color={wf.color} style={{ fontSize: 11 }}>{wf.category}</Tag>
                  </Space>
                }
                size="small"
              >
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  {/* Vertical connector line */}
                  <div style={{
                    position: 'absolute', left: 8, top: 12, bottom: 12,
                    width: 2, background: '#e8e8e8', borderRadius: 1,
                  }} />
                  {wf.steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 10, position: 'relative' }}>
                      {/* Step number circle */}
                      <div style={{
                        position: 'absolute', left: -24, top: 2,
                        width: 18, height: 18, borderRadius: '50%',
                        background: wf.color, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                      <div>
                        <Text strong style={{ fontSize: 13 }}>{step.label}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{step.detail}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ),
    },
    {
      key: 'faq',
      label: <Space><QuestionCircleOutlined />FAQ</Space>,
      children: (
        <Collapse
          accordion
          items={FAQ.map((item, i) => ({
            key: i,
            label: <Text strong>{item.q}</Text>,
            children: <Paragraph style={{ margin: 0 }}>{item.a}</Paragraph>,
          }))}
        />
      ),
    },
    {
      key: 'shortcuts',
      label: <Space><KeyOutlined />Shortcuts</Space>,
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Keyboard Shortcuts" size="small">
              <List
                dataSource={SHORTCUTS}
                renderItem={(item) => (
                  <List.Item>
                    <Space>
                      {item.keys.map((k) => (
                        <kbd key={k} style={{
                          padding: '2px 8px', background: '#f5f5f5', border: '1px solid #d9d9d9',
                          borderRadius: 4, fontSize: 13, fontFamily: 'monospace',
                        }}>{k}</kbd>
                      ))}
                    </Space>
                    <Text style={{ marginLeft: 12 }}>{item.description}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Rate Limits" size="small">
              <List
                dataSource={[
                  { endpoint: 'Login', limit: '10 attempts / 15 min per IP' },
                  { endpoint: 'Forgot Password', limit: '3 requests / hour per IP' },
                  { endpoint: 'Reset Password', limit: '5 attempts / hour per IP' },
                  { endpoint: 'Change Password', limit: '5 attempts / 15 min per IP' },
                  { endpoint: 'All API endpoints', limit: '500 requests / 15 min per IP' },
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <Text strong style={{ minWidth: 160 }}>{item.endpoint}</Text>
                    <Tag color="orange">{item.limit}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="API Documentation" size="small" style={{ marginTop: 16 }}>
              <Alert
                type="info"
                showIcon
                message="Swagger UI available"
                description={
                  <span>
                    Full API reference at{' '}
                    <a href="http://localhost:3001/api/docs" target="_blank" rel="noreferrer">
                      http://localhost:3001/api/docs
                    </a>
                    {' '}(Swagger UI) or{' '}
                    <a href="http://localhost:3001/api/docs.json" target="_blank" rel="noreferrer">
                      /api/docs.json
                    </a>
                    {' '}for the raw JSON spec.
                  </span>
                }
              />
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <QuestionCircleOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            Help Center
          </Title>
          <Text type="secondary">Step-by-step guides, workflows, and reference documentation</Text>
        </Col>
      </Row>

      <Tabs items={tabItems} defaultActiveKey="browse" size="large" />
    </div>
  );
};

export default HelpCenterPage;
