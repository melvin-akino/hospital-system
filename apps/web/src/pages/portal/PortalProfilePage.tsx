import React from 'react';
import {
  Card, Descriptions, Typography, Space, Avatar, Tag, Spin, Alert,
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { usePortalAuthStore } from '../../store/portalAuthStore';
import portalApi from '../../lib/portalApi';

const { Title, Text } = Typography;

const PortalProfilePage: React.FC = () => {
  const { patient: stored } = usePortalAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => portalApi.get('/patient-portal/me').then((r) => r.data?.data),
  });

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }

  const p = profile || stored;
  if (!p) return null;

  const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
  const initials = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`;

  const age = p.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') : null;

  return (
    <div>
      <Title level={4} style={{ margin: '0 0 20px', color: '#0f766e' }}>
        <UserOutlined /> My Profile
      </Title>

      <Alert
        type="info"
        showIcon
        message="Your profile information is maintained by the hospital. Please contact the admitting office to update any details."
        style={{ marginBottom: 20, borderRadius: 8 }}
      />

      <Card style={{ borderRadius: 12, border: 'none' }}>
        {/* Avatar + name banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0f766e, #0891b2)',
          borderRadius: 8,
          padding: '24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}>
          <Avatar
            size={72}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '3px solid rgba(255,255,255,0.5)',
              fontSize: 26,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <div>
            <Title level={3} style={{ margin: 0, color: '#fff' }}>{fullName}</Title>
            <Space style={{ marginTop: 4 }}>
              <Tag color="cyan" style={{ fontSize: 12 }}>{p.patientNo}</Tag>
              {age !== null && <Text style={{ color: '#a7f3d0', fontSize: 13 }}>{age} years old</Text>}
              {p.gender && <Text style={{ color: '#a7f3d0', fontSize: 13 }}>{p.gender}</Text>}
            </Space>
          </div>
        </div>

        <Descriptions
          column={{ xs: 1, sm: 2 }}
          bordered
          size="small"
          labelStyle={{ fontWeight: 600, color: '#374151', width: 180 }}
        >
          <Descriptions.Item label="Patient Number">
            <Text style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.patientNo}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Date of Birth">
            {p.dateOfBirth
              ? `${dayjs(p.dateOfBirth).format('MMMM D, YYYY')} (${age} years old)`
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Gender">{p.gender || '—'}</Descriptions.Item>
          <Descriptions.Item label="PhilHealth No.">{p.philhealthNo || '—'}</Descriptions.Item>
          <Descriptions.Item label="Phone">{p.phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{p.email || '—'}</Descriptions.Item>
          <Descriptions.Item label="Address" span={2}>
            {[p.address, p.city, p.province].filter(Boolean).join(', ') || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Senior Citizen">
            {p.isSenior
              ? <Tag color="blue">Yes — 20% discount applies</Tag>
              : <Tag>No</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="PWD">
            {p.isPwd
              ? <Tag color="purple">Yes — 20% discount applies</Tag>
              : <Tag>No</Tag>}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default PortalProfilePage;
