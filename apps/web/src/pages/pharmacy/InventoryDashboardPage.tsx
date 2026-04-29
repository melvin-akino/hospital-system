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
  Drawer,
  Popconfirm,
  Descriptions,
  Alert,
  Badge,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  BarcodeOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { App } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useInventory,
  useLowStockAlerts,
  useExpiryAlerts,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useAdjustStock,
} from '../../hooks/usePharmacy';
import api from '../../lib/api';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

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
  location?: string;
  isActive: boolean;
  medication?: { genericName: string; brandName?: string };
  supplier?: { name: string };
}

interface InventoryBatch {
  id: string;
  inventoryItemId: string;
  batchNo?: string;
  expiryDate?: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  poId?: string;
  poNumber?: string;
  supplierId?: string;
  supplierName?: string;
  status: string;
  notes?: string;
  receivedAt: string;
  receivedBy?: string;
}

const BATCH_STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'green', DEPLETED: 'default', RECALLED: 'red', QUARANTINE: 'orange',
};

const getStockStatus = (item: InventoryItem) => {
  if (item.currentStock === 0) return { color: 'red', label: 'Out of Stock' };
  if (item.currentStock <= item.minimumStock) return { color: 'orange', label: 'Low Stock' };
  return { color: 'green', label: 'In Stock' };
};

/* ── Batches Drawer ──────────────────────────────────────────────────────── */
const BatchesDrawer: React.FC<{
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
}> = ({ item, open, onClose }) => {
  const { message } = App.useApp();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-batches', item?.id],
    queryFn: () => api.get(`/inventory/${item!.id}/batches`).then((r) => r.data?.data),
    enabled: !!item?.id && open,
  });

  const updateBatch = useMutation({
    mutationFn: ({ batchId, payload }: { batchId: string; payload: Record<string, unknown> }) =>
      api.put(`/inventory/batches/${batchId}`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-batches', item?.id] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const handleRecall = async (batch: InventoryBatch) => {
    try {
      await updateBatch.mutateAsync({ batchId: batch.id, payload: { status: 'RECALLED' } });
      message.success(`Batch ${batch.batchNo || batch.id.slice(-6)} recalled — stock adjusted`);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Failed to recall batch');
    }
  };

  const handleQuarantine = async (batch: InventoryBatch) => {
    try {
      await updateBatch.mutateAsync({ batchId: batch.id, payload: { status: 'QUARANTINE' } });
      message.success(`Batch quarantined`);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Failed to quarantine batch');
    }
  };

  const batches: InventoryBatch[] = data?.batches || [];
  const activeBatches = batches.filter((b) => b.status === 'ACTIVE');
  const totalReceived = batches.reduce((s, b) => s + b.quantityReceived, 0);
  const totalRemaining = batches.filter((b) => b.status === 'ACTIVE').reduce((s, b) => s + b.quantityRemaining, 0);

  const getExpiryTag = (expiryDate?: string) => {
    if (!expiryDate) return <Tag>No Expiry</Tag>;
    const daysLeft = dayjs(expiryDate).diff(dayjs(), 'day');
    if (daysLeft < 0) return <Tag color="red">Expired ({dayjs(expiryDate).format('MMM D, YYYY')})</Tag>;
    if (daysLeft <= 30) return <Tag color="orange">Expiring {dayjs(expiryDate).format('MMM D, YYYY')} ({daysLeft}d)</Tag>;
    return <Tag color="green">{dayjs(expiryDate).format('MMM D, YYYY')}</Tag>;
  };

  const columns = [
    {
      title: 'Batch / Lot #',
      key: 'batch',
      width: 130,
      render: (_: any, b: InventoryBatch) => (
        <div>
          <Text strong>{b.batchNo || <Text type="secondary">—</Text>}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {b.poNumber ? `PO: ${b.poNumber}` : `ID: ${b.id.slice(-6)}`}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s: string) => <Tag color={BATCH_STATUS_COLOR[s] || 'default'}>{s}</Tag>,
    },
    {
      title: 'Received / Remaining',
      key: 'qty',
      width: 160,
      render: (_: any, b: InventoryBatch) => {
        const pct = b.quantityReceived > 0
          ? Math.round((b.quantityRemaining / b.quantityReceived) * 100)
          : 0;
        return (
          <div>
            <div style={{ fontSize: 12, marginBottom: 2 }}>
              {b.quantityRemaining} / {b.quantityReceived} {item?.unit || 'units'}
            </div>
            <Progress
              percent={pct}
              size="small"
              strokeColor={pct <= 20 ? '#ff4d4f' : pct <= 50 ? '#faad14' : '#52c41a'}
              showInfo={false}
            />
          </div>
        );
      },
    },
    {
      title: 'Expiry',
      key: 'expiry',
      width: 190,
      render: (_: any, b: InventoryBatch) => getExpiryTag(b.expiryDate),
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unitCost',
      width: 90,
      render: (v: number) => `₱${Number(v).toFixed(2)}`,
    },
    {
      title: 'Received',
      key: 'receivedAt',
      width: 130,
      render: (_: any, b: InventoryBatch) => (
        <Tooltip title={b.receivedBy ? `by ${b.receivedBy}` : undefined}>
          <Text style={{ fontSize: 12 }}>{dayjs(b.receivedAt).format('MMM D, YYYY')}</Text>
          {b.supplierName && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>{b.supplierName}</Text>
            </>
          )}
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: any, b: InventoryBatch) =>
        b.status === 'ACTIVE' ? (
          <Space size={4}>
            <Popconfirm
              title="Quarantine this batch?"
              description="Stock will be adjusted."
              onConfirm={() => handleQuarantine(b)}
              okText="Quarantine"
              okButtonProps={{ style: { background: '#fa8c16', borderColor: '#fa8c16' } }}
            >
              <Button size="small" icon={<ExclamationCircleOutlined />} style={{ color: '#fa8c16', borderColor: '#fa8c16' }}>
                Quarantine
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Recall this batch?"
              description="Stock will be decremented."
              onConfirm={() => handleRecall(b)}
              okText="Recall"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<StopOutlined />}>Recall</Button>
            </Popconfirm>
          </Space>
        ) : (
          <Tag color={BATCH_STATUS_COLOR[b.status]}>{b.status}</Tag>
        ),
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <BarcodeOutlined style={{ color: '#722ed1' }} />
          Batch / Lot Tracking — {item?.itemName}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={900}
    >
      {item && (
        <>
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Current Stock"
                  value={item.currentStock}
                  suffix={item.unit || 'units'}
                  valueStyle={{ color: item.currentStock <= item.minimumStock ? '#dc2626' : '#16a34a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Active Batches" value={activeBatches.length} prefix={<CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Total Received (all time)" value={totalReceived} suffix={item.unit || 'units'} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Remaining (active batches)"
                  value={totalRemaining}
                  suffix={item.unit || 'units'}
                />
              </Card>
            </Col>
          </Row>

          {batches.some((b) => b.expiryDate && dayjs(b.expiryDate).diff(dayjs(), 'day') <= 30 && b.status === 'ACTIVE') && (
            <Alert
              type="warning"
              showIcon
              message="One or more active batches are expiring within 30 days."
              style={{ marginBottom: 12 }}
            />
          )}

          <Table
            dataSource={batches}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 960 }}
            rowClassName={(b) => {
              if (b.status === 'RECALLED') return 'row-recalled';
              if (b.status === 'QUARANTINE') return 'row-quarantine';
              return '';
            }}
            locale={{ emptyText: 'No batch records yet. Batches are created when a PO is received.' }}
          />
        </>
      )}
    </Drawer>
  );
};

