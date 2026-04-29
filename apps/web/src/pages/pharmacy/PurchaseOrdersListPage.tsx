import React, { useState } from 'react';
import {
  Table, Button, Space, Tag, Typography, Card, Row, Col,
  Modal, Descriptions, Statistic, Select, DatePicker, Drawer,
  Form, Input, InputNumber, Tooltip, Popconfirm, Alert,
  Steps, message as antMessage, Empty, Badge, Divider,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, CheckOutlined, InboxOutlined,
  CloseOutlined, ShoppingCartOutlined, FilterOutlined,
  ShopOutlined, FileTextOutlined, SyncOutlined,
} from '@ant-design/icons';
import { App } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const formatPeso = (v: any) =>
  `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'orange', APPROVED: 'blue', RECEIVED: 'green', CANCELLED: 'red',
};

const STATUS_STEPS = ['PENDING', 'APPROVED', 'RECEIVED'];

/* ── Hooks ─────────────────────────────────────────────────────────────── */
const usePurchaseOrders = (params: Record<string, unknown> = {}) => {
  const clean: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') clean[k] = String(v); });
  return useQuery({
    queryKey: ['purchase-orders', clean],
    queryFn: () => api.get('/purchase-orders', { params: clean }).then((r) => r.data),
  });
};

const usePurchaseOrder = (id: string) =>
  useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => api.get(`/purchase-orders/${id}`).then((r) => r.data?.data),
    enabled: !!id,
  });

const useUpdatePO = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/purchase-orders/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['purchase-order'] });
    },
  });
};

const useReceivePO = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post(`/purchase-orders/${id}/receive`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['purchase-order'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

const useCancelPO = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/purchase-orders/${id}/cancel`, {}).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
};

const useSuppliers = () =>
  useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then((r) => r.data?.data || []),
  });

/* ── Receive Modal ──────────────────────────────────────────────────────── */
const ReceiveModal: React.FC<{
  po: any;
  open: boolean;
  onClose: () => void;
}> = ({ po, open, onClose }) => {
  const { message } = App.useApp();
  const receivePO = useReceivePO();
  const [form] = Form.useForm();

  const handleReceive = async () => {
    try {
      const values = await form.validateFields();
      const receivedItems = po.items.map((item: any, idx: number) => ({
        poItemId: item.id,
        receivedQty: values[`qty_${idx}`] ?? item.quantity,
        unitCost:    values[`cost_${idx}`] ?? Number(item.unitCost),
        batchNo:     values[`batch_${idx}`] || undefined,
        expiryDate:  values[`expiry_${idx}`] ? values[`expiry_${idx}`].toISOString() : undefined,
      }));

      const result = await receivePO.mutateAsync({ id: po.id, data: { receivedItems, notes: values.notes } });
      message.success(result?.message || 'PO received successfully');
      form.resetFields();
      onClose();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Failed to receive PO');
    }
  };

  if (!po) return null;

  return (
    <Modal
      title={<Space><InboxOutlined style={{ color: '#52c41a' }} />Receive PO — {po.poNumber}</Space>}
      open={open}
      onCancel={onClose}
      onOk={handleReceive}
      okText="Mark as Received"
      okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' }, loading: receivePO.isPending }}
      width={680}
    >
      <Alert
        type="info"
        showIcon
        message="Items matching inventory names will have their stock updated automatically."
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical" size="small">
        <Table
          dataSource={po.items || []}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            { title: 'Item',       dataIndex: 'itemName', key: 'name', width: 160 },
            { title: 'Ordered',    dataIndex: 'quantity', key: 'ord',  width: 70, align: 'center' as const },
            {
              title: 'Received Qty', key: 'rqty', width: 90,
              render: (_: any, r: any, idx: number) => (
                <Form.Item name={`qty_${idx}`} initialValue={r.quantity} style={{ margin: 0 }}>
                  <InputNumber min={0} max={r.quantity * 2} size="small" style={{ width: '100%' }} />
                </Form.Item>
              ),
            },
            {
              title: 'Unit Cost', key: 'cost', width: 100,
              render: (_: any, r: any, idx: number) => (
                <Form.Item name={`cost_${idx}`} initialValue={Number(r.unitCost)} style={{ margin: 0 }}>
                  <InputNumber min={0} precision={2} prefix="₱" size="small" style={{ width: '100%' }} />
                </Form.Item>
              ),
            },
            {
              title: 'Batch #', key: 'batch', width: 100,
              render: (_: any, _r: any, idx: number) => (
                <Form.Item name={`batch_${idx}`} style={{ margin: 0 }}>
                  <Input size="small" placeholder="Lot/Batch" />
                </Form.Item>
              ),
            },
            {
              title: 'Expiry', key: 'expiry', width: 130,
              render: (_: any, _r: any, idx: number) => (
                <Form.Item name={`expiry_${idx}`} style={{ margin: 0 }}>
                  <DatePicker size="small" style={{ width: '100%' }} />
                </Form.Item>
              ),
            },
          ]}
        />
        <Form.Item name="notes" label="Receiving Notes" style={{ marginTop: 12 }}>
          <Input.TextArea rows={2} placeholder="Condition of goods, partial deliveries, etc." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

