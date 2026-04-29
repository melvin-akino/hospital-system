import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  DollarOutlined,
  TeamOutlined,
  AppstoreOutlined,
  HeartOutlined,
  ExperimentOutlined,
  RadarChartOutlined,
  ShoppingCartOutlined,
  CalendarOutlined,
  BankOutlined,
  SettingOutlined,
  ReadOutlined,
  AlertOutlined,
  SafetyOutlined,
  OrderedListOutlined,
  MonitorOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AuditOutlined,
  FundOutlined,
  HomeOutlined,
  ScissorOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  FileProtectOutlined,
  BarcodeOutlined,
  VideoCameraOutlined,
  RobotOutlined,
  FormOutlined,
  MessageOutlined,
  CreditCardOutlined,
  ShareAltOutlined,
  GlobalOutlined,
  ApartmentOutlined,
  FileSearchOutlined,
  ShopOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAuthStore, type AuthUser } from '../../store/authStore';
import { useBrandingStore } from '../../store/brandingStore';

const { Sider } = Layout;

// ── Role sets ─────────────────────────────────────────────────────────────────
const ADMIN_ROLES          = ['SUPER_ADMIN', 'ADMIN'];
const CLINICAL_ROLES       = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];
const BILLING_ROLES        = ['SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR', 'BILLING', 'RECEPTIONIST'];
const BILLING_MGMT_ROLES   = ['SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR', 'BILLING'];
const BILLING_SUPER_ROLES  = ['SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR'];
const PHARMACY_ROLES       = ['SUPER_ADMIN', 'ADMIN', 'PHARMACIST'];
const LAB_ROLES            = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECH'];
const RADIOLOGY_ROLES      = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RADIOLOGY_TECH'];
const NURSING_ROLES        = ['SUPER_ADMIN', 'ADMIN', 'NURSE', 'DOCTOR'];
const ACCOUNTING_ROLES     = ['SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR', 'BILLING'];
const ALL_STAFF            = ['SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'BILLING', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGY_TECH'];
const DOCTOR_ADMIN         = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'];
const LAB_OR_RADIOLOGY     = [...new Set([...LAB_ROLES, ...RADIOLOGY_ROLES])];
// Department workspace role sets
const ER_ROLES             = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];
const WORKSPACE_ROLES      = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'];
const NURSING_STATION_ROLES= ['SUPER_ADMIN', 'ADMIN', 'NURSE', 'DOCTOR', 'RECEPTIONIST'];
const MEDREC_ROLES         = ['SUPER_ADMIN', 'ADMIN', 'NURSE', 'DOCTOR', 'RECEPTIONIST'];
const DEPT_WORKSPACE_ROLES = [...new Set([...ER_ROLES, ...WORKSPACE_ROLES, ...PHARMACY_ROLES, ...LAB_ROLES, ...RADIOLOGY_ROLES, ...ALL_STAFF])];

// ── Menu item type ─────────────────────────────────────────────────────────────
interface RawMenuItem {
  key: string;
  icon?: React.ReactNode;
  label?: string;
  roles: string[];
  permissionModule?: string; // if set, user can also access via UserPermission.canView
  type?: 'divider';
  children?: RawMenuItem[];
}

