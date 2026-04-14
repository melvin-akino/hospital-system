import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  message,
  Space,
  Alert,
} from 'antd';
import { UserOutlined, CalendarOutlined } from '@ant-design/icons';
import { DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import axios from 'axios';
import { usePatientAuthStore } from '../store/authStore';
import type { PatientProfile } from '../store/authStore';

const { Title, Text, Paragraph } = Typography;

interface LoginFormValues {
  patientNo: string;
  dateOfBirth: Dayjs;
}

const PatientLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = usePatientAuthStore();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/patient-portal/login', {
        patientNo: values.patientNo.trim(),
        dateOfBirth: dayjs(values.dateOfBirth).format('YYYY-MM-DD'),
      });

      const { token, patient } = response.data.data as {
        token: string;
        patient: PatientProfile;
      };

      login(token, patient);
      message.success(`Welcome back, ${patient.firstName}!`);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        message.error('Invalid patient number or date of birth');
      } else {
        message.error('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f0f9ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#0891b2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 4px 14px rgba(8,145,178,0.35)',
            }}
          >
            <span style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>P</span>
          </div>
          <Title level={3} style={{ color: '#0891b2', marginBottom: 4 }}>
            PIBS Patient Portal
          </Title>
          <Text style={{ color: '#64748b', fontSize: 13 }}>
            Philippine Integrated Billing System
          </Text>
        </div>

        <Card
          style={{
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid #e0f2fe',
          }}
          bodyStyle={{ padding: 32 }}
        >
          <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 24 }}>
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
              Patient Portal Login
            </Title>
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              Access your health records securely
            </Text>
          </Space>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
          >
            <Form.Item
              name="patientNo"
              label={<Text strong style={{ fontSize: 13 }}>Patient Number</Text>}
              rules={[{ required: true, message: 'Please enter your patient number' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                placeholder="e.g. PAT-000001"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="dateOfBirth"
              label={<Text strong style={{ fontSize: 13 }}>Date of Birth</Text>}
              rules={[{ required: true, message: 'Please select your date of birth' }]}
            >
              <DatePicker
                style={{ width: '100%', borderRadius: 8 }}
                size="large"
                format="YYYY-MM-DD"
                placeholder="Select your date of birth"
                suffixIcon={<CalendarOutlined style={{ color: '#94a3b8' }} />}
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                style={{
                  backgroundColor: '#0891b2',
                  borderColor: '#0891b2',
                  borderRadius: 8,
                  height: 46,
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Alert
          style={{ marginTop: 20, borderRadius: 8 }}
          message={
            <Text style={{ fontSize: 12, color: '#475569' }}>
              Use your <strong>patient number</strong> (found on your registration card) and{' '}
              <strong>date of birth</strong> to log in. Contact the front desk if you need
              assistance.
            </Text>
          }
          type="info"
          showIcon
        />

        <Paragraph
          style={{ textAlign: 'center', marginTop: 24, color: '#94a3b8', fontSize: 12 }}
        >
          &copy; {new Date().getFullYear()} PIBS — Philippine Integrated Billing System
        </Paragraph>
      </div>
    </div>
  );
};

export default PatientLoginPage;