/* ── Detail Drawer ──────────────────────────────────────────────────────── */
const PODetailDrawer: React.FC<{
  id: string | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReceive: (po: any) => void;
  onCancel: (id: string) => void;
}> = ({ id, open, onClose, onApprove, onReceive, onCancel }) => {
  const { data: po, isLoading } = usePurchaseOrder(id ?? '');

  const stepIdx = po ? STATUS_STEPS.indexOf(po.status) : 0;

  return (
    <Drawer
      title={<Space><FileTextOutlined style={{ color: '#722ed1' }} />{po?.poNumber || 'Purchase Order'}</Space>}
      open={open}
      onClose={onClose}
      width={620}
      extra={
        po && (
          <Space>
            {po.status === 'PENDING' && (
              <Button type="primary" icon={<CheckOutlined />} onClick={() => { onClose(); onApprove(po.id); }}>
                Approve
              </Button>
            )}
            {po.status === 'APPROVED' && (
              <Button
                type="primary" icon={<InboxOutlined />}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => { onClose(); onReceive(po); }}
              >
                Receive
              </Button>
            )}
            {(po.status === 'PENDING' || po.status === 'APPROVED') && (
              <Popconfirm
                title="Cancel this purchase order?"
                onConfirm={() => { onClose(); onCancel(po.id); }}
                okText="Cancel PO"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<CloseOutlined />}>Cancel</Button>
              </Popconfirm>
            )}
          </Space>
        )
      }
    >
      {isLoading && <div style={{ textAlign: 'center', padding: 40 }}>Loading…</div>}
      {po && (
        <>
          {po.status !== 'CANCELLED' && (
            <Steps
              current={Math.max(0, stepIdx)}
              size="small"
              style={{ marginBottom: 20 }}
              items={[
                { title: 'Pending',  status: stepIdx >= 0 ? 'finish' : 'wait' },
                { title: 'Approved', status: stepIdx >= 1 ? 'finish' : stepIdx === 0 ? 'process' : 'wait' },
                { title: 'Received', status: stepIdx >= 2 ? 'finish' : stepIdx === 1 ? 'process' : 'wait' },
              ]}
            />
          )}

          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="PO Number" span={2}>
              <Text strong>{po.poNumber}</Text>
              <Tag color={STATUS_COLOR[po.status]} style={{ marginLeft: 8 }}>{po.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Supplier" span={2}>{po.supplier?.name}</Descriptions.Item>
            <Descriptions.Item label="Ordered Date">{dayjs(po.orderedAt).format('MMM D, YYYY h:mm A')}</Descriptions.Item>
            {po.receivedAt && <Descriptions.Item label="Received Date">{dayjs(po.receivedAt).format('MMM D, YYYY')}</Descriptions.Item>}
            <Descriptions.Item label="Total Amount" span={po.receivedAt ? 1 : 2}>
              <Text strong style={{ color: '#722ed1', fontSize: 16 }}>{formatPeso(po.totalAmount)}</Text>
            </Descriptions.Item>
            {po.notes && <Descriptions.Item label="Notes" span={2}>{po.notes}</Descriptions.Item>}
          </Descriptions>

          <Title level={5}>Items</Title>
          <Table
            dataSource={po.items || []}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Item',       dataIndex: 'itemName', key: 'name' },
              { title: 'Qty',        dataIndex: 'quantity', key: 'qty', width: 70, align: 'center' as const },
              { title: 'Unit Cost',  dataIndex: 'unitCost', key: 'cost', width: 100,
                render: (v: any) => formatPeso(v) },
              { title: 'Total',      dataIndex: 'total',    key: 'total', width: 110,
                render: (v: any) => <Text strong>{formatPeso(v)}</Text> },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}><Text strong>Total</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong style={{ color: '#722ed1' }}>{formatPeso(po.totalAmount)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </>
      )}
    </Drawer>
  );
};