const rawMenuItems: RawMenuItem[] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
    roles: ALL_STAFF,
  },
  {
    key: 'dept-workspaces',
    icon: <AppstoreOutlined />,
    label: 'My Workspace',
    roles: DEPT_WORKSPACE_ROLES,
    children: [
      { key: '/er-dashboard',      icon: <AlertOutlined />,        label: 'ER Dashboard',       roles: ER_ROLES },
      { key: '/workspace',         icon: <MedicineBoxOutlined />,  label: "Doctor's Workspace", roles: WORKSPACE_ROLES },
      { key: '/nursing-station',   icon: <HeartOutlined />,        label: 'Nursing Station',    roles: NURSING_STATION_ROLES },
      { key: '/or-dashboard',      icon: <ScissorOutlined />,      label: 'OR Dashboard',       roles: CLINICAL_ROLES },
      { key: '/icu-dashboard',     icon: <MonitorOutlined />,      label: 'ICU / CCU',          roles: CLINICAL_ROLES },
      { key: '/ob-dashboard',      icon: <HeartOutlined />,        label: 'OB / Delivery Room', roles: CLINICAL_ROLES },
      { key: '/pharmacy-queue',    icon: <ShoppingCartOutlined />, label: 'Pharmacy Queue',     roles: PHARMACY_ROLES },
      { key: '/lab-queue',         icon: <ExperimentOutlined />,   label: 'Lab Queue',          roles: LAB_ROLES },
      { key: '/radiology-queue',   icon: <RadarChartOutlined />,   label: 'Radiology Queue',    roles: RADIOLOGY_ROLES },
      { key: '/csr-queue',         icon: <ToolOutlined />,         label: 'CSR Queue',          roles: ALL_STAFF },
      { key: '/medical-records',   icon: <FileTextOutlined />,     label: 'Medical Records',    roles: MEDREC_ROLES },
    ],
  },
  {
    key: 'clinical',
    icon: <HeartOutlined />,
    label: 'Clinical',
    roles: CLINICAL_ROLES,
    children: [
      { key: '/patients',      icon: <UserOutlined />,        label: 'Patients',      roles: CLINICAL_ROLES },
      { key: '/consultations', icon: <FileTextOutlined />,    label: 'Consultations', roles: CLINICAL_ROLES },
      { key: '/doctors',       icon: <MedicineBoxOutlined />, label: 'Doctors',       roles: ALL_STAFF },
      { key: '/departments',   icon: <TeamOutlined />,        label: 'Departments',   roles: ALL_STAFF },
    ],
  },
  {
    key: 'emr-section',
    icon: <ReadOutlined />,
    label: 'Clinical Records',
    roles: CLINICAL_ROLES,
    children: [
      { key: '/emr', icon: <ReadOutlined />, label: 'Patient EMR', roles: CLINICAL_ROLES },
    ],
  },
  {
    key: 'billing',
    icon: <DollarOutlined />,
    label: 'Billing',
    roles: BILLING_ROLES,
    children: [
      { key: '/billing',                   icon: <DollarOutlined />,        label: 'Bills',                  roles: BILLING_ROLES },
      { key: '/billing/ordered-services', icon: <ShoppingCartOutlined />,  label: 'Dept. Orders Queue',     roles: BILLING_MGMT_ROLES },
      { key: '/dept-charges',             icon: <AppstoreOutlined />,      label: 'Department Charges',     roles: BILLING_MGMT_ROLES },
      { key: '/charge-requests',          icon: <AuditOutlined />,         label: 'Approval Queue',         roles: BILLING_SUPER_ROLES },
    ],
  },
  {
    key: 'services',
    icon: <AppstoreOutlined />,
    label: 'Services',
    roles: ALL_STAFF,
    children: [
      { key: '/services', icon: <AppstoreOutlined />, label: 'Service Catalog', roles: ALL_STAFF },
    ],
  },
  {
    key: 'lab-section',
    icon: <ExperimentOutlined />,
    label: 'Laboratory & Radiology',
    roles: LAB_OR_RADIOLOGY,
    children: [
      { key: '/lab/work-queue',    icon: <ThunderboltOutlined />,label: 'Work Queue',        roles: LAB_ROLES },
      { key: '/lab/requisitions',  icon: <FileTextOutlined />,  label: 'Lab Requisitions', roles: LAB_ROLES },
      { key: '/lab/results',       icon: <ExperimentOutlined />,label: 'Lab Results',       roles: LAB_ROLES },
      { key: '/lab/radiology/new', icon: <RadarChartOutlined />,label: 'Radiology Orders',  roles: RADIOLOGY_ROLES },
    ],
  },
  {
    key: 'pharmacy-section',
    icon: <ShoppingCartOutlined />,
    label: 'Pharmacy',
    roles: PHARMACY_ROLES,
    children: [
      { key: '/pharmacy/pos',                  icon: <DollarOutlined />,      label: 'POS Terminal',    roles: PHARMACY_ROLES },
      { key: '/pharmacy/sales',               icon: <BarChartOutlined />,    label: 'Sales & Z-Report',roles: PHARMACY_ROLES },
      { key: '/pharmacy/medications',         icon: <MedicineBoxOutlined />, label: 'Medications',     roles: PHARMACY_ROLES },
      { key: '/pharmacy/inventory',           icon: <AppstoreOutlined />,    label: 'Inventory',       roles: PHARMACY_ROLES },
      { key: '/pharmacy/suppliers',           icon: <ShopOutlined />,        label: 'Suppliers',       roles: PHARMACY_ROLES },
      { key: '/pharmacy/alerts',              icon: <AlertOutlined />,       label: 'Stock Alerts',    roles: PHARMACY_ROLES },
      { key: '/pharmacy/purchase-orders',     icon: <ShoppingCartOutlined />,label: 'Purchase Orders', roles: PHARMACY_ROLES },
    ],
  },
  {
    key: 'queue-section',
    icon: <OrderedListOutlined />,
    label: 'Queue Management',
    roles: CLINICAL_ROLES,
    children: [
      { key: '/queue/display',     icon: <MonitorOutlined />,     label: 'Queue Display',  roles: CLINICAL_ROLES },
      { key: '/queue/management',  icon: <OrderedListOutlined />, label: 'Manage Queues',  roles: CLINICAL_ROLES },
    ],
  },
  {
    key: 'hmo-section',
    icon: <SafetyOutlined />,
    label: 'HMO Processing',
    roles: BILLING_ROLES,
    children: [
      { key: '/hmo/registrations',  icon: <UserOutlined />,    label: 'Registrations',    roles: BILLING_ROLES },
      { key: '/hmo/claims',         icon: <FileTextOutlined />,label: 'Claims',            roles: BILLING_ROLES },
      { key: '/hmo/eligibility',    icon: <SafetyOutlined />,  label: 'Eligibility Check', roles: BILLING_ROLES },
      { key: '/hmo/direct-billing', icon: <AuditOutlined />,   label: 'Direct Billing API',roles: BILLING_ROLES },
    ],
  },
  {
    key: 'philhealth-section',
    icon: <SafetyOutlined />,
    label: 'PhilHealth',
    roles: BILLING_ROLES,
    children: [
      { key: '/philhealth/claims',     icon: <FileTextOutlined />, label: 'Claims List',    roles: BILLING_ROLES },
      { key: '/philhealth/claims/new', icon: <AuditOutlined />,    label: 'Create Claim',   roles: BILLING_ROLES },
      { key: '/philhealth/case-rates', icon: <SafetyOutlined />,   label: 'Case Rates',     roles: BILLING_ROLES },
      { key: '/philhealth/eclaims',    icon: <AuditOutlined />,    label: 'eClaims API',    roles: BILLING_ROLES },
    ],
  },
  {
    key: 'accounting-section',
    icon: <BankOutlined />,
    label: 'Accounting',
    roles: ACCOUNTING_ROLES,
    children: [
      { key: '/accounting/chart-of-accounts', icon: <BankOutlined />,      label: 'Chart of Accounts', roles: ACCOUNTING_ROLES },
      { key: '/accounting/journal-entry',     icon: <AuditOutlined />,     label: 'Journal Entry',     roles: ACCOUNTING_ROLES },
      { key: '/accounting/trial-balance',     icon: <BarChartOutlined />,  label: 'Trial Balance',     roles: ACCOUNTING_ROLES },
      { key: '/accounting/income-statement',  icon: <LineChartOutlined />, label: 'Income Statement',  roles: ACCOUNTING_ROLES },
      { key: '/accounting/balance-sheet',     icon: <FundOutlined />,      label: 'Balance Sheet',     roles: ACCOUNTING_ROLES },
    ],
  },
  {
    key: 'analytics-section',
    icon: <BarChartOutlined />,
    label: 'Analytics & Reports',
    roles: ACCOUNTING_ROLES,
    children: [
      { key: '/analytics',          icon: <DashboardOutlined />,   label: 'Dashboard',         roles: ACCOUNTING_ROLES },
      { key: '/analytics/revenue',  icon: <DollarOutlined />,      label: 'Revenue Report',    roles: ACCOUNTING_ROLES },
      { key: '/analytics/patients', icon: <PieChartOutlined />,    label: 'Patient Metrics',   roles: ACCOUNTING_ROLES },
      { key: '/analytics/doctors',  icon: <MedicineBoxOutlined />, label: 'Doctor Performance',roles: ACCOUNTING_ROLES },
    ],
  },
  {
    key: 'admissions-section',
    icon: <HomeOutlined />,
    label: 'Admitting & Rooms',
    roles: CLINICAL_ROLES,
    children: [
      { key: '/admitting',        icon: <UserOutlined />,    label: 'Admitting Desk',  roles: CLINICAL_ROLES },
      { key: '/admissions/rooms', icon: <HomeOutlined />,    label: 'Room Status',     roles: CLINICAL_ROLES },
      { key: '/admissions/list',  icon: <FileTextOutlined />,label: 'Admissions List', roles: CLINICAL_ROLES },
    ],
  },
  {
    key: 'or-section',
    icon: <ScissorOutlined />,
    label: 'Operating Room',
    roles: CLINICAL_ROLES,
    children: [
      { key: '/or/schedule',     icon: <CalendarOutlined />, label: 'OR Schedule',  roles: CLINICAL_ROLES },
      { key: '/or/schedule/new', icon: <ScissorOutlined />,  label: 'Book Surgery', roles: DOCTOR_ADMIN },
    ],
  },
  {
    key: 'bloodbank-section',
    icon: <HeartOutlined />,
    label: 'Blood Bank',
    roles: CLINICAL_ROLES,
    children: [
      { key: '/bloodbank/inventory',    icon: <DatabaseOutlined />, label: 'Blood Inventory', roles: CLINICAL_ROLES },
      { key: '/bloodbank/donors',       icon: <UserOutlined />,     label: 'Donors',          roles: CLINICAL_ROLES },
      { key: '/bloodbank/transfusions', icon: <AlertOutlined />,    label: 'Transfusions',    roles: CLINICAL_ROLES },
    ],
  },
  {
    key: 'dialysis-section',
    icon: <ClockCircleOutlined />,
    label: 'Dialysis Center',
    roles: CLINICAL_ROLES,
    children: [
      { key: '/dialysis/schedule', icon: <CalendarOutlined />, label: 'Schedule',        roles: CLINICAL_ROLES },
      { key: '/dialysis/active',   icon: <MonitorOutlined />,  label: 'Active Sessions', roles: CLINICAL_ROLES },
      { key: '/dialysis/machines', icon: <ToolOutlined />,     label: 'Machines',        roles: ADMIN_ROLES },
    ],
  },
  {
    key: 'nursing-section',
    icon: <FormOutlined />,
    label: 'Nursing',
    roles: NURSING_ROLES,
    children: [
      { key: '/nurses',            icon: <FormOutlined />,    label: 'Nurse Dashboard', roles: NURSING_ROLES },
      { key: '/nurses/vitals',     icon: <MonitorOutlined />, label: 'Record Vitals',   roles: NURSING_ROLES },
      { key: '/nurses/care-plans', icon: <FileTextOutlined />,label: 'Care Plans',      roles: NURSING_ROLES },
      { key: '/nurses/handover',   icon: <AuditOutlined />,   label: 'Shift Handover',  roles: NURSING_ROLES },
    ],
  },
  {
    key: 'appointments-section',
    icon: <CalendarOutlined />,
    label: 'Appointments',
    roles: CLINICAL_ROLES,
    children: [
      { key: '/appointments',              icon: <CalendarOutlined />, label: 'All Appointments', roles: CLINICAL_ROLES },
      { key: '/appointments/new',          icon: <UserOutlined />,     label: 'Book Appointment', roles: CLINICAL_ROLES },
      { key: '/appointments/availability', icon: <MonitorOutlined />,  label: 'Availability',     roles: CLINICAL_ROLES },
    ],
  },
  {
    key: 'telemedicine-section',
    icon: <VideoCameraOutlined />,
    label: 'Telemedicine',
    roles: CLINICAL_ROLES,
    children: [
      { key: '/telemedicine',       icon: <VideoCameraOutlined />, label: 'Sessions',          roles: DOCTOR_ADMIN },
      { key: '/telemedicine/book',  icon: <CalendarOutlined />,    label: 'Book Session',      roles: CLINICAL_ROLES },
      { key: '/telemedicine/notes', icon: <FileTextOutlined />,    label: 'Consultation Notes',roles: DOCTOR_ADMIN },
    ],
  },
  {
    key: 'ai-section',
    icon: <RobotOutlined />,
    label: 'AI Decision Support',
    roles: DOCTOR_ADMIN,
    children: [
      { key: '/ai/clinical-support', icon: <RobotOutlined />, label: 'Clinical AI', roles: DOCTOR_ADMIN },
    ],
  },
  {
    key: 'doh-section',
    icon: <FileProtectOutlined />,
    label: 'DOH Reporting',
    roles: ADMIN_ROLES,
    children: [
      { key: '/doh/reporting', icon: <FileProtectOutlined />, label: 'Reports', roles: ADMIN_ROLES },
    ],
  },
  {
    key: 'barcode-section',
    icon: <BarcodeOutlined />,
    label: 'Barcode & RFID',
    roles: CLINICAL_ROLES,
    children: [
      { key: '/barcode/scanner',   icon: <BarcodeOutlined />, label: 'Scanner',          roles: CLINICAL_ROLES },
      { key: '/barcode/wristband', icon: <UserOutlined />,    label: 'Patient Wristband', roles: CLINICAL_ROLES },
    ],
  },
  {
    key: 'assets-section',
    icon: <ToolOutlined />,
    label: 'Asset Management',
    roles: ADMIN_ROLES,
    children: [
      { key: '/assets',            icon: <AppstoreOutlined />, label: 'Assets',         roles: ADMIN_ROLES },
      { key: '/assets/new',        icon: <ToolOutlined />,     label: 'Register Asset', roles: ADMIN_ROLES },
      { key: '/assets/depreciation',icon: <BarChartOutlined />,label: 'Depreciation',   roles: ADMIN_ROLES },
    ],
  },
  {
    key: 'sms-section',
    icon: <MessageOutlined />,
    label: 'SMS Notifications',
    roles: ADMIN_ROLES,
    children: [
      { key: '/sms', icon: <MessageOutlined />, label: 'SMS Dashboard', roles: ADMIN_ROLES },
    ],
  },
  {
    key: 'online-payments-section',
    icon: <CreditCardOutlined />,
    label: 'Online Payments',
    roles: BILLING_ROLES,
    children: [
      { key: '/payments/online',       icon: <CreditCardOutlined />, label: 'Process Payment', roles: BILLING_ROLES },
      { key: '/payments/transactions', icon: <DollarOutlined />,     label: 'Transactions',    roles: BILLING_ROLES },
    ],
  },
  {
    key: 'hie-section',
    icon: <ShareAltOutlined />,
    label: 'HIE / Interoperability',
    roles: ADMIN_ROLES,
    children: [
      { key: '/hie', icon: <GlobalOutlined />, label: 'HIE Dashboard', roles: ADMIN_ROLES },
    ],
  },
  {
    key: 'admin-divider',
    type: 'divider',
    roles: ADMIN_ROLES,
  },
  {
    key: 'admin-section',
    icon: <SettingOutlined />,
    label: 'Administration',
    roles: ADMIN_ROLES,
    children: [
      { key: '/settings',   icon: <SettingOutlined />,   label: 'Settings',         roles: ADMIN_ROLES },
      { key: '/users',      icon: <ApartmentOutlined />, label: 'User Management',  roles: ADMIN_ROLES },
      { key: '/audit-log',  icon: <FileSearchOutlined />,label: 'Audit Log',        roles: ADMIN_ROLES },
    ],
  },
];

