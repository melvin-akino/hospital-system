import React, { useState } from 'react';
import {
  Row, Col, Card, Typography, Tag, Button, Space, DatePicker, Table, Popconfirm, Select,
} from 'antd';
import { PlusOutlined, ScissorOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useSurgeries, useCancelSurgery } from '../../hooks/useOR';
import type { Surgery } from '../../services/orService';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'orange',
  COMPLETED: 'green',
  CANCELLED: 'default',
};

const ORSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const from = selectedDate.startOf('day').toISOString();
  const to = selectedDate.endOf('day').toISOString();

  const { data, isLoading } = useSurgeries({
    from,
    to,
    status: statusFilter,
    limit: 50,
  });

  const cancelSurgery = useCancelSurgery();

  const surgeries: Surgery[] = data?.data || [];

  const columns = [
    {
      title: 'Surgery #',
      dataIndex: 'surgeryNo',
      width: 150,
      render: (v: string) => <Text strong style={{ color: '#1890ff' }}>{v}</Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: Surgery) =>
        row.patient
          ? <span>{row.patient.lastName}, {row.patient.firstName}</span>
          : <Text type="secondary">—</Text>,
    },
    {
      title: 'Procedure',
      dataIndex: 'procedure',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Surgeon',
      key: 'surgeon',
      render: (_: unknown, row: Surgery) =>
        row.surgeon
          ? `Dr. ${row.surgeon.lastName}, ${row.surgeon.firstName}`
          : <Text type="secondary">—</Text>,
    },
    {
      title: 'OR Room',
      dataIndex: 'orRoom',
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Time',
      dataIndex: 'scheduledAt',
      render: (v: string) => dayjs(v).format('h:mm A'),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      render: (v: number) => v ? `${v} min` : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v.replace('_', ' ')}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, row: Surgery) => (
        <Space>
          <Button
            size="small"
            onClick={() => navigate(`/or/checklist/${row.id}`)}
          >
            Checklist
          </Button>
          {row.status === 'SCHEDULED' && (
            <Popconfirm
              title="Cancel this surgery?"
              onConfirm={() => cancelSurgery.mutate(row.id)}
              okText="Yes, Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger>Cancel</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <ScissorOutlined style={{ marginRight: 8 }} />
            OR Schedule
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/or/schedule/new')}>
            Schedule Surgery
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <DatePicker
              value={selectedDate}
              onChange={(d) => d && setSelectedDate(d)}
              format="MMMM D, YYYY"
              allowClear={false}
            />
          </Col>
          <Col>
            <Button onClick={() => setSelectedDate(dayjs())}>Today</Button>
          </Col>
          <Col>
            <Button onClick={() => setSelectedDate(selectedDate.subtract(1, 'day'))}>← Prev</Button>
          </Col>
          <Col>
            <Button onClick={() => setSelectedDate(selectedDate.add(1, 'day'))}>Next →</Button>
          </Col>
          <Col>
            <Select
              placeholder="Filter by status"
              allowClear
              style={{ width: 160 }}
              onChange={setStatusFilter}
              options={['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(v => ({
                value: v,
                label: v.replace('_', ' '),
              }))}
            />
          </Col>
        </Row>
      </Card>

      <Card title={`Surgeries for ${selectedDate.format('MMMM D, YYYY')} (${surgeries.length})`}>
        <Table
          dataSource={surgeries}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          rowClassName={(row: Surgery) =>
            row.status === 'CANCELLED' ? 'ant-table-row-cancelled' : ''
          }
        />
      </Card>
    </div>
  );
};

export default ORSchedulePage;
