import React, { useState } from 'react';
import {
  Row, Col, Card, Typography, Tag, Button, Space, DatePicker, Table, Badge,
} from 'antd';
import { PlusOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useDialysisMachines, useDialysisSessions, useStartSession } from '../../hooks/useDialysis';
import type { DialysisMachine, DialysisSession } from '../../services/dialysisService';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'orange',
  COMPLETED: 'green',
  CANCELLED: 'default',
};

const machineStatusColor: Record<string, 'success' | 'processing' | 'error' | 'default' | 'warning'> = {
  AVAILABLE: 'success',
  IN_USE: 'processing',
  MAINTENANCE: 'error',
};

const DialysisSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const { data: machinesData } = useDialysisMachines();
  const { data: sessionsData, isLoading } = useDialysisSessions({
    date: selectedDate.format('YYYY-MM-DD'),
    limit: 100,
  });
  const startSession = useStartSession();

  const machines: DialysisMachine[] = machinesData?.data || [];
  const sessions: DialysisSession[] = sessionsData?.data || [];

  const columns = [
    {
      title: 'Session #',
      dataIndex: 'sessionNo',
      render: (v: string) => <Text strong style={{ color: '#1890ff' }}>{v}</Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: DialysisSession) =>
        row.patient
          ? <span><Text strong>{row.patient.lastName}, {row.patient.firstName}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{row.patient.patientNo}</Text></span>
          : <Text type="secondary">—</Text>,
    },
    {
      title: 'Machine',
      key: 'machine',
      render: (_: unknown, row: DialysisSession) =>
        row.machine ? <Tag>{row.machine.machineCode}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Scheduled Time',
      dataIndex: 'scheduledAt',
      render: (v: string) => dayjs(v).format('h:mm A'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v.replace('_', ' ')}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, row: DialysisSession) => (
        <Space>
          {row.status === 'SCHEDULED' && (
            <Button
              size="small"
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => startSession.mutate(row.id)}
              loading={startSession.isPending}
            >
              Start
            </Button>
          )}
          {row.status === 'IN_PROGRESS' && (
            <Button
              size="small"
              danger
              onClick={() => navigate('/dialysis/active')}
            >
              End Session
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Dialysis Schedule</Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/dialysis/sessions/new')}>
            Schedule Session
          </Button>
        </Col>
      </Row>

      {/* Date Selector */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <DatePicker
            value={selectedDate}
            onChange={(d) => d && setSelectedDate(d)}
            format="MMMM D, YYYY"
            allowClear={false}
          />
          <Button onClick={() => setSelectedDate(dayjs())}>Today</Button>
          <Button onClick={() => setSelectedDate(selectedDate.subtract(1, 'day'))}>← Prev</Button>
          <Button onClick={() => setSelectedDate(selectedDate.add(1, 'day'))}>Next →</Button>
        </Space>
      </Card>

      {/* Machine Status Grid */}
      {machines.length > 0 && (
        <>
          <Title level={5} style={{ marginBottom: 12 }}>Machine Status</Title>
          <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
            {machines.map((machine: DialysisMachine) => {
              const activeSession = machine.sessions && machine.sessions[0];
              return (
                <Col key={machine.id} xs={12} sm={8} md={6}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Badge status={machineStatusColor[machine.status] || 'default'} />
                    <Text strong style={{ marginLeft: 4 }}>{machine.machineCode}</Text>
                    {machine.model && (
                      <div><Text type="secondary" style={{ fontSize: 11 }}>{machine.model}</Text></div>
                    )}
                    <div style={{ marginTop: 4 }}>
                      <Tag color={
                        machine.status === 'AVAILABLE' ? 'green' :
                        machine.status === 'IN_USE' ? 'orange' : 'red'
                      }>
                        {machine.status.replace('_', ' ')}
                      </Tag>
                    </div>
                    {activeSession?.patient && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {activeSession.patient.lastName}, {activeSession.patient.firstName}
                        </Text>
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      )}

      {/* Sessions Table */}
      <Card title={`Sessions for ${selectedDate.format('MMMM D, YYYY')} (${sessions.length})`}>
        <Table
          dataSource={sessions}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default DialysisSchedulePage;
