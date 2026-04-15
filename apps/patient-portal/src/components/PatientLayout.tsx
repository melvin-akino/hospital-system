import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Typography, theme } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  CalendarOutlined,
  DollarOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePatientAuthStore } from '../store/authStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/medical-records', icon: <FileTextOutlined />, label: 'Medical Records' },
  { key: '/lab-results', icon: <ExperimentOutlined />, label: 'Lab Results' },
  { key: '/appointments', icon: <CalendarOutlined />, label: 'Appointments' },
  { key: '/bills', icon: <DollarOutlined />, label: 'My Bills' },
];

interface PatientLayoutProps {
  children: React.ReactNode;
}

const PatientLayout: React.FC<PatientLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { patient, logout } = usePatientAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const fullName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : 'Patient';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Fixed Top Header */}
      <Header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: '#0891b2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: 64,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        {/* Logo + Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#fff', fontSize: 18 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#fff',
                fontSize: 14,
              }}
            >
              P
            </div>
            <Text
              style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '-0.3px',
              }}
            >
              iHIMS Patient Portal
            </Text>
          </div>
        </div>

        {/* Patient info + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar
              size={32}
              icon={<UserOutlined />}
              style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <Text style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>
                {fullName}
              </Text>
              {patient?.patientNo && (
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                  {patient.patientNo}
                </Text>
              )}
            </div>
          </div>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
          >
            Logout
          </Button>
        </div>
      </Header>

      <Layout style={{ marginTop: 64 }}>
        {/* Left Sidebar */}
        <Sider
          collapsed={collapsed}
          collapsedWidth={64}
          width={220}
          style={{
            position: 'fixed',
            left: 0,
            top: 64,
            bottom: 0,
            backgroundColor: '#fff',
            boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
            overflow: 'auto',
            zIndex: 999,
          }}
          theme="light"
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{
              borderRight: 'none',
              paddingTop: 8,
            }}
          />
        </Sider>

        {/* Main Content */}
        <Layout
          style={{
            marginLeft: collapsed ? 64 : 220,
            transition: 'margin-left 0.2s',
          }}
        >
          <Content
            style={{
              minHeight: 'calc(100vh - 64px)',
              backgroundColor: '#f5f5f5',
              padding: 24,
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default PatientLayout;
