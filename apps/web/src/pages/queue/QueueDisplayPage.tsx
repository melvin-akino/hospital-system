import React, { useState } from 'react';
import { Typography, Select, Card, Table, Tag, Spin, Badge } from 'antd';
import { WifiOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useDepartmentQueues, useQueueStatus } from '../../hooks/useQueue';
import { useQueueSocket, QueueEntry } from '../../hooks/useQueueSocket';

const { Text } = Typography;

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
  // Fallback HTTP poll — used for initial load and when socket is disconnected
  const { data: statusData, isLoading: statusLoading } = useQueueStatus(selectedDeptId, 8000);
  // Real-time socket subscription
  const socketState = useQueueSocket(selectedDeptId);

  const queues: Queue[] = queuesData?.data || [];
  const httpStatus = statusData?.data;

  // Prefer socket data (live), fall back to HTTP poll data
  const nowServing: QueueEntry | null = socketState.connected
    ? socketState.nowServing
    : (httpStatus?.nowServing ?? null);
  const waiting: QueueEntry[] = socketState.connected
    ? socketState.waiting
    : (httpStatus?.waiting ?? []);
  const waitingCount: number = socketState.connected
    ? socketState.waitingCount
    : (httpStatus?.waitingCount ?? 0);
  const queueMeta = socketState.connected ? socketState.queue : httpStatus?.queue;

  const nextFive = waiting.slice(0, 5);

  const waitingColumns = [
    {
      title: 'Ticket No.',
      dataIndex: 'ticketNo',
      render: (v: string) => <Text strong style={{ fontSize: 18, color: '#fff' }}>{v}</Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: QueueEntry) =>
        row.patient ? (
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
            {row.patient.lastName}, {row.patient.firstName}
          </Text>
        ) : '—',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      render: (v: number) => (
        <Tag color={v > 0 ? 'gold' : 'default'}>{v > 0 ? '⭐ Priority' : 'Regular'}</Tag>
      ),
    },
  ];

  const isLoading = !socketState.connected && statusLoading;

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: '#001529' }}>
      {/* Top bar */}
      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Live / Offline badge */}
        <div>
          {selectedDeptId && (
            socketState.connected ? (
              <Badge status="processing" color="green" text={<Text style={{ color: '#52c41a', fontSize: 13 }}><WifiOutlined /> Live</Text>} />
            ) : (
              <Badge status="default" text={<Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}><DisconnectOutlined /> Polling</Text>} />
            )
          )}
        </div>

        <Select
          placeholder="Select Department"
          style={{ width: 260 }}
          loading={queuesLoading}
          onChange={(v) => setSelectedDeptId(v)}
          options={queues.map((q) => ({
            value: q.departmentId,
            label: q.department?.name || q.name,
          }))}
        />
      </div>

      {!selectedDeptId ? (
        <div style={{ textAlign: 'center', padding: 120 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 24 }}>
            Select a department to display the queue
          </Text>
        </div>
      ) : isLoading ? (
        <div style={{ textAlign: 'center', padding: 120 }}>
          <Spin size="large" />
        </div>
      ) : (
        <div style={{ padding: 24 }}>
          {/* Department Name */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>
              {queueMeta?.department?.name || queueMeta?.name || 'Queue'}
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
                Next in Line ({waitingCount} waiting)
              </span>
            }
            style={{ background: '#0d2137', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.1)' } }}
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
            {socketState.connected
              ? '⚡ Real-time via WebSocket'
              : '🔄 Polling every 8 seconds (reconnecting…)'}
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueDisplayPage;
