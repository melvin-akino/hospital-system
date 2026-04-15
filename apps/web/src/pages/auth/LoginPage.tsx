import React from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { Navigate, Link } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const { mutate: login, isPending, error } = useLogin();
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onFinish = (values: { username: string; password: string }) => {
    login(values);
  };

  const errorMsg =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001529 0%, #003a8c 50%, #1890ff 100%)',
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
          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <MedicineBoxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <Title level={2} style={{ margin: '8px 0 0', color: '#001529' }}>
              PIBS
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Philippine Integrated Billing System
            </Text>
          </div>

          {errorMsg && (
            <Alert message={errorMsg} type="error" showIcon closable />
          )}

          <Form
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

          <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>
            &copy; {new Date().getFullYear()} PIBS Hospital Information System
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
