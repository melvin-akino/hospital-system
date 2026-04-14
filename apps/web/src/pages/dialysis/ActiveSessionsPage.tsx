import React, { useState, useEffect } from 'react';
import {
  Table, Button, Typography, Row, Col, Card, Tag, Modal, Form, InputNumber, Input, Space,
} from 'antd';
import { StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useDialysisSessions, useEndSession } from '../../hooks/useDialysis';
import type { DialysisSession } from '../../services/dialysisService';

const { Title, Text } = Typography;

// Live duration counter component
const LiveDuration: React.FC<{ startedAt: string }> = ({ startedAt }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.round((now - new Date(startedAt).getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <Tag color="orange">
      {hours > 0 ? `${hours}h ` : ''}{mins}m
    </Tag>
  );
};

const ActiveSessionsPage: React.FC = () => {
  const [endModal, setEndModal] = useState<{ open: boolean; session?: DialysisSession }>({ open: false });
  const [endForm] = Form.useForm();

  const { data, isLoading, refetch } = useDialysisSessions({ status: 'IN_PROGRESS', limit: 100 });
  const endSession = useEndSession();

  const sessions: DialysisSession[] = data?.data || [];

  // Refresh every 30 seconds for live updates
  useEffect(() => {
    const interval = setInterval(() => refetch(), 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleEndSession = async (values: { ktv?: number; notes?: string; complications?: string }) => {
    if (!endModal.session) return;
    await endSession.mutateAsync({ id: endModal.session.id, data: values });
    setEndModal({ open: false });
    endForm.resetFields();
  };

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
      title: 'Start Time',
      dataIndex: 'startedAt',
      render: (v: string) => v ? dayjs(v).format('h:mm A') : '—',
    },
    {
      title: 'Duration (Live)',
      key: 'duration',
      render: (_: unknown, row: DialysisSession) =>
        row.startedAt ? <LiveDuration startedAt={row.startedAt} /> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Kt/V',
      dataIndex: 'ktv',
      render: (v: number) => v != null ? v.toFixed(2) : <Text type="secondary">Pending</Text>,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, row: DialysisSession) => (
        <Button
          size="small"
          danger
          icon={<StopOutlined />}
          onClick={() => { setEndModal({ open: true, session: row }); }}
        >
          End Session
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Active Dialysis Sessions
            {sessions.length > 0 && (
              <Tag color="orange" style={{ marginLeft: 8 }}>{sessions.length} active</Tag>
            )}
          </Title>
        </Col>
        <Col>
          <Button onClick={() => refetch()}>Refresh</Button>
        </Col>
      </Row>

      {sessions.length === 0 && !isLoading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
            No active dialysis sessions at the moment.
          </div>
        </Card>
      ) : (
        <Table
          dataSource={sessions}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
      )}

      {/* End Session Modal */}
      <Modal
        title="End Dialysis Session"
        open={endModal.open}
        onCancel={() => { setEndModal({ open: false }); endForm.resetFields(); }}
        onOk={() => endForm.submit()}
        okText="Complete Session"
        okButtonProps={{ danger: true }}
        confirmLoading={endSession.isPending}
      >
        {endModal.session && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <Text strong>
              {endModal.session.patient?.lastName}, {endModal.session.patient?.firstName}
            </Text>
            <br />
            <Text type="secondary">
              Machine: {endModal.session.machine?.machineCode || '—'} · Started: {endModal.session.startedAt ? dayjs(endModal.session.startedAt).format('h:mm A') : '—'}
            </Text>
          </div>
        )}
        <Form form={endForm} layout="vertical" onFinish={handleEndSession}>
          <Form.Item label="Kt/V (Dialysis Adequacy)" name="ktv">
            <InputNumber min={0} max={5} step={0.01} style={{ width: '100%' }} placeholder="e.g., 1.2" />
          </Form.Item>
          <Form.Item label="Session Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Session summary, observations..." />
          </Form.Item>
          <Form.Item label="Complications (if any)" name="complications">
            <Input.TextArea rows={2} placeholder="Any complications during session..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ActiveSessionsPage;
