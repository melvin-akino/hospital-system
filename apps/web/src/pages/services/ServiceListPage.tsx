import React, { useState } from 'react';
import { Table, Button, Input, Space, Tag, Typography, Row, Col, Card, Select, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useServices, useServiceCategories, useDeleteService } from '../../hooks/useServices';
import type { Service } from '../../types';

const { Title } = Typography;

const ServiceListPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();

  const { data, isLoading } = useServices({ page, limit: 25, search: search || undefined, categoryId });
  const { data: categories } = useServiceCategories();
  const { mutate: deleteService } = useDeleteService();

  const columns = [
    { title: 'Code', dataIndex: 'serviceCode', width: 120, render: (v: string) => <Typography.Text code>{v}</Typography.Text> },
    { title: 'Service Name', dataIndex: 'serviceName', render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Category', key: 'cat', render: (_: unknown, row: Service) => row.category ? <Tag color="blue">{row.category.name}</Tag> : '—' },
    {
      title: 'Base Price',
      dataIndex: 'basePrice',
      render: (v: number) => <Typography.Text className="currency">₱{Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Typography.Text>,
    },
    { title: 'Discountable', dataIndex: 'isDiscountable', render: (v: boolean) => <Tag color={v ? 'green' : 'orange'}>{v ? 'Yes' : 'No'}</Tag> },
    { title: 'Status', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_: unknown, row: Service) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/services/${row.id}/edit`)} /></Tooltip>
          <Tooltip title="Deactivate">
            <Popconfirm title="Deactivate this service?" onConfirm={() => deleteService(row.id)} okText="Yes">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Service Catalog
            {data?.total !== undefined && <Typography.Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>({data.total} services)</Typography.Text>}
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/services/new')}>Add Service</Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col flex="auto">
            <Input placeholder="Search service name or code..." prefix={<SearchOutlined />}
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => { setSearch(searchInput); setPage(1); }} allowClear onClear={() => { setSearch(''); setSearchInput(''); }} />
          </Col>
          <Col>
            <Select placeholder="Category" style={{ width: 180 }} allowClear onChange={(v) => { setCategoryId(v); setPage(1); }}
              options={(categories?.data || []).map((c: { id: string; name: string }) => ({ value: c.id, label: c.name }))} />
          </Col>
          <Col>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => { setSearch(searchInput); setPage(1); }}>Search</Button>
          </Col>
        </Row>
      </Card>

      <Table dataSource={data?.data || []} columns={columns} rowKey="id" loading={isLoading}
        pagination={{ current: page, pageSize: 25, total: data?.total || 0, onChange: setPage, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }} />
    </div>
  );
};

export default ServiceListPage;
