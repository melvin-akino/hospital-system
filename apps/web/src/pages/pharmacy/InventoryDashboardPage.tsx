import React, { useState } from 'react';
import {
  Table,
  Button,
  Typography,
  Row,
  Col,
  Card,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Statistic,
  Tabs,
  DatePicker,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useInventory,
  useLowStockAlerts,
  useExpiryAlerts,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useAdjustStock,
} from '../../hooks/usePharmacy';

const { Title } = Typography;

interface InventoryItem {
  id: string;
  itemName: string;
  itemCode: string;
  category?: string;
  unit?: string;
  currentStock: number;
  minimumStock: number;
  unitCost: number;
  sellingPrice: number;
  expiryDate?: string;
  batchNo?: string;
  isActive: boolean;
  medication?: { genericName: string; brandName?: string };
  supplier?: { name: string };
}

const getStockStatus = (item: InventoryItem) => {
  if (item.currentStock === 0) return { color: 'red', label: 'Out of Stock' };
  if (item.currentStock <= item.minimumStock) return { color: 'orange', label: 'Low Stock' };
  return { color: 'green', label: 'In Stock' };
};

const InventoryDashboardPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading } = useInventory({ page, limit: 20 });
  const { data: lowStockData } = useLowStockAlerts();
  const { data: expiryData } = useExpiryAlerts();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const adjustStock = useAdjustStock();

  const allItems: InventoryItem[] = data?.data || [];
  const lowStockItems: InventoryItem[] = lowStockData?.data || [];
  const expiryItems: InventoryItem[] = expiryData?.data || [];

  const totalValue = allItems.reduce((sum, i) => sum + i.currentStock * Number(i.unitCost), 0);

  const openAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    adjustForm.resetFields();
    setAdjustModalOpen(true);
  };

  const handleCreate = async (values: Record<string, unknown>) => {
    const data = {
      ...values,
      expiryDate: values['expiryDate'] ? (values['expiryDate'] as ReturnType<typeof dayjs>).toISOString() : undefined,
    };
    await createItem.mutateAsync(data);
    setCreateModalOpen(false);
    form.resetFields();
  };

  const handleAdjust = async (values: Record<string, unknown>) => {
    if (!selectedItem) return;
    await adjustStock.mutateAsync({
      id: selectedItem.id,
      adjustment: values['adjustment'] as number,
      reason: values['reason'] as string,
    });
    setAdjustModalOpen(false);
    adjustForm.resetFields();
  };

  const columns = [
    {
      title: 'Item Name / Code',
      key: 'item',
      render: (_: unknown, row: InventoryItem) => (
        <div>
          <Typography.Text strong>{row.itemName}</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.itemCode}</Typography.Text>
        </div>
      ),
    },
    { title: 'Category', dataIndex: 'category', render: (v?: string) => v || '—' },
    {
      title: 'Current Stock',
      key: 'stock',
      render: (_: unknown, row: InventoryItem) => {
        const status = getStockStatus(row);
        return (
          <Space>
            <Typography.Text style={{ color: status.color === 'red' ? '#dc2626' : status.color === 'orange' ? '#d97706' : undefined }}>
              {row.currentStock} {row.unit || 'units'}
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: 'Min Stock',
      dataIndex: 'minimumStock',
      render: (v: number, row: InventoryItem) => `${v} ${row.unit || 'units'}`,
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unitCost',
      render: (v: number) => `₱${Number(v).toFixed(2)}`,
    },
    {
      title: 'Selling Price',
      dataIndex: 'sellingPrice',
      render: (v: number) => `₱${Number(v).toFixed(2)}`,
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      render: (v?: string) => {
        if (!v) return '—';
        const isExpiringSoon = dayjs(v).diff(dayjs(), 'day') <= 30;
        return (
          <Tag color={isExpiringSoon ? 'orange' : 'default'}>
            {dayjs(v).format('MMM D, YYYY')}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, row: InventoryItem) => {
        const status = getStockStatus(row);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, row: InventoryItem) => (
        <Button size="small" onClick={() => openAdjust(row)}>Adjust Stock</Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          <AppstoreOutlined /> All Items ({data?.total || 0})
        </span>
      ),
      children: (
        <Table
          dataSource={allItems}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total || 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
          size="small"
          scroll={{ x: 1000 }}
        />
      ),
    },
    {
      key: 'low-stock',
      label: (
        <span style={{ color: lowStockItems.length > 0 ? '#dc2626' : undefined }}>
          <WarningOutlined /> Low Stock ({lowStockItems.length})
        </span>
      ),
      children: (
        <Table
          dataSource={lowStockItems}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 1000 }}
        />
      ),
    },
    {
      key: 'expiring',
      label: (
        <span style={{ color: expiryItems.length > 0 ? '#d97706' : undefined }}>
          <ClockCircleOutlined /> Expiring Soon ({expiryItems.length})
        </span>
      ),
      children: (
        <Table
          dataSource={expiryItems}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 1000 }}
        />
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Inventory Dashboard</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Add Item
          </Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Items" value={data?.total || 0} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={lowStockItems.length}
              valueStyle={{ color: lowStockItems.length > 0 ? '#dc2626' : undefined }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Expiring Soon (30d)"
              value={expiryItems.length}
              valueStyle={{ color: expiryItems.length > 0 ? '#d97706' : undefined }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Inventory Value"
              value={totalValue}
              precision={2}
              prefix="₱"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
      </Card>

      {/* Create Item Modal */}
      <Modal
        title="Add Inventory Item"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createItem.isPending}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="itemName" label="Item Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="itemCode" label="Item Code" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Category">
                <Input placeholder="e.g. Antibiotics, Analgesics" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label="Unit">
                <Input placeholder="e.g. tablet, bottle, vial" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="currentStock" label="Current Stock" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minimumStock" label="Minimum Stock" initialValue={10}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="expiryDate" label="Expiry Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unitCost" label="Unit Cost (₱)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sellingPrice" label="Selling Price (₱)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batchNo" label="Batch No.">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="Location">
                <Input placeholder="e.g. Shelf A3" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        title={`Adjust Stock — ${selectedItem?.itemName}`}
        open={adjustModalOpen}
        onCancel={() => { setAdjustModalOpen(false); adjustForm.resetFields(); }}
        onOk={() => adjustForm.submit()}
        confirmLoading={adjustStock.isPending}
      >
        {selectedItem && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">
              Current Stock: <Typography.Text strong>{selectedItem.currentStock} {selectedItem.unit || 'units'}</Typography.Text>
            </Typography.Text>
          </div>
        )}
        <Form form={adjustForm} layout="vertical" onFinish={handleAdjust}>
          <Form.Item
            name="adjustment"
            label="Adjustment (use negative to subtract)"
            rules={[{ required: true, message: 'Enter adjustment amount' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="e.g. +50 or -10"
            />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Reason for stock adjustment..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryDashboardPage;
