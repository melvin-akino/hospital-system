import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert, Result } from 'antd';
import { LockOutlined, KeyOutlined, MedicineBoxOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';

const { Title, Text } = Typography;

const ResetPasswordPage: React.FC = () => {
  const [done, setDone] = useState(false);
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const reset = useMutation({
    mutationFn: (data: { token: string; newPassword: string }) =>
      api.post('/auth/reset-password', data).then((r) => r.data),
    onSuccess: () => setDone(true),
  });

  const errorMsg =
    (reset.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
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
        {done ? (
          <Result
            status="success"
            title="Password Reset Successful"
            subTitle="Your password has been updated. All other sessions have been signed out."
            extra={[
              <Link to="/login" key="login">
                <Button type="primary" size="large">Sign In Now</Button>
              </Link>,
            ]}
          />
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <MedicineBoxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              <Title level={3} style={{ margin: '8px 0 4px', color: '#001529' }}>
                Reset Password
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Enter your reset token and choose a new password
              </Text>
            </div>

            {errorMsg && <Alert message={errorMsg} type="error" showIcon closable />}

            <Form
              layout="vertical"
              size="large"
              initialValues={{ token: tokenFromUrl }}
              onFinish={(v) =>
                reset.mutate({ token: v.token, newPassword: v.newPassword })
              }
            >
              <Form.Item
                label="Reset Token"
                name="token"
                rules={[{ required: true, message: 'Paste your reset token' }]}
              >
                <Input
                  prefix={<KeyOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Paste your reset token here"
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </Form.Item>

              <Form.Item
                label="New Password"
                name="newPassword"
                rules={[
                  { required: true, message: 'Enter a new password' },
                  { min: 8, message: 'At least 8 characters' },
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} />
              </Form.Item>

              <Form.Item
                label="Confirm New Password"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Confirm your new password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={reset.isPending}
                  block
                  style={{ height: 44 }}
                >
                  Reset Password
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
              <Link to="/forgot-password">
                <Button type="link" icon={<ArrowLeftOutlined />}>
                  Request a new token
                </Button>
              </Link>
            </div>
          </Space>
        )}
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
