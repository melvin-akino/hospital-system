import React, { useState } from 'react';
import {
  Table, Button, Input, Space, Tag, Typography, Row, Col, Card, Select, Statistic,
  Modal, Form, DatePicker, InputNumber,
} from 'antd';
import { PlusOutlined, SearchOutlined, ToolOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAssets, useAssetStats, useLogMaintenance } from '../../hooks/useAssets';
import type { Asset } from '../../services/assetService';

const { Title, Text } = Typography;

const formatPeso = (v: number) => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const ASSET_CATEGORIES = ['Medical Equipment', 'Furniture', 'IT Equipment', 'Vehicles', 'Building'];

const statusColors: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'default',
  MAINTENANCE: 'orange',
  DISPOSED: 'red',
};

const AssetInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [maintenanceModal, setMaintenanceModal] = useState<{ open: boolean; asset?: Asset }>({ open: false });
  const [maintenanceForm] = Form.useForm();

  const { data: statsData } = useAssetStats();
  const { data, isLoading } = useAssets({
    page,
    limit: 20,
    category: categoryFilter,
    search: search || undefined,
  });
  const logMaintenance = useLogMaintenance();

  const stats = statsData?.data;

  const handleLogMaintenance = async (values: {
    type: string;
    description?: string;
    cost?: number;
    performedAt?: dayjs.Dayjs;
    nextDueDate?: dayjs.Dayjs;
    performedBy?: string;
  }) => {
    if (!maintenanceModal.asset) return;
    await logMaintenance.mutateAsync({
      id: maintenanceModal.asset.id,
      data: {
        type: values.type,
        description: values.description,
        cost: values.cost,
        performedAt: values.performedAt?.toISOString(),
        nextDueDate: values.nextDueDate?.toISOString(),
        performedBy: values.performedBy,
      },
    });
    setMaintenanceModal({ open: false });
    maintenanceForm.resetFields();
  };

  const columns = [
    {
      title: 'Asset Code',
      dataIndex: 'assetCode',
      width: 140,
      render: (v: string) => <Text strong style={{ color: '#1890ff' }}>{v}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'assetName',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      render: (v: string) => v ? <Tag>{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Department',
      key: 'department',
      render: (_: unknown, row: Asset) => row.department?.name || <Text type="secondary">—</Text>,
    },
    {
      title: 'Purchase Cost',
      dataIndex: 'purchaseCost',
      render: (v: number) => formatPeso(v),
    },
    {
      title: 'Current Value',
      dataIndex: 'currentValue',
      render: (v: number) => <Text strong>{formatPeso(v)}</Text>,
    },
    {
      title: 'Serial No.',
      dataIndex: 'serialNo',
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, row: Asset) => (
        <Space>
          <Button
            size="small"
            icon={<ToolOutlined />}
            onClick={(e) => { e.stopPropagation(); setMaintenanceModal({ open: true, asset: row }); }}
          >
            Maintenance
          </Button>
          <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(`/assets/depreciation`); }}>
            Depreciation
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Asset Inventory</Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/assets/new')}>
            Register Asset
          </Button>
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic title="Total Assets" value={stats?.totalAssets || 0} prefix={<ToolOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Total Value"
              value={stats?.totalValue || 0}
              formatter={(v) => formatPeso(Number(v))}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Maintenance Due (30 days)"
              value={stats?.maintenanceDue || 0}
              valueStyle={{ color: (stats?.maintenanceDue || 0) > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col flex="auto">
            <Input
              placeholder="Search asset code, name, serial no..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => { setSearch(searchInput); setPage(1); }}
              allowClear
              onClear={() => { setSearch(''); setSearchInput(''); }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Category"
              allowClear
              style={{ width: 160 }}
              onChange={(v) => { setCategoryFilter(v); setPage(1); }}
              options={ASSET_CATEGORIES.map(c => ({ value: c, label: c }))}
            />
          </Col>
          <Col>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => { setSearch(searchInput); setPage(1); }}>
              Search
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={data?.data || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total || 0,
          onChange: setPage,
          showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`,
        }}
      />

      {/* Maintenance Modal */}
      <Modal
        title={`Log Maintenance — ${maintenanceModal.asset?.assetName || ''}`}
        open={maintenanceModal.open}
        onCancel={() => { setMaintenanceModal({ open: false }); maintenanceForm.resetFields(); }}
        onOk={() => maintenanceForm.submit()}
        okText="Log Maintenance"
        confirmLoading={logMaintenance.isPending}
      >
        <Form form={maintenanceForm} layout="vertical" onFinish={handleLogMaintenance}>
          <Form.Item
            label="Type"
            name="type"
            rules={[{ required: true, message: 'Please select type' }]}
          >
            <Select
              options={[
                { value: 'PREVENTIVE', label: 'Preventive' },
                { value: 'CORRECTIVE', label: 'Corrective' },
                { value: 'EMERGENCY', label: 'Emergency' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Cost (₱)" name="cost" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} formatter={v => `₱ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Date Performed" name="performedAt" initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Next Due Date" name="nextDueDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Performed By" name="performedBy">
                <Input placeholder="Technician / vendor name" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default AssetInventoryPage;
