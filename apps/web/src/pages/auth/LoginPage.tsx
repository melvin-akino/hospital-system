import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert, Collapse, Tag, Divider } from 'antd';
import { UserOutlined, LockOutlined, MedicineBoxOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Navigate, Link } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';
import { useAuthStore, getDashboardPath } from '../../store/authStore';
import { useBrandingStore } from '../../store/brandingStore';

const { Title, Text } = Typography;

const DEMO_ACCOUNTS = [
  { role: 'Super Admin',       username: 'admin',           password: 'admin123',  color: 'red' },
  { role: 'Doctor (ER)',       username: 'er.doctor1',      password: 'pibs2024',  color: 'blue' },
  { role: 'Doctor (ICU)',      username: 'icu.doctor1',     password: 'pibs2024',  color: 'blue' },
  { role: 'Doctor (OR)',       username: 'or.doctor1',      password: 'pibs2024',  color: 'blue' },
  { role: 'Doctor (OB)',       username: 'ob.doctor1',      password: 'pibs2024',  color: 'blue' },
  { role: 'Nurse (ER)',        username: 'er.nurse1',       password: 'pibs2024',  color: 'cyan' },
  { role: 'Nurse (ICU)',       username: 'icu.nurse1',      password: 'pibs2024',  color: 'cyan' },
  { role: 'Nurse (OB)',        username: 'ob.nurse1',       password: 'pibs2024',  color: 'cyan' },
  { role: 'Receptionist',      username: 'admitting1',      password: 'pibs2024',  color: 'green' },
  { role: 'Billing',           username: 'billing1',        password: 'pibs2024',  color: 'gold' },
  { role: 'Billing Supervisor',username: 'bilsup1',         password: 'pibs2024',  color: 'orange' },
  { role: 'Pharmacist',        username: 'pharmacist1',     password: 'pibs2024',  color: 'purple' },
  { role: 'Lab Tech',          username: 'labtech1',        password: 'pibs2024',  color: 'geekblue' },
];

const LoginPage: React.FC = () => {
  const { mutate: login, isPending, error } = useLogin();
  const { isAuthenticated, user } = useAuthStore();
  const { systemName, systemSubtitle, logoUrl, primaryColor } = useBrandingStore();
  const [form] = Form.useForm();

  if (isAuthenticated && user) return <Navigate to={getDashboardPath(user)} replace />;

  const onFinish = (values: { username: string; password: string }) => {
    login(values);
  };

  const fillCredentials = (username: string, password: string) => {
    form.setFieldsValue({ username, password });
  };

  const errorMsg =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, #001529 0%, #003a8c 50%, ${primaryColor} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Logo / Brand */}
          <div style={{ textAlign: 'center' }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={systemName}
                style={{ height: 64, maxWidth: 200, objectFit: 'contain', marginBottom: 8 }}
              />
            ) : (
              <MedicineBoxOutlined style={{ fontSize: 48, color: primaryColor }} />
            )}
            <Title level={2} style={{ margin: '8px 0 0', color: '#001529' }}>
              {systemName}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {systemSubtitle}
            </Text>
          </div>

          {errorMsg && (
            <Alert message={errorMsg} type="error" showIcon closable />
          )}

          <Form
            form={form}
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Username or Email"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Password"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isPending}
                block
                style={{ height: 44, fontSize: 16 }}
              >
                Sign In
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'right' }}>
              <Link to="/forgot-password">
                <Button type="link" size="small" style={{ padding: 0 }}>
                  Forgot password?
                </Button>
              </Link>
            </div>
          </Form>

          {/* Demo credentials panel */}
          <Collapse
            size="small"
            ghost
            items={[{
              key: 'demo',
              label: (
                <Space>
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  <Text style={{ fontSize: 12, color: '#1890ff' }}>Demo Accounts</Text>
                </Space>
              ),
              children: (
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {DEMO_ACCOUNTS.map((acc) => (
                    <div
                      key={acc.username}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0',
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer',
                      }}
                      onClick={() => fillCredentials(acc.username, acc.password)}
                    >
                      <Space size={4}>
                        <Tag color={acc.color} style={{ fontSize: 10, margin: 0 }}>{acc.role}</Tag>
                        <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{acc.username}</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 10 }}>click to fill</Text>
                    </div>
                  ))}
                  <Divider style={{ margin: '8px 0 4px' }} />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Admin password: <Text code style={{ fontSize: 11 }}>admin123</Text>
                    &nbsp;· All others: <Text code style={{ fontSize: 11 }}>pibs2024</Text>
                  </Text>
                </div>
              ),
            }]}
          />

          <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>
            &copy; {new Date().getFullYear()} {systemName}
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
