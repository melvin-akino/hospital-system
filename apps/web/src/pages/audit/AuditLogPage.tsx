import React, { useState } from 'react';
import {
  Card, Table, Typography, Input, Select, Tag, Space, DatePicker, Row, Col, Tooltip, Button,
} from 'antd';
import { SearchOutlined, AuditOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { auditService } from '../../services/auditService';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'green', UPDATE: 'blue', DELETE: 'red', VIEW: 'default',
  LOGIN: 'cyan', LOGOUT: 'orange',
};

const MODULES = [
  'users', 'patients', 'doctors', 'billing', 'consultations', 'pharmacy',
  'lab', 'admissions', 'or', 'bloodbank', 'assets', 'dialysis',
  'philhealth', 'hmo', 'accounting', 'nurses', 'appointments',
];

interface AuditLog {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  module: string;
  recordId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

const AuditLogPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', { page, search, module, action, dateRange }],
    queryFn: () => auditService.list({
      page,
      limit: 50,
      username: search || undefined,
      module: module || undefined,
      action: action || undefined,
      from: dateRange?.[0],
      to: dateRange?.[1],
    }),
  });

  const logs: AuditLog[] = data?.data?.data ?? [];
  const total: number = data?.data?.total ?? 0;

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      width: 165,
      render: (v: string) => (
        <Text style={{ fontSize: 12 }}>{dayjs(v).format('MMM D, YYYY HH:mm:ss')}</Text>
      ),
    },
    {
      title: 'User',
      dataIndex: 'username',
      width: 130,
      render: (v: string) => <Text strong>{v || '—'}</Text>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 90,
      render: (v: string) => <Tag color={ACTION_COLORS[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Module',
      dataIndex: 'module',
      width: 120,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Record ID',
      dataIndex: 'recordId',
      width: 120,
      render: (v: string) => v ? <Text code style={{ fontSize: 11 }}>{v.slice(0, 8)}…</Text> : '—',
    },
    {
      title: 'Details',
      dataIndex: 'details',
      render: (v: string) => v
        ? <Tooltip title={v}><Text style={{ fontSize: 12 }}>{v.length > 60 ? v.slice(0, 60) + '…' : v}</Text></Tooltip>
        : '—',
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      width: 120,
      render: (v: string) => <Text style={{ fontSize: 12, color: '#888' }}>{v || '—'}</Text>,
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}><AuditOutlined /> Audit Log</Title>
          <Text type="secondary">Compliance trail of all system actions</Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
        </Col>
      </Row>

      <Card>
        <Row gutter={12} style={{ marginBottom: 16 }} wrap>
          <Col span={5}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Filter by username…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              allowClear
            />
          </Col>
          <Col span={5}>
            <Select placeholder="Module" allowClear style={{ width: '100%' }} value={module} onChange={(v) => { setModule(v); setPage(1); }}>
              {MODULES.map((m) => <Option key={m} value={m}>{m}</Option>)}
            </Select>
          </Col>
          <Col span={5}>
            <Select placeholder="Action" allowClear style={{ width: '100%' }} value={action} onChange={(v) => { setAction(v); setPage(1); }}>
              {Object.keys(ACTION_COLORS).map((a) => (
                <Option key={a} value={a}><Tag color={ACTION_COLORS[a]}>{a}</Tag></Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(_, s) => { setDateRange(s[0] && s[1] ? [s[0], s[1]] : null); setPage(1); }}
            />
          </Col>
        </Row>

        <Space style={{ marginBottom: 8 }}>
          <Text type="secondary">{total.toLocaleString()} total records</Text>
        </Space>

        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{
            current: page,
            pageSize: 50,
            total,
            onChange: setPage,
            showTotal: (t) => `${t} log entries`,
          }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
};

export default AuditLogPage;
