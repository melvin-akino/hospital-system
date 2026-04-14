import React, { useState } from 'react';
import { Table, Button, Input, Space, Tag, Typography, Row, Col, Card, Select } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useBills } from '../../hooks/useBilling';
import type { Bill } from '../../types';

const { Title } = Typography;

const formatPeso = (v: number) => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const statusColor: Record<string, string> = {
  DRAFT: 'blue', FINALIZED: 'purple', PAID: 'green', PARTIAL: 'orange', CANCELLED: 'red',
};

const BillingListPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const { data, isLoading } = useBills({ page, limit: 20, search: search || undefined, status });

  const columns = [
    {
      title: 'Bill No.',
      dataIndex: 'billNo',
      width: 160,
      render: (v: string) => <Typography.Text strong style={{ color: '#1890ff' }}>{v}</Typography.Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: Bill) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.patient?.lastName}, {row.patient?.firstName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.patient?.patientNo}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Total', dataIndex: 'totalAmount',
      render: (v: number) => <Typography.Text className="currency">{formatPeso(v)}</Typography.Text>,
    },
    {
      title: 'Paid', dataIndex: 'paidAmount',
      render: (v: number) => <Typography.Text className="currency" type="success">{formatPeso(v)}</Typography.Text>,
    },
    {
      title: 'Balance', dataIndex: 'balance',
      render: (v: number) => <Typography.Text className="currency" type={v > 0 ? 'danger' : 'success'}>{formatPeso(v)}</Typography.Text>,
    },
    {
      title: 'Discount', dataIndex: 'discountType',
      render: (v: string) => v && v !== 'NONE' ? <Tag color="gold">{v}</Tag> : '—',
    },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('MMM D, YYYY') },
    {
      title: '', key: 'actions',
      render: (_: unknown, row: Bill) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/billing/${row.id}`)} />
          {row.balance > 0 && row.status !== 'CANCELLED' && (
            <Button type="text" icon={<DollarOutlined />} onClick={() => navigate(`/billing/${row.id}`)} style={{ color: '#faad14' }} />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Billing
            {data?.total !== undefined && <Typography.Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>({data.total} total)</Typography.Text>}
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/billing/new')}>New Bill</Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col flex="auto">
            <Input placeholder="Search bill no., OR no...." prefix={<SearchOutlined />}
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => { setSearch(searchInput); setPage(1); }} allowClear onClear={() => { setSearch(''); setSearchInput(''); }} />
          </Col>
          <Col>
            <Select placeholder="Status" style={{ width: 130 }} allowClear onChange={(v) => { setStatus(v); setPage(1); }}
              options={['DRAFT', 'FINALIZED', 'PAID', 'PARTIAL', 'CANCELLED'].map(v => ({ value: v, label: v }))} />
          </Col>
          <Col>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => { setSearch(searchInput); setPage(1); }}>Search</Button>
          </Col>
        </Row>
      </Card>

      <Table dataSource={data?.data || []} columns={columns} rowKey="id" loading={isLoading}
        pagination={{ current: page, pageSize: 20, total: data?.total || 0, onChange: setPage, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        onRow={(row) => ({ onClick: () => navigate(`/billing/${row.id}`), style: { cursor: 'pointer' } })} />
    </div>
  );
};

export default BillingListPage;
