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
} from '@ant-design/icons';

const { Sider } = Layout;

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: 'clinical',
    icon: <HeartOutlined />,
    label: 'Clinical',
    children: [
      { key: '/patients', icon: <UserOutlined />, label: 'Patients' },
      { key: '/consultations', icon: <FileTextOutlined />, label: 'Consultations' },
      { key: '/doctors', icon: <MedicineBoxOutlined />, label: 'Doctors' },
      { key: '/departments', icon: <TeamOutlined />, label: 'Departments' },
    ],
  },
  {
    key: 'emr-section',
    icon: <ReadOutlined />,
    label: 'Clinical Records',
    children: [
      { key: '/emr', icon: <ReadOutlined />, label: 'Patient EMR' },
    ],
  },
  {
    key: 'billing',
    icon: <DollarOutlined />,
    label: 'Billing',
    children: [
      { key: '/billing', icon: <DollarOutlined />, label: 'Bills' },
    ],
  },
  {
    key: 'services',
    icon: <AppstoreOutlined />,
    label: 'Services',
    children: [
      { key: '/services', icon: <AppstoreOutlined />, label: 'Service Catalog' },
    ],
  },
  {
    key: 'lab-section',
    icon: <ExperimentOutlined />,
    label: 'Laboratory & Radiology',
    children: [
      { key: '/lab/requisitions', icon: <FileTextOutlined />, label: 'Lab Requisitions' },
      { key: '/lab/results', icon: <ExperimentOutlined />, label: 'Lab Results' },
      { key: '/lab/radiology/new', icon: <RadarChartOutlined />, label: 'Radiology Orders' },
    ],
  },
  {
    key: 'pharmacy-section',
    icon: <ShoppingCartOutlined />,
    label: 'Pharmacy',
    children: [
      { key: '/pharmacy/medications', icon: <MedicineBoxOutlined />, label: 'Medications' },
      { key: '/pharmacy/inventory', icon: <AppstoreOutlined />, label: 'Inventory' },
      { key: '/pharmacy/alerts', icon: <AlertOutlined />, label: 'Stock Alerts' },
      { key: '/pharmacy/purchase-orders/new', icon: <ShoppingCartOutlined />, label: 'Purchase Orders' },
    ],
  },
  {
    key: 'queue-section',
    icon: <OrderedListOutlined />,
    label: 'Queue Management',
    children: [
      { key: '/queue/display', icon: <MonitorOutlined />, label: 'Queue Display' },
      { key: '/queue/management', icon: <OrderedListOutlined />, label: 'Manage Queues' },
    ],
  },
  {
    key: 'hmo-section',
    icon: <SafetyOutlined />,
    label: 'HMO Processing',
    children: [
      { key: '/hmo/registrations', icon: <UserOutlined />, label: 'Registrations' },
      { key: '/hmo/claims', icon: <FileTextOutlined />, label: 'Claims' },
      { key: '/hmo/eligibility', icon: <SafetyOutlined />, label: 'Eligibility Check' },
      { key: '/hmo/direct-billing', icon: <AuditOutlined />, label: 'Direct Billing API' },
    ],
  },
  {
    key: 'scheduling',
    icon: <CalendarOutlined />,
    label: 'Scheduling',
    children: [
      { key: '/appointments', icon: <CalendarOutlined />, label: 'Appointments' },
    ],
  },
  {
    key: 'philhealth-section',
    icon: <SafetyOutlined />,
    label: 'PhilHealth',
    children: [
      { key: '/philhealth/claims', icon: <FileTextOutlined />, label: 'Claims List' },
      { key: '/philhealth/claims/new', icon: <AuditOutlined />, label: 'Create Claim' },
      { key: '/philhealth/case-rates', icon: <SafetyOutlined />, label: 'Case Rates' },
      { key: '/philhealth/eclaims', icon: <AuditOutlined />, label: 'eClaims API' },
    ],
  },
  {
    key: 'accounting-section',
    icon: <BankOutlined />,
    label: 'Accounting',
    children: [
      { key: '/accounting/chart-of-accounts', icon: <BankOutlined />, label: 'Chart of Accounts' },
      { key: '/accounting/journal-entry', icon: <AuditOutlined />, label: 'Journal Entry' },
      { key: '/accounting/trial-balance', icon: <BarChartOutlined />, label: 'Trial Balance' },
      { key: '/accounting/income-statement', icon: <LineChartOutlined />, label: 'Income Statement' },
      { key: '/accounting/balance-sheet', icon: <FundOutlined />, label: 'Balance Sheet' },
    ],
  },
  {
    key: 'analytics-section',
    icon: <BarChartOutlined />,
    label: 'Analytics & Reports',
    children: [
      { key: '/analytics', icon: <DashboardOutlined />, label: 'Dashboard' },
      { key: '/analytics/revenue', icon: <DollarOutlined />, label: 'Revenue Report' },
      { key: '/analytics/patients', icon: <PieChartOutlined />, label: 'Patient Metrics' },
      { key: '/analytics/doctors', icon: <MedicineBoxOutlined />, label: 'Doctor Performance' },
    ],
  },
  {
    key: 'admissions-section',
    icon: <HomeOutlined />,
    label: 'Rooms & Admissions',
    children: [
      { key: '/admissions/rooms', icon: <HomeOutlined />, label: 'Room Status' },
      { key: '/admissions/list', icon: <FileTextOutlined />, label: 'Admissions' },
      { key: '/admissions/new', icon: <UserOutlined />, label: 'Admit Patient' },
    ],
  },
  {
    key: 'or-section',
    icon: <ScissorOutlined />,
    label: 'Operating Room',
    children: [
      { key: '/or/schedule', icon: <CalendarOutlined />, label: 'OR Schedule' },
      { key: '/or/schedule/new', icon: <ScissorOutlined />, label: 'Book Surgery' },
    ],
  },
  {
    key: 'bloodbank-section',
    icon: <HeartOutlined />,
    label: 'Blood Bank',
    children: [
      { key: '/bloodbank/inventory', icon: <DatabaseOutlined />, label: 'Blood Inventory' },
      { key: '/bloodbank/donors', icon: <UserOutlined />, label: 'Donors' },
      { key: '/bloodbank/transfusions', icon: <AlertOutlined />, label: 'Transfusions' },
    ],
  },
  {
    key: 'assets-section',
    icon: <ToolOutlined />,
    label: 'Asset Management',
    children: [
      { key: '/assets', icon: <AppstoreOutlined />, label: 'Assets' },
      { key: '/assets/new', icon: <ToolOutlined />, label: 'Register Asset' },
      { key: '/assets/depreciation', icon: <BarChartOutlined />, label: 'Depreciation' },
    ],
  },
  {
    key: 'dialysis-section',
    icon: <ClockCircleOutlined />,
    label: 'Dialysis Center',
    children: [
      { key: '/dialysis/schedule', icon: <CalendarOutlined />, label: 'Schedule' },
      { key: '/dialysis/active', icon: <MonitorOutlined />, label: 'Active Sessions' },
      { key: '/dialysis/machines', icon: <ToolOutlined />, label: 'Machines' },
    ],
  },
  {
    key: 'doh-section',
    icon: <FileProtectOutlined />,
    label: 'DOH Reporting',
    children: [
      { key: '/doh/reporting', icon: <FileProtectOutlined />, label: 'Reports' },
    ],
  },
  {
    key: 'barcode-section',
    icon: <BarcodeOutlined />,
    label: 'Barcode & RFID',
    children: [
      { key: '/barcode/scanner', icon: <BarcodeOutlined />, label: 'Scanner' },
      { key: '/barcode/wristband', icon: <UserOutlined />, label: 'Patient Wristband' },
    ],
  },
  {
    key: 'telemedicine-section',
    icon: <VideoCameraOutlined />,
    label: 'Telemedicine',
    children: [
      { key: '/telemedicine', icon: <VideoCameraOutlined />, label: 'Sessions' },
      { key: '/telemedicine/book', icon: <CalendarOutlined />, label: 'Book Session' },
      { key: '/telemedicine/notes', icon: <FileTextOutlined />, label: 'Consultation Notes' },
    ],
  },
  {
    key: 'ai-section',
    icon: <RobotOutlined />,
    label: 'AI Decision Support',
    children: [
      { key: '/ai/clinical-support', icon: <RobotOutlined />, label: 'Clinical AI' },
    ],
  },
  {
    key: 'nursing-section',
    icon: <FormOutlined />,
    label: 'Nursing',
    children: [
      { key: '/nurses', icon: <FormOutlined />, label: 'Nurse Dashboard' },
      { key: '/nurses/vitals', icon: <MonitorOutlined />, label: 'Record Vitals' },
      { key: '/nurses/care-plans', icon: <FileTextOutlined />, label: 'Care Plans' },
      { key: '/nurses/handover', icon: <AuditOutlined />, label: 'Shift Handover' },
    ],
  },
  {
    key: 'appointments-section',
    icon: <CalendarOutlined />,
    label: 'Appointments',
    children: [
      { key: '/appointments', icon: <CalendarOutlined />, label: 'All Appointments' },
      { key: '/appointments/new', icon: <UserOutlined />, label: 'Book Appointment' },
      { key: '/appointments/availability', icon: <MonitorOutlined />, label: 'Availability' },
    ],
  },
  {
    key: 'sms-section',
    icon: <MessageOutlined />,
    label: 'SMS Notifications',
    children: [
      { key: '/sms', icon: <MessageOutlined />, label: 'SMS Dashboard' },
    ],
  },
  {
    key: 'online-payments-section',
    icon: <CreditCardOutlined />,
    label: 'Online Payments',
    children: [
      { key: '/payments/online', icon: <CreditCardOutlined />, label: 'Process Payment' },
      { key: '/payments/transactions', icon: <DollarOutlined />, label: 'Transactions' },
    ],
  },
  {
    key: 'hie-section',
    icon: <ShareAltOutlined />,
    label: 'HIE / Interoperability',
    children: [
      { key: '/hie', icon: <GlobalOutlined />, label: 'HIE Dashboard' },
    ],
  },
  {
    key: 'admin-section',
    icon: <SettingOutlined />,
    label: 'Administration',
    children: [
      { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
      { key: '/users', icon: <ApartmentOutlined />, label: 'User Management' },
      { key: '/audit-log', icon: <FileSearchOutlined />, label: 'Audit Log' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState<string[]>(['clinical', 'billing']);

  const selectedKey = location.pathname;

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
        background: '#001529',
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
        <MedicineBoxOutlined style={{ fontSize: 24, color: '#1890ff', flexShrink: 0 }} />
        {!collapsed && (
          <div style={{ marginLeft: 8 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
              PIBS
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Billing System</div>
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
        items={menuItems}
        style={{ borderRight: 0, paddingTop: 8 }}
      />
    </Sider>
  );
};

export default Sidebar;
