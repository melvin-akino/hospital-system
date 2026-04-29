import React, { useState } from 'react';
import {
  Card, Form, Input, Button, DatePicker, Typography, Alert, Space, Divider,
} from 'antd';
import { UserOutlined, MedicineBoxOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import portalApi from '../../lib/portalApi';
import { usePortalAuthStore } from '../../store/portalAuthStore';

const { Title, Text, Paragraph } = Typography;

const PortalLoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = usePortalAuthStore((s) => s.login);

  const handleSubmit = async (values: { patientNo: string; dateOfBirth: any }) => {
    setLoading(true);
    setError('');
    try {
      const res = await portalApi.post('/patient-portal/login', {
        patientNo: values.patientNo.trim().toUpperCase(),
        dateOfBirth: values.dateOfBirth.format('YYYY-MM-DD'),
      });
      const { token, patient } = res.data.data;
      login(patient, token);
      navigate('/portal/dashboard');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Invalid Patient ID or Date of Birth');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          border: 'none',
        }}
        bodyStyle={{ padding: '40px 36px' }}
      >
        {/* Logo / header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0d9488, #0891b2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 16px rgba(13,148,136,0.4)',
          }}>
            <MedicineBoxOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>Patient Portal</Title>
          <Text type="secondary">iHIMS — Integrated Hospital Information Management System</Text>
        </div>

        {error && (
          <Alert type="error" message={error} showIcon style={{ marginBottom: 20 }} />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="patientNo"
            label={<Text strong>Patient ID / Chart Number</Text>}
            rules={[{ required: true, message: 'Enter your Patient ID' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#0d9488' }} />}
              placeholder="e.g. PT-000001"
              size="large"
              autoFocus
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="dateOfBirth"
            label={<Text strong>Date of Birth</Text>}
            rules={[{ required: true, message: 'Select your date of birth' }]}
          >
            <DatePicker
              placeholder="Select your birthday"
              size="large"
              style={{ width: '100%', borderRadius: 8 }}
              format="MMMM D, YYYY"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
            style={{
              borderRadius: 8,
              height: 48,
              background: 'linear-gradient(135deg, #0d9488, #0891b2)',
              border: 'none',
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            Access My Health Records
          </Button>
        </Form>

        <Divider style={{ margin: '24px 0 16px' }} />

        <div style={{
          background: '#f0fdfa',
          borderRadius: 8,
          padding: '12px 16px',
          border: '1px solid #99f6e4',
        }}>
          <Space>
            <LockOutlined style={{ color: '#0d9488' }} />
            <div>
              <Text style={{ fontSize: 12, color: '#0f766e', display: 'block', fontWeight: 600 }}>
                Secure & Private
              </Text>
              <Text style={{ fontSize: 11, color: '#5eead4' }}>
                Your health data is encrypted and only accessible to you
              </Text>
            </div>
          </Space>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Staff login? <a href="/login" style={{ color: '#0d9488' }}>Click here</a>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default PortalLoginPage;
