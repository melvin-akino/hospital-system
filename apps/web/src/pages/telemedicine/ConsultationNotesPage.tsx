import React, { useState } from 'react';
import { Table, Button, Tag, Typography, Row, Col, Card, Switch, Modal, Space, Descriptions } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTeleSessions } from '../../hooks/useTelemedicine';
import type { TelemedicineSession } from '../../services/telemedicineService';

const { Title, Text } = Typography;

const ConsultationNotesPage: React.FC = () => {
  const [showAll, setShowAll] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TelemedicineSession | null>(null);

  const params = showAll ? undefined : { status: 'COMPLETED' };
  const { data: sessionsData, isLoading } = useTeleSessions(params);

  const sessions: TelemedicineSession[] = Array.isArray(sessionsData)
    ? sessionsData
    : (sessionsData?.data || []);

  const columns = [
    {
      title: 'Session #',
      dataIndex: 'sessionNo',
      render: (v: string) => <Text strong style={{ color: '#1890ff' }}>{v}</Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: TelemedicineSession) =>
        row.patient ? `${row.patient.lastName}, ${row.patient.firstName}` : '—',
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: unknown, row: TelemedicineSession) =>
        row.doctor ? `Dr. ${row.doctor.lastName}, ${row.doctor.firstName}` : '—',
    },
    {
      title: 'Date',
      dataIndex: 'scheduledAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY h:mm A'),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      render: (v: number | null) => v != null ? `${v} min` : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => {
        const colorMap: Record<string, string> = {
          SCHEDULED: 'blue', IN_PROGRESS: 'orange', COMPLETED: 'green', CANCELLED: 'default',
        };
        return <Tag color={colorMap[v] || 'default'}>{v.replace('_', ' ')}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, row: TelemedicineSession) => (
        <Button
          type="text"
          icon={<FileTextOutlined />}
          onClick={() => setSelectedSession(row)}
          disabled={!row.notes && !row.prescription}
        >
          View Notes
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Consultation Notes</Title>
        </Col>
        <Col>
          <Space>
            <Text type="secondary">Show all statuses</Text>
            <Switch checked={showAll} onChange={setShowAll} />
          </Space>
        </Col>
      </Row>

      <Card>
        <Table
          dataSource={sessions}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
          onRow={(row) => ({
            onClick: () => setSelectedSession(row),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Modal
        open={!!selectedSession}
        title={`Consultation Notes — ${selectedSession?.sessionNo || ''}`}
        onCancel={() => setSelectedSession(null)}
        footer={<Button onClick={() => setSelectedSession(null)}>Close</Button>}
        width={600}
      >
        {selectedSession && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Patient">
                {selectedSession.patient?.lastName}, {selectedSession.patient?.firstName}
              </Descriptions.Item>
              <Descriptions.Item label="Doctor">
                Dr. {selectedSession.doctor?.lastName}, {selectedSession.doctor?.firstName}
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {dayjs(selectedSession.scheduledAt).format('MMM D, YYYY h:mm A')}
              </Descriptions.Item>
              <Descriptions.Item label="Duration">
                {selectedSession.duration != null ? `${selectedSession.duration} minutes` : '—'}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>Clinical Notes</Text>
              <div style={{
                marginTop: 8, padding: 12, background: '#fafafa',
                border: '1px solid #eee', borderRadius: 6, minHeight: 60,
              }}>
                <Text>{selectedSession.notes || <Text type="secondary">No notes recorded.</Text>}</Text>
              </div>
            </div>

            <div>
              <Text strong>Prescription</Text>
              <div style={{
                marginTop: 8, padding: 12, background: '#fafafa',
                border: '1px solid #eee', borderRadius: 6, minHeight: 60,
              }}>
                <Text>{selectedSession.prescription || <Text type="secondary">No prescription recorded.</Text>}</Text>
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default ConsultationNotesPage;