/* ── Main Page ──────────────────────────────────────────────────────────── */
const PurchaseOrdersListPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');

  const [detailId, setDetailId]     = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiveModal, setReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO]    = useState<any>(null);

  const { data: poData, isLoading } = usePurchaseOrders({
    status: statusFilter || undefined,
    supplierId: supplierFilter || undefined,
  });
  const { data: suppliers = [] } = useSuppliers();

  const pos: any[] = poData?.data || [];

  const updatePO   = useUpdatePO();
  const cancelPO   = useCancelPO();

  // Stats
  const pending  = pos.filter((p) => p.status === 'PENDING').length;
  const approved = pos.filter((p) => p.status === 'APPROVED').length;
  const received = pos.filter((p) => p.status === 'RECEIVED').length;
  const totalValue = pos.reduce((s, p) => s + Number(p.totalAmount || 0), 0);

  const handleApprove = async (id: string) => {
    try {
      await updatePO.mutateAsync({ id, data: { status: 'APPROVED' } });
      message.success('Purchase order approved');
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Failed to approve');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelPO.mutateAsync(id);
      message.success('Purchase order cancelled');
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Failed to cancel');
    }
  };

  const columns = [
    {
      title: 'PO Number',
      dataIndex: 'poNumber',
      key: 'po',
      render: (v: string, r: any) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => { setDetailId(r.id); setDetailOpen(true); }}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_: any, r: any) => (
        <Space>
          <ShopOutlined style={{ color: '#722ed1' }} />
          <Text>{r.supplier?.name}</Text>
        </Space>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      width: 70,
      align: 'center' as const,
      render: (_: any, r: any) => <Badge count={r.items?.length || 0} color="#1890ff" showZero />,
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'total',
      render: (v: any) => <Text strong style={{ color: '#722ed1' }}>{formatPeso(v)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
    },
    {
      title: 'Date',
      dataIndex: 'orderedAt',
      key: 'date',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: any, r: any) => (
        <Space>
          <Tooltip title="View">
            <Button size="small" icon={<EyeOutlined />} onClick={() => { setDetailId(r.id); setDetailOpen(true); }} />
          </Tooltip>
          {r.status === 'PENDING' && (
            <Tooltip title="Approve">
              <Popconfirm title="Approve this PO?" onConfirm={() => handleApprove(r.id)} okText="Approve">
                <Button size="small" icon={<CheckOutlined />} type="primary" />
              </Popconfirm>
            </Tooltip>
          )}
          {r.status === 'APPROVED' && (
            <Tooltip title="Receive">
              <Button
                size="small"
                icon={<InboxOutlined />}
                style={{ color: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => { setSelectedPO(r); setReceiveModal(true); }}
              />
            </Tooltip>
          )}
          {(r.status === 'PENDING' || r.status === 'APPROVED') && (
            <Tooltip title="Cancel">
              <Popconfirm title="Cancel this PO?" onConfirm={() => handleCancel(r.id)} okText="Cancel" okButtonProps={{ danger: true }}>
                <Button size="small" danger icon={<CloseOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <App>
      <div style={{ padding: 24 }}>
        {/* ── Header ── */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
          <Col>
            <Space>
              <ShoppingCartOutlined style={{ fontSize: 24, color: '#722ed1' }} />
              <Title level={3} style={{ margin: 0 }}>Purchase Orders</Title>
            </Space>
            <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 2 }}>
              Manage procurement, approve orders, and receive stock
            </div>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/pharmacy/purchase-orders/new')}
              style={{ background: '#722ed1', borderColor: '#722ed1' }}
            >
              New Purchase Order
            </Button>
          </Col>
        </Row>

        {/* ── Stats ── */}
        <Row gutter={16} style={{ marginBottom: 20 }}>
          {[
            { label: 'Pending Approval', value: pending,    color: '#fa8c16' },
            { label: 'Approved',         value: approved,   color: '#1890ff' },
            { label: 'Received',         value: received,   color: '#52c41a' },
            { label: 'Total Value',      value: formatPeso(totalValue), color: '#722ed1', raw: true },
          ].map((s) => (
            <Col xs={12} sm={6} key={s.label}>
              <Card size="small">
                {s.raw
                  ? <div><div style={{ color: '#8c8c8c', fontSize: 12 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div></div>
                  : <Statistic title={s.label} value={s.value as number} valueStyle={{ color: s.color, fontSize: 24 }} />
                }
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── Filters ── */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={12} align="middle">
            <Col>
              <FilterOutlined style={{ color: '#8c8c8c' }} />
            </Col>
            <Col>
              <Select
                placeholder="All Statuses"
                allowClear
                value={statusFilter || undefined}
                onChange={(v) => setStatusFilter(v || '')}
                style={{ width: 160 }}
                options={['PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'].map((s) => ({
                  value: s, label: s,
                }))}
              />
            </Col>
            <Col>
              <Select
                placeholder="All Suppliers"
                showSearch
                allowClear
                value={supplierFilter || undefined}
                onChange={(v) => setSupplierFilter(v || '')}
                style={{ width: 220 }}
                optionFilterProp="label"
                options={(suppliers as any[]).map((s: any) => ({ value: s.id, label: s.name }))}
              />
            </Col>
          </Row>
        </Card>

        {/* ── Table ── */}
        <Card>
          <Table
            dataSource={pos}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 15, showTotal: (t) => `${t} purchase orders` }}
            locale={{ emptyText: <Empty description="No purchase orders found" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        </Card>

        {/* ── Detail Drawer ── */}
        <PODetailDrawer
          id={detailId}
          open={detailOpen}
          onClose={() => { setDetailOpen(false); setDetailId(null); }}
          onApprove={handleApprove}
          onReceive={(po) => { setSelectedPO(po); setReceiveModal(true); }}
          onCancel={handleCancel}
        />

        {/* ── Receive Modal ── */}
        {selectedPO && (
          <ReceiveModal
            po={selectedPO}
            open={receiveModal}
            onClose={() => { setReceiveModal(false); setSelectedPO(null); }}
          />
        )}
      </div>
    </App>
  );
};

export default PurchaseOrdersListPage;
