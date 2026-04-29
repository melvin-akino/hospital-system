import React, { useState } from 'react';
import {
  Card, Row, Col, Tag, Button, Space, Typography, Statistic,
  Table, Badge, Alert, Select, Input, Tooltip, Popconfirm,
  Tabs, Progress,
} from 'antd';
import {
  ExperimentOutlined, CheckOutlined, PlayCircleOutlined, SearchOutlined,
  ClockCircleOutlined, AlertOutlined, ReloadOutlined, EyeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../lib/api';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const PRIORITY_COLOR: Record<string, string> = {
  STAT: 'red',
  URGENT: 'orange',
  ROUTINE: 'default',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'orange',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

const getTATColor = (minutes: number, priority: string): string => {
  if (priority === 'STAT') {
    if (minutes > 60) return '#ff4d4f';
    if (minutes > 30) return '#fa8c16';
    return '#52c41a';
  }
  if (priority === 'URGENT') {
    if (minutes > 240) return '#ff4d4f';
    if (minutes > 120) return '#fa8c16';
    return '#52c41a';
  }
  // ROUTINE
  if (minutes > 480) return '#ff4d4f';
  if (minutes > 240) return '#fa8c16';
  return '#52c41a';
};

const getTATTarget = (priority: string): number => {
  if (priority === 'STAT') return 60;
  if (priority === 'URGENT') return 240;
  return 480;
};

const LabWorkQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('pending');

  const { data: pendingData, isLoading: pendingLoading, refetch } = useQuery({
    queryKey: ['lab-work-queue', 'PENDING', search],
    queryFn: () =>
      api.get('/lab-requisitions', {
        params: { status: 'PENDING', search: search || undefined, limit: 100 },
      }).then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 30000,
  });

  const { data: inProgressData, isLoading: inProgressLoading } = useQuery({
    queryKey: ['lab-work-queue', 'IN_PROGRESS', search],
    queryFn: () =>
      api.get('/lab-requisitions', {
        params: { status: 'IN_PROGRESS', search: search || undefined, limit: 100 },
      }).then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 30000,
  });

  const { data: completedToday } = useQuery({
    queryKey: ['lab-work-queue', 'COMPLETED_TODAY'],
    queryFn: () =>
      api.get('/lab-requisitions', {
        params: { status: 'COMPLETED', dateFrom: dayjs().startOf('day').toISOString(), limit: 100 },
      }).then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 60000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/lab-requisitions/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-work-queue'] });
      setSelectedRows([]);
    },
  });

  const batchStartMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => api.put(`/lab-requisitions/${id}/status`, { status: 'IN_PROGRESS' }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-work-queue'] });
      setSelectedRows([]);
    },
  });

  const pending: any[] = pendingData || [];
  const inProgress: any[] = inProgressData || [];
  const completed: any[] = completedToday || [];

  // Sort by priority then TAT
  const priorityOrder = (p: string) => ({ STAT: 0, URGENT: 1, ROUTINE: 2 }[p] ?? 3);
  const sortedPending = [...pending].sort((a, b) => {
    const pd = priorityOrder(a.priority) - priorityOrder(b.priority);
    if (pd !== 0) return pd;
    return new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime();
  });

  const statCount = pending.filter((r: any) => r.priority === 'STAT').length;
  const urgentCount = pending.filter((r: any) => r.priority === 'URGENT').length;
  const overdueCount = pending.filter((r: any) => {
    const mins = dayjs().diff(dayjs(r.orderedAt), 'minute');
    return mins > getTATTarget(r.priority);
  }).length;

  const renderTAT = (orderedAt: string, priority: string) => {
    const mins = dayjs().diff(dayjs(orderedAt), 'minute');
    const target = getTATTarget(priority);
    const color = getTATColor(mins, priority);
    const pct = Math.min(Math.round((mins / target) * 100), 100);
    const label = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return (
      <Space direction="vertical" size={0}>
        <Text strong style={{ color, fontSize: 12 }}>{label}</Text>
        <Progress
          percent={pct}
          strokeColor={color}
          size="small"
          showInfo={false}
          style={{ width: 60, margin: 0 }}
        />
        {mins > target && <Text style={{ color: '#ff4d4f', fontSize: 10 }}>OVERDUE</Text>}
      </Space>
    );
  };

  const columns = (showActions = true) => [
    {
      title: '',
      dataIndex: 'priority',
      render: (v: string) => (
        <Tooltip title={v}>
          {v === 'STAT' ? (
            <AlertOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
          ) : v === 'URGENT' ? (
            <ThunderboltOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
          ) : (
            <ExperimentOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
          )}
        </Tooltip>
      ),
      width: 36,
    },
    {
      title: 'Req #',
      dataIndex: 'requisitionNo',
      render: (v: string, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 12, color: '#1890ff' }}>{v}</Text>
          <Tag color={PRIORITY_COLOR[r.priority] || 'default'} style={{ fontSize: 10, lineHeight: '16px' }}>
            {r.priority}
          </Tag>
        </Space>
      ),
      width: 110,
    },
    {
      title: 'Patient',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 12 }}>
            {r.patient?.lastName}, {r.patient?.firstName}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    {
      title: 'Tests',
      render: (_: any, r: any) => (
        <Space wrap size={2}>
          {(r.items || []).slice(0, 4).map((item: any, i: number) => (
            <Tag key={i} style={{ fontSize: 10, margin: '1px' }}>{item.testCode || item.testName}</Tag>
          ))}
          {(r.items?.length || 0) > 4 && (
            <Tag style={{ fontSize: 10 }}>+{r.items.length - 4} more</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Ordered By',
      dataIndex: 'orderedBy',
      render: (v: string, r: any) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 11 }}>{v || '—'}</Text>
          <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(r.orderedAt).format('h:mm A')}</Text>
        </Space>
      ),
    },
    {
      title: 'TAT',
      render: (_: any, r: any) => renderTAT(r.orderedAt, r.priority),
      width: 80,
    },
    showActions && {
      title: 'Actions',
      render: (_: any, r: any) => (
        <Space size={4}>
          {r.status === 'PENDING' && (
            <Tooltip title="Start Processing">
              <Button
                size="small"
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={updateStatusMutation.isPending}
                onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'IN_PROGRESS' })}
              >
                Start
              </Button>
            </Tooltip>
          )}
          {r.status === 'IN_PROGRESS' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => navigate(`/lab/results/entry/${r.id}`)}
            >
              Enter Results
            </Button>
          )}
          <Tooltip title="View Details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/lab/results/entry/${r.id}`)} />
          </Tooltip>
        </Space>
      ),
      width: 160,
    },
  ].filter(Boolean) as any[];

  const completedColumns = [
    {
      title: 'Req #',
      dataIndex: 'requisitionNo',
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
      width: 130,
    },
    {
      title: 'Patient',
      render: (_: any, r: any) => `${r.patient?.lastName}, ${r.patient?.firstName}`,
    },
    {
      title: 'Tests',
      render: (_: any, r: any) => (
        <Space wrap size={2}>
          {(r.items || []).map((item: any, i: number) => (
            <Tag key={i} style={{ fontSize: 10 }}>{item.testCode || item.testName}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Completed',
      render: (_: any, r: any) => dayjs(r.updatedAt || r.orderedAt).format('h:mm A'),
      width: 90,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      render: (v: string) => <Tag color={PRIORITY_COLOR[v] || 'default'} style={{ fontSize: 10 }}>{v}</Tag>,
      width: 80,
    },
    {
      title: '',
      render: (_: any, r: any) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/lab/results/entry/${r.id}`)}>View</Button>
      ),
      width: 70,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <ExperimentOutlined style={{ fontSize: 24, color: '#722ed1' }} />
            <Title level={3} style={{ margin: 0 }}>Lab Work Queue</Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
            <Button type="primary" icon={<ExperimentOutlined />} onClick={() => navigate('/lab-requisitions/new')}>
              New Order
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card style={{ borderLeft: '4px solid #ff4d4f' }}>
            <Statistic
              title={<Space><AlertOutlined style={{ color: '#ff4d4f' }} />STAT</Space>}
              value={statCount}
              valueStyle={{ color: statCount > 0 ? '#ff4d4f' : '#333' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderLeft: '4px solid #fa8c16' }}>
            <Statistic
              title={<Space><ThunderboltOutlined style={{ color: '#fa8c16' }} />Urgent</Space>}
              value={urgentCount}
              valueStyle={{ color: urgentCount > 0 ? '#fa8c16' : '#333' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderLeft: '4px solid #1890ff' }}>
            <Statistic title="In Processing" value={inProgress.length} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderLeft: '4px solid #52c41a' }}>
            <Statistic title="Completed Today" value={completed.length} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<ClockCircleOutlined />}
          message={`${overdueCount} overdue specimen${overdueCount > 1 ? 's' : ''} — TAT exceeded`}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Search */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={8} align="middle">
          <Col flex="300px">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search patient or requisition #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          {selectedRows.length > 0 && (
            <Col>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={batchStartMutation.isPending}
                onClick={() => batchStartMutation.mutate(selectedRows)}
              >
                Start {selectedRows.length} selected
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'pending',
            label: (
              <Space>
                <ClockCircleOutlined />
                Pending
                <Badge count={pending.length} style={{ backgroundColor: '#fa8c16' }} />
              </Space>
            ),
            children: (
              <Table
                dataSource={sortedPending}
                columns={columns(true)}
                rowKey="id"
                loading={pendingLoading}
                size="small"
                pagination={false}
                rowClassName={(r: any) => {
                  const mins = dayjs().diff(dayjs(r.orderedAt), 'minute');
                  if (r.priority === 'STAT') return 'ant-table-row-stat';
                  if (mins > getTATTarget(r.priority)) return 'ant-table-row-overdue';
                  return '';
                }}
                rowSelection={{
                  selectedRowKeys: selectedRows,
                  onChange: (keys) => setSelectedRows(keys as string[]),
                  getCheckboxProps: (r: any) => ({
                    disabled: r.status !== 'PENDING',
                  }),
                }}
                locale={{
                  emptyText: (
                    <Space direction="vertical" style={{ padding: 24 }}>
                      <CheckOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                      <Text>No pending specimens — queue is clear!</Text>
                    </Space>
                  ),
                }}
              />
            ),
          },
          {
            key: 'in_progress',
            label: (
              <Space>
                <PlayCircleOutlined />
                In Processing
                <Badge count={inProgress.length} style={{ backgroundColor: '#1890ff' }} />
              </Space>
            ),
            children: (
              <Table
                dataSource={inProgress.sort((a: any, b: any) => priorityOrder(a.priority) - priorityOrder(b.priority))}
                columns={columns(true)}
                rowKey="id"
                loading={inProgressLoading}
                size="small"
                pagination={false}
                locale={{ emptyText: 'No specimens currently being processed' }}
              />
            ),
          },
          {
            key: 'completed',
            label: (
              <Space>
                <CheckOutlined />
                Completed Today
                <Badge count={completed.length} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            ),
            children: (
              <Table
                dataSource={[...completed].sort((a: any, b: any) =>
                  new Date(b.updatedAt || b.orderedAt).getTime() - new Date(a.updatedAt || a.orderedAt).getTime()
                )}
                columns={completedColumns}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 15 }}
                locale={{ emptyText: 'No completed results today' }}
              />
            ),
          },
        ]}
      />

      <style>{`
        .ant-table-row-stat td { background: #fff1f0 !important; }
        .ant-table-row-overdue td { background: #fffbe6 !important; }
      `}</style>
    </div>
  );
};

export default LabWorkQueuePage;
