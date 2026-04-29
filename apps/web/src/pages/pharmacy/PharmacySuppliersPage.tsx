import React, { useState } from 'react';
import {
  Table, Button, Input, Space, Tag, Typography, Card, Row, Col,
  Drawer, Form, Popconfirm, Badge, Statistic, Tooltip, Descriptions,
  Tabs, Empty, Modal, Switch, message as antMessage,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ShopOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
  EyeOutlined, ShoppingCartOutlined, AppstoreOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { App } from 'antd';
import dayjs from 'dayjs';
import {
  useSuppliers, useSupplier, useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
} from '../../hooks/usePharmacy';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface SupplierFormValues {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
}

/* ─── Detail Drawer ────────────────────────────────────────────────────── */
const SupplierDetailDrawer: React.FC<{
  id: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (s: any) => void;
}> = ({ id, open, onClose, onEdit }) => {
  const { data, isLoading } = useSupplier(id ?? '');
  const supplier = data?.data;

  const poColumns = [
    { title: 'PO #',     dataIndex: 'poNumber',    key: 'po' },
    { title: 'Status',   dataIndex: 'status',      key: 'st',
      render: (v: string) => {
        const color: Record<string,string> = { PENDING:'orange',APPROVED:'blue',RECEIVED:'green',CANCELLED:'red' };
        return <Tag color={color[v] || 'default'}>{v}</Tag>;
      },
    },
    { title: 'Date',     dataIndex: 'orderedAt',   key: 'dt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    { title: 'Amount',   dataIndex: 'totalAmount', key: 'amt',
      render: (v: any) => v ? `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—',
    },
  ];

  const itemColumns = [
    { title: 'Item',       dataIndex: 'itemName',     key: 'name' },
    { title: 'Code',       dataIndex: 'itemCode',     key: 'code' },
    { title: 'Stock',      dataIndex: 'currentStock', key: 'stock',
      render: (v: number) => <Tag color={v <= 0 ? 'red' : v < 10 ? 'orange' : 'green'}>{v}</Tag>,
    },
    { title: 'Sell Price', dataIndex: 'sellingPrice', key: 'price',
      render: (v: any) => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <ShopOutlined style={{ color: '#722ed1' }} />
          <span>Supplier Details</span>
        </Space>
      }
      open={open}
      onClose={onClose}
      width={640}
      extra={
        supplier && (
          <Button icon={<EditOutlined />} type="primary" ghost onClick={() => { onClose(); onEdit(supplier); }}>
            Edit
          </Button>
        )
      }
    >
      {isLoading && <div style={{ textAlign: 'center', padding: 40 }}>Loading…</div>}
      {supplier && (
        <>
          <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
            <Descriptions.Item label="Name" span={2}>
              <Text strong style={{ fontSize: 16 }}>{supplier.name}</Text>
              {!supplier.isActive && <Tag color="red" style={{ marginLeft: 8 }}>Inactive</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Person">
              {supplier.contact || <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {supplier.phone
                ? <Space><PhoneOutlined />{supplier.phone}</Space>
                : <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Email" span={2}>
              {supplier.email
                ? <Space><MailOutlined />{supplier.email}</Space>
                : <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>
              {supplier.address
                ? <Space><EnvironmentOutlined />{supplier.address}</Space>
                : <Text type="secondary">—</Text>}
            </Descriptions.Item>
          </Descriptions>

          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Statistic
                  title="Inventory Items"
                  value={supplier._count?.inventoryItems ?? 0}
                  prefix={<AppstoreOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Statistic
                  title="Purchase Orders"
                  value={supplier._count?.purchaseOrders ?? 0}
                  prefix={<ShoppingCartOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          <Tabs
            defaultActiveKey="items"
            items={[
              {
                key: 'items',
                label: `Inventory Items (${supplier._count?.inventoryItems ?? 0})`,
                children: (
                  <Table
                    dataSource={supplier.inventoryItems || []}
                    columns={itemColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    locale={{ emptyText: <Empty description="No items linked" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  />
                ),
              },
              {
                key: 'orders',
                label: `Purchase Orders (${supplier._count?.purchaseOrders ?? 0})`,
                children: (
                  <Table
                    dataSource={supplier.purchaseOrders || []}
                    columns={poColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    locale={{ emptyText: <Empty description="No purchase orders" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  />
                ),
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
};

/* ─── Main Page ────────────────────────────────────────────────────────── */
const PharmacySuppliersPage: React.FC = () => {
  const { message } = App.useApp();

  const [search, setSearch]             = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Drawer / modal state
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editing, setEditing]           = useState<any>(null);        // null = add new
  const [detailId, setDetailId]         = useState<string | null>(null);
  const [detailOpen, setDetailOpen]     = useState(false);

  const [form] = Form.useForm<SupplierFormValues>();

  // ── Queries / Mutations ──────────────────────────────────────────────
  const { data: suppliersData, isLoading, refetch } = useSuppliers(
    showInactive ? { all: 'true' } : undefined
  );
  const rawSuppliers: any[] = suppliersData?.data || [];

  // Client-side text filter (fast, no extra round-trip for search)
  const suppliers = search
    ? rawSuppliers.filter((s) =>
        [s.name, s.contact, s.email, s.phone].some(
          (f) => f?.toLowerCase().includes(search.toLowerCase())
        )
      )
    : rawSuppliers;

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  // ── Stats ────────────────────────────────────────────────────────────
  const total    = rawSuppliers.length;
  const active   = rawSuppliers.filter((s) => s.isActive).length;
  const inactive = rawSuppliers.filter((s) => !s.isActive).length;
  const withEmail = rawSuppliers.filter((s) => s.email).length;

  // ── Drawer helpers ───────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (supplier: any) => {
    setEditing(supplier);
    form.setFieldsValue({
      name:    supplier.name,
      contact: supplier.contact,
      phone:   supplier.phone,
      email:   supplier.email,
      address: supplier.address,
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const handleSubmit = async (values: SupplierFormValues) => {
    try {
      if (editing) {
        await updateSupplier.mutateAsync({ id: editing.id, data: values as any });
      } else {
        await createSupplier.mutateAsync(values as any);
      }
      closeDrawer();
    } catch {
      // error handled in hook
    }
  };

  const handleDeactivate = async (id: string) => {
    await deleteSupplier.mutateAsync(id);
  };

  const handleReactivate = async (supplier: any) => {
    await updateSupplier.mutateAsync({ id: supplier.id, data: { ...supplier, isActive: true } });
  };

  // ── Table columns ─────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Space>
            <Text strong>{r.name}</Text>
            {!r.isActive && <Tag color="red">Inactive</Tag>}
          </Space>
          {r.contact && <Text type="secondary" style={{ fontSize: 12 }}>{r.contact}</Text>}
        </Space>
      ),
    },
    {
      title: 'Contact Info',
      key: 'contact',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          {r.phone && (
            <Text style={{ fontSize: 12 }}>
              <PhoneOutlined style={{ marginRight: 4, color: '#52c41a' }} />{r.phone}
            </Text>
          )}
          {r.email && (
            <Text style={{ fontSize: 12 }}>
              <MailOutlined style={{ marginRight: 4, color: '#1890ff' }} />{r.email}
            </Text>
          )}
          {!r.phone && !r.email && <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
        </Space>
      ),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (v: string) => v
        ? <Text style={{ fontSize: 12 }}><EnvironmentOutlined style={{ marginRight: 4, color: '#fa8c16' }} />{v}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Items',
      key: 'items',
      width: 80,
      align: 'center' as const,
      render: (_: any, r: any) => (
        <Badge count={r._count?.inventoryItems ?? 0} color="#1890ff" showZero />
      ),
    },
    {
      title: 'POs',
      key: 'pos',
      width: 80,
      align: 'center' as const,
      render: (_: any, r: any) => (
        <Badge count={r._count?.purchaseOrders ?? 0} color="#722ed1" showZero />
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 90,
      render: (_: any, r: any) => (
        <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_: any, r: any) => (
        <Space>
          <Tooltip title="View details">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => { setDetailId(r.id); setDetailOpen(true); }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          {r.isActive ? (
            <Tooltip title="Deactivate">
              <Popconfirm
                title="Deactivate supplier?"
                description="The supplier will be hidden from new PO forms. Existing records are preserved."
                onConfirm={() => handleDeactivate(r.id)}
                okText="Deactivate"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          ) : (
            <Tooltip title="Reactivate">
              <Button
                size="small"
                icon={<ReloadOutlined />}
                style={{ color: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => handleReactivate(r)}
              />
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
              <ShopOutlined style={{ fontSize: 24, color: '#722ed1' }} />
              <Title level={3} style={{ margin: 0 }}>Suppliers</Title>
            </Space>
            <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 2 }}>
              Manage pharmacy suppliers and vendor information
            </div>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
              style={{ background: '#722ed1', borderColor: '#722ed1' }}>
              Add Supplier
            </Button>
          </Col>
        </Row>

        {/* ── Stats ── */}
        <Row gutter={16} style={{ marginBottom: 20 }}>
          {[
            { title: 'Total Suppliers', value: total,    color: '#1890ff' },
            { title: 'Active',          value: active,   color: '#52c41a' },
            { title: 'Inactive',        value: inactive, color: '#8c8c8c' },
            { title: 'With Email',      value: withEmail,color: '#fa8c16' },
          ].map((s) => (
            <Col xs={12} sm={6} key={s.title}>
              <Card size="small">
                <Statistic title={s.title} value={s.value} valueStyle={{ color: s.color, fontSize: 24 }} />
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── Filter bar ── */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={12} align="middle">
            <Col flex={1}>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search by name, contact, email, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col>
              <Space>
                <Text type="secondary">Show inactive</Text>
                <Switch checked={showInactive} onChange={setShowInactive} size="small" />
              </Space>
            </Col>
          </Row>
        </Card>

        {/* ── Table ── */}
        <Card>
          <Table
            dataSource={suppliers}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 15, showTotal: (t) => `${t} suppliers` }}
            locale={{ emptyText: <Empty description="No suppliers found" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            rowClassName={(r) => (!r.isActive ? 'ant-table-row-disabled' : '')}
          />
        </Card>

        {/* ── Add / Edit Drawer ── */}
        <Drawer
          title={
            <Space>
              <ShopOutlined style={{ color: '#722ed1' }} />
              <span>{editing ? 'Edit Supplier' : 'Add New Supplier'}</span>
            </Space>
          }
          open={drawerOpen}
          onClose={closeDrawer}
          width={480}
          extra={
            <Space>
              <Button onClick={closeDrawer}>Cancel</Button>
              <Button
                type="primary"
                loading={createSupplier.isPending || updateSupplier.isPending}
                onClick={() => form.submit()}
                style={{ background: '#722ed1', borderColor: '#722ed1' }}
              >
                {editing ? 'Save Changes' : 'Create Supplier'}
              </Button>
            </Space>
          }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="name"
              label="Supplier Name"
              rules={[{ required: true, message: 'Supplier name is required' }]}
            >
              <Input prefix={<ShopOutlined />} placeholder="e.g. PhilMed Distributors Inc." />
            </Form.Item>

            <Form.Item name="contact" label="Contact Person">
              <Input placeholder="Full name of primary contact" />
            </Form.Item>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="phone" label="Phone / Mobile">
                  <Input prefix={<PhoneOutlined />} placeholder="+63 9XX XXX XXXX" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email Address"
                  rules={[{ type: 'email', message: 'Enter a valid email' }]}
                >
                  <Input prefix={<MailOutlined />} placeholder="orders@supplier.com" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="address" label="Address">
              <TextArea
                rows={3}
                placeholder="Complete business address"
                style={{ resize: 'none' }}
              />
            </Form.Item>
          </Form>

          {editing && (
            <Card size="small" style={{ marginTop: 16, background: '#fafafa' }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Created {dayjs(editing.createdAt).format('MMM D, YYYY')}
                  </Text>
                </Col>
                <Col>
                  <Tag color={editing.isActive ? 'green' : 'default'}>
                    {editing.isActive ? 'Active' : 'Inactive'}
                  </Tag>
                </Col>
              </Row>
            </Card>
          )}
        </Drawer>

        {/* ── Detail Drawer ── */}
        <SupplierDetailDrawer
          id={detailId}
          open={detailOpen}
          onClose={() => { setDetailOpen(false); setDetailId(null); }}
          onEdit={(s) => { openEdit(s); }}
        />
      </div>
    </App>
  );
};

export default PharmacySuppliersPage;
