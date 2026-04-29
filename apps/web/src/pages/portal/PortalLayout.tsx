import React from 'react';
import { Layout, Menu, Avatar, Typography, Space, Button, Tag } from 'antd';
import {
  DashboardOutlined, CalendarOutlined, ExperimentOutlined,
  MedicineBoxOutlined, CreditCardOutlined, UserOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../store/portalAuthStore';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const MENU_ITEMS = [
  { key: '/portal/dashboard',      icon: <DashboardOutlined />,    label: 'Dashboard' },
  { key: '/portal/appointments',   icon: <CalendarOutlined />,      label: 'My Appointments' },
  { key: '/portal/lab-results',    icon: <ExperimentOutlined />,    label: 'Lab Results' },
  { key: '/portal/prescriptions',  icon: <MedicineBoxOutlined />,   label: 'Prescriptions' },
  { key: '/portal/bills',          icon: <CreditCardOutlined />,    label: 'My Bills' },
  { key: '/portal/profile',        icon: <UserOutlined />,          label: 'My Profile' },
];

const PortalLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { patient, isAuthenticated, logout } = usePortalAuthStore();

  if (!isAuthenticated) return <Navigate to="/portal/login" replace />;

  const fullName = patient
    ? `${patient.firstName} ${patient.middleName ? patient.middleName[0] + '. ' : ''}${patient.lastName}`
    : 'Patient';

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        style={{
          background: 'linear-gradient(180deg, #0f766e 0%, #0e7490 100%)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '24px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}>
          <Space>
            <MedicineBoxOutlined style={{ fontSize: 22, color: '#5eead4' }} />
            <div>
              <Text style={{ color: '#fff', fontWeight: 700, fontSize: 14, display: 'block', lineHeight: 1.2 }}>
                Patient Portal
              </Text>
              <Text style={{ color: '#99f6e4', fontSize: 11 }}>iHIMS</Text>
            </div>
          </Space>
        </div>

        {/* Patient info */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Avatar
              size={40}
              style={{ background: '#0d9488', border: '2px solid rgba(255,255,255,0.3)' }}
            >
              {patient?.firstName?.[0]}{patient?.lastName?.[0]}
            </Avatar>
            <Text style={{ color: '#f0fdfa', fontWeight: 600, fontSize: 13, display: 'block' }}>
              {fullName}
            </Text>
            <Tag color="cyan" style={{ fontSize: 10, margin: 0 }}>
              {patient?.patientNo}
            </Tag>
          </Space>
        </div>

        {/* Nav */}
        <Menu
          selectedKeys={[location.pathname]}
          mode="inline"
          onClick={({ key }) => navigate(key)}
          items={MENU_ITEMS}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: 8,
          }}
          theme="dark"
        />

        {/* Logout */}
        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, padding: '0 16px' }}>
          <Button
            block
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#f0fdfa',
              borderRadius: 8,
            }}
          >
            Sign Out
          </Button>
        </div>
      </Sider>

      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          height: 56,
        }}>
          <Text style={{ color: '#0f766e', fontWeight: 600 }}>
            Welcome back, {patient?.firstName}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Your personal health records dashboard
          </Text>
        </Header>

        <Content style={{ padding: 24, background: '#f0fdfa', minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default PortalLayout;
