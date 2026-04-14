import React, { useState } from 'react';
import { Table, Button, Tag, Typography, Row, Col, Card, Select, Space, Badge } from 'antd';
import { PlusOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useTeleSessions, useTeleStats, useCancelSession } from '../../hooks/useTelemedicine';
import type { TelemedicineSession } from '../../services/telemedicineService';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'orange',
  COMPLETED: 'green',
  CANCELLED: 'default',
};

const TelemedicineSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const params = statusFilter ? { status: statusFilter } : undefined;
  const { data: sessions, isLoading } = useTeleSessions(params);
  const { data: stats } = useTeleStats();
  const { mutate: cancelSession } = useCancelSession();

  const columns = [
    {
      title: 'Session #',
      dataIndex: 'sessionNo',
      render: (v: string) => <Text strong style={{ color: '#1890ff' }}>{v}</Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: TelemedicineSession) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.patient?.lastName}, {row.patient?.firstName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.patient?.phone}</Text>
        </Space>
      ),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: unknown, row: TelemedicineSession) => (
        <Space direction="vertical" size={0}>
          <Text>Dr. {row.doctor?.lastName}, {row.doctor?.firstName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.doctor?.specialty}</Text>
        </Space>
      ),
    },
    {
      title: 'Scheduled At',
      dataIndex: 'scheduledAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY h:mm A'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Room Code',
      dataIndex: 'roomCode',
      render: (v: string) => (
        <Tag style={{ fontFamily: 'monospace', fontSize: 13 }}>{v}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, row: TelemedicineSession) => (
        <Space>
          {(row.status === 'SCHEDULED' || row.status === 'IN_PROGRESS') && (
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              size="small"
              onClick={() => navigate(`/telemedicine/call/${row.roomCode}?sessionId=${row.id}`)}
            >
              Join Call
            </Button>
          )}
          {row.status === 'SCHEDULED' && (
            <Button
              size="small"
              danger
              onClick={() => cancelSession(row.id)}
            >
              Cancel
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const sessionList: TelemedicineSession[] = Array.isArray(sessions) ? sessions : (sessions?.data || []);

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Telemedicine Sessions</Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/telemedicine/book')}>
            Book Session
          </Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Badge color="blue" text={<Text type="secondary">Scheduled</Text>} />
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{stats?.scheduled ?? 0}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Badge color="orange" text={<Text type="secondary">In Progress</Text>} />
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{stats?.inProgress ?? 0}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Badge color="cyan" text={<Text type="secondary">Today's Sessions</Text>} />
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{stats?.today ?? 0}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Badge color="green" text={<Text type="secondary">Completed</Text>} />
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{stats?.completed ?? 0}</div>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col>
            <Select
              placeholder="Filter by Status"
              style={{ width: 180 }}
              allowClear
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: 'SCHEDULED', label: 'Scheduled' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={sessionList}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
      />
    </div>
  );
};

export default TelemedicineSchedulePage;
