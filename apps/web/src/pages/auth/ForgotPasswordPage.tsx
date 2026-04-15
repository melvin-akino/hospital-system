import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert, Result } from 'antd';
import { UserOutlined, MedicineBoxOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';

const { Title, Text } = Typography;

interface ForgotResponse {
  resetToken?: string;
  expiresAt?: string;
}

const ForgotPasswordPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const forgot = useMutation({
    mutationFn: (data: { username: string }) =>
      api.post('/auth/forgot-password', data).then((r) => r.data),
    onSuccess: (res) => {
      setSubmitted(true);
      // Dev mode returns the token directly
      if (res.data?.resetToken) {
        setDevToken(res.data.resetToken);
      }
    },
  });

  const errorMsg =
    (forgot.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
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
        style={{ width: '100%', maxWidth: 420, borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        {submitted ? (
          <Result
            status="success"
            title="Reset Token Generated"
            subTitle={
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>
                  {devToken
                    ? 'Your reset token is shown below (dev mode). In production, it would be sent via SMS.'
                    : 'If an account exists with that username, a reset link has been sent to the registered phone number.'}
                </Text>
                {devToken && (
                  <Alert
                    message="Dev Mode — Reset Token"
                    description={
                      <Space direction="vertical" size={4}>
                        <Text copyable code>{devToken}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Use this token on the reset password page. Expires in 1 hour.
                        </Text>
                      </Space>
                    }
                    type="warning"
                    showIcon
                  />
                )}
              </Space>
            }
            extra={[
              <Link to="/reset-password" key="reset">
                <Button type="primary">Go to Reset Password</Button>
              </Link>,
              <Link to="/login" key="login">
                <Button>Back to Login</Button>
              </Link>,
            ]}
          />
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <MedicineBoxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              <Title level={3} style={{ margin: '8px 0 4px', color: '#001529' }}>
                Forgot Password
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Enter your username or email to receive a reset token
              </Text>
            </div>

            {errorMsg && <Alert message={errorMsg} type="error" showIcon closable />}

            <Form layout="vertical" size="large" onFinish={(v) => forgot.mutate(v)}>
              <Form.Item
                name="username"
                rules={[{ required: true, message: 'Please enter your username or email' }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Username or Email"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={forgot.isPending}
                  block
                  style={{ height: 44 }}
                >
                  Send Reset Token
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login">
                <Button type="link" icon={<ArrowLeftOutlined />}>
                  Back to Login
                </Button>
              </Link>
            </div>
          </Space>
        )}
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
