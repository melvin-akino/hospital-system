import React, { useState } from 'react';
import {
  Card, Checkbox, Typography, Button, Divider, Row, Col, Tag, Space, Spin, Alert,
} from 'antd';
import { PrinterOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useChecklist } from '../../hooks/useOR';

const { Title, Text } = Typography;

interface ChecklistItem {
  id: number;
  phase: string;
  item: string;
}

const WHOChecklistPage: React.FC = () => {
  const { surgeryId } = useParams<{ surgeryId: string }>();
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const { data, isLoading } = useChecklist(surgeryId || '');
  const result = data?.data;
  const surgery = result?.surgery;
  const checklist = result?.checklist;

  const toggleItem = (id: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const countChecked = (items: ChecklistItem[]) => items.filter(i => checked.has(i.id)).length;

  if (isLoading) return <div className="page-container"><Spin size="large" /></div>;
  if (!surgery || !checklist) return (
    <div className="page-container">
      <Alert type="error" message="Surgery or checklist data not found" />
    </div>
  );

  const patient = surgery.patient;

  const renderSection = (title: string, items: ChecklistItem[], color: string) => (
    <Card
      title={<span style={{ color }}>{title}</span>}
      style={{ marginBottom: 16, borderTop: `3px solid ${color}` }}
    >
      <div style={{ marginBottom: 8, color: '#999', fontSize: 12 }}>
        {countChecked(items)} / {items.length} completed
      </div>
      {items.map(item => (
        <div
          key={item.id}
          style={{
            padding: '8px 0',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <Checkbox
            checked={checked.has(item.id)}
            onChange={() => toggleItem(item.id)}
            style={{ marginTop: 2 }}
          />
          <Text
            style={{
              textDecoration: checked.has(item.id) ? 'line-through' : 'none',
              color: checked.has(item.id) ? '#999' : 'inherit',
            }}
          >
            {item.item}
          </Text>
        </div>
      ))}
    </Card>
  );

  const allItems = [
    ...checklist.signIn,
    ...checklist.timeOut,
    ...checklist.signOut,
  ];
  const totalChecked = allItems.filter(i => checked.has(i.id)).length;

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} className="no-print">
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/or/schedule')} style={{ marginRight: 12 }} />
          <Title level={4} style={{ margin: 0, display: 'inline' }}>WHO Surgical Safety Checklist</Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print Checklist
          </Button>
        </Col>
      </Row>

      {/* Surgery Header */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Space direction="vertical" size={2}>
              <Text type="secondary">Surgery No.</Text>
              <Text strong style={{ fontSize: 16 }}>{surgery.surgeryNo}</Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" size={2}>
              <Text type="secondary">Status</Text>
              <Tag color={
                surgery.status === 'SCHEDULED' ? 'blue' :
                surgery.status === 'IN_PROGRESS' ? 'orange' :
                surgery.status === 'COMPLETED' ? 'green' : 'default'
              }>
                {surgery.status}
              </Tag>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ marginTop: 12 }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary">Patient</Text>
              <Text strong>
                {patient ? `${patient.lastName}, ${patient.firstName}` : '—'}
              </Text>
              {patient && <Text type="secondary" style={{ fontSize: 12 }}>{patient.patientNo}</Text>}
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ marginTop: 12 }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary">Procedure</Text>
              <Text strong>{surgery.procedure}</Text>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ marginTop: 12 }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary">Scheduled</Text>
              <Text strong>{dayjs(surgery.scheduledAt).format('MMM D, YYYY h:mm A')}</Text>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ marginTop: 12 }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary">Surgeon</Text>
              <Text strong>
                {surgery.surgeon ? `Dr. ${surgery.surgeon.lastName}, ${surgery.surgeon.firstName}` : '—'}
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ marginTop: 12 }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary">OR Room</Text>
              <Text strong>{surgery.orRoom || '—'}</Text>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ marginTop: 12 }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary">Progress</Text>
              <Text strong style={{ color: totalChecked === allItems.length ? '#52c41a' : '#1890ff' }}>
                {totalChecked} / {allItems.length} items completed
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      <Divider>WHO Surgical Safety Checklist Phases</Divider>

      {renderSection('SIGN IN (Before Induction of Anaesthesia)', checklist.signIn, '#1890ff')}
      {renderSection('TIME OUT (Before Skin Incision)', checklist.timeOut, '#faad14')}
      {renderSection('SIGN OUT (Before Patient Leaves Operating Room)', checklist.signOut, '#52c41a')}

      {totalChecked === allItems.length && (
        <Alert
          type="success"
          message="All checklist items completed"
          description="All WHO Surgical Safety Checklist items have been verified."
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .ant-layout-sider, .ant-layout-header { display: none !important; }
          .ant-layout-content { margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default WHOChecklistPage;