// ── Filtering helpers ──────────────────────────────────────────────────────────
function canSeeItem(item: RawMenuItem, user: AuthUser): boolean {
  // Role-based access
  if (item.roles.includes(user.role)) return true;
  // Extra permission granted by admin
  if (item.permissionModule && user.permissions) {
    return user.permissions.some(
      (p) => p.module === item.permissionModule && p.canView
    );
  }
  return false;
}

function filterItems(items: RawMenuItem[], user: AuthUser) {
  const result: RawMenuItem[] = [];
  for (const item of items) {
    if (!canSeeItem(item, user)) continue;

    if (item.children) {
      const filteredChildren = item.children.filter((c) => canSeeItem(c, user));
      if (filteredChildren.length === 0) continue;
      result.push({ ...item, children: filteredChildren });
    } else {
      result.push(item);
    }
  }
  return result;
}

// Strip custom `roles` field before passing to Ant Design Menu
function toAntItems(items: RawMenuItem[]): object[] {
  return items.map(({ roles: _roles, children, ...rest }) => {
    if (rest.type === 'divider') return { type: 'divider', key: rest.key };
    return {
      ...rest,
      ...(children ? { children: toAntItems(children) } : {}),
    };
  });
}

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { systemName, systemSubtitle, logoUrl, primaryColor, sidebarColor } = useBrandingStore();
  const [openKeys, setOpenKeys] = useState<string[]>(['dept-workspaces', 'clinical', 'billing']);

  const selectedKey = location.pathname;

  const visibleItems = user
    ? toAntItems(filterItems(rawMenuItems, user))
    : [];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('/')) {
      navigate(key);
    }
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      style={{
        background: sidebarColor,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        overflow: 'auto',
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/dashboard')}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="logo"
            style={{
              height: 32,
              width: 32,
              objectFit: 'contain',
              flexShrink: 0,
              borderRadius: 4,
            }}
          />
        ) : (
          <MedicineBoxOutlined style={{ fontSize: 24, color: primaryColor, flexShrink: 0 }} />
        )}
        {!collapsed && (
          <div style={{ marginLeft: 8, overflow: 'hidden' }}>
            <div style={{
              color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {systemName}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.5)', fontSize: 10,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {systemSubtitle}
            </div>
          </div>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        openKeys={collapsed ? [] : openKeys}
        onOpenChange={setOpenKeys}
        onClick={handleMenuClick}
        items={visibleItems}
        style={{ borderRight: 0, paddingTop: 8, background: sidebarColor }}
      />
    </Sider>
  );
};

export default Sidebar;
