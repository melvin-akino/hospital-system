import React, { useState } from 'react';
import {
  Typography,
  Select,
  Card,
  Table,
  Tag,
  Row,
  Col,
  Spin,
} from 'antd';
import { useDepartmentQueues, useQueueStatus } from '../../hooks/useQueue';

const { Title, Text } = Typography;

interface QueueEntry {
  id: string;
  ticketNo: string;
  priority: number;
  status: string;
  createdAt: string;
  patient?: { firstName: string; lastName: string; patientNo: string };
}

interface Queue {
  id: string;
  name: string;
  departmentId: string;
  department?: { name: string; code: string };
  waitingCount: number;
}

const QueueDisplayPage: React.FC = () => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  const { data: queuesData, isLoading: queuesLoading } = useDepartmentQueues();
  const { data: statusData, isLoading: statusLoading } = useQueueStatus(selectedDeptId, 5000);

  const queues: Queue[] = queuesData?.data || [];
  const queueStatus = statusData?.data;

  const nowServing: QueueEntry | undefined = queueStatus?.nowServing;
  const waiting: QueueEntry[] = queueStatus?.waiting || [];
  const nextFive = waiting.slice(0, 5);

  const waitingColumns = [
    {
      title: 'Ticket No.',
      dataIndex: 'ticketNo',
      render: (v: string) => (
        <Text strong style={{ fontSize: 18 }}>{v}</Text>
      ),
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: QueueEntry) =>
        row.patient ? `${row.patient.lastName}, ${row.patient.firstName}` : '—',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      render: (v: number) => (
        <Tag color={v > 0 ? 'gold' : 'default'}>{v > 0 ? 'Priority' : 'Regular'}</Tag>
      ),
    },
  ];

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: '#001529' }}>
      {/* Department Selector */}
      <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <Select
          placeholder="Select Department"
          style={{ width: 260, background: 'white' }}
          loading={queuesLoading}
          onChange={(v) => setSelectedDeptId(v)}
          options={queues.map((q) => ({
            value: q.departmentId,
            label: `${q.department?.name || q.name}`,
          }))}
        />
      </div>

      {!selectedDeptId ? (
        <div style={{ textAlign: 'center', padding: 120 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 24 }}>
            Select a department to display the queue
          </Text>
        </div>
      ) : statusLoading ? (
        <div style={{ textAlign: 'center', padding: 120 }}>
          <Spin size="large" />
        </div>
      ) : (
        <div style={{ padding: 24 }}>
          {/* Department Name */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>
              {queueStatus?.queue?.department?.name || queueStatus?.queue?.name || 'Queue'}
            </Text>
          </div>

          {/* NOW SERVING */}
          <Card
            style={{
              background: '#1890ff',
              border: 'none',
              borderRadius: 12,
              marginBottom: 32,
              textAlign: 'center',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 20, marginBottom: 8 }}>
              NOW SERVING
            </div>
            {nowServing ? (
              <>
                <div style={{ color: '#fff', fontSize: 80, fontWeight: 900, lineHeight: 1, marginBottom: 8 }}>
                  {nowServing.ticketNo}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 28 }}>
                  {nowServing.patient
                    ? `${nowServing.patient.lastName}, ${nowServing.patient.firstName}`
                    : ''}
                </div>
              </>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 40, fontWeight: 700 }}>
                — No Patient —
              </div>
            )}
          </Card>

          {/* NEXT IN LINE */}
          <Card
            title={
              <span style={{ color: '#fff', fontSize: 18 }}>
                Next in Line ({queueStatus?.waitingCount || 0} waiting)
              </span>
            }
            style={{ background: '#0d2137', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          >
            {nextFive.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>
                No patients waiting
              </div>
            ) : (
              <Table
                dataSource={nextFive}
                columns={waitingColumns}
                rowKey="id"
                pagination={false}
                size="large"
                style={{ background: 'transparent' }}
                className="dark-table"
              />
            )}
          </Card>

          <div style={{ textAlign: 'center', marginTop: 16, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            Auto-refreshes every 5 seconds
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueDisplayPage;