/* ── Main Page ───────────────────────────────────────────────────────────── */
const InventoryDashboardPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [batchesDrawerOpen, setBatchesDrawerOpen] = useState(false);
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

  const openBatches = (item: InventoryItem) => {
    setSelectedItem(item);
    setBatchesDrawerOpen(true);
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
      title: 'Latest Batch / Expiry',
      key: 'batch',
      render: (_: unknown, row: InventoryItem) => (
        <div>
          {row.batchNo && <Tag icon={<BarcodeOutlined />} color="purple" style={{ marginBottom: 2 }}>{row.batchNo}</Tag>}
          {row.expiryDate && (() => {
            const daysLeft = dayjs(row.expiryDate).diff(dayjs(), 'day');
            if (daysLeft < 0) return <Tag color="red">Expired</Tag>;
            if (daysLeft <= 30) return <Tag color="orange">{dayjs(row.expiryDate).format('MMM D, YYYY')}</Tag>;
            return <Tag color="default">{dayjs(row.expiryDate).format('MMM D, YYYY')}</Tag>;
          })()}
          {!row.batchNo && !row.expiryDate && <Text type="secondary">—</Text>}
        </div>
      ),
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
        <Space size={4}>
          <Button size="small" onClick={() => openAdjust(row)}>Adjust</Button>
          <Tooltip title="View batch / lot history">
            <Button
              size="small"
              icon={<BarcodeOutlined />}
              onClick={() => openBatches(row)}
            >
              Lots
            </Button>
          </Tooltip>
        </Space>
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
          scroll={{ x: 1100 }}
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
          scroll={{ x: 1100 }}
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
          scroll={{ x: 1100 }}
        />
      ),
    },
  ];

  return (
    <App>
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

        {/* Batches / Lot Tracking Drawer */}
        <BatchesDrawer
          item={selectedItem}
          open={batchesDrawerOpen}
          onClose={() => setBatchesDrawerOpen(false)}
        />
      </div>
    </App>
  );
};

export default InventoryDashboardPage;
