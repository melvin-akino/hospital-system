import React, { useState, useMemo } from 'react';
import {
  Card, Table, Button, Space, Tag, Typography, Input, Select, Row, Col,
  Badge, Tooltip, Popconfirm, Alert, Statistic, Modal, message, Divider,
  Descriptions,
} from 'antd';
import {
  DollarOutlined, CheckOutlined, StopOutlined, SearchOutlined,
  ShoppingCartOutlined, InfoCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import {
  useOrderedServices,
  useBulkBillOrderedServices,
  useBillOrderedService,
  useCancelOrderedService,
  useUpdateOrderedServiceStatus,
} from '../../hooks/useOrderedServices';
import api from '../../lib/api';

const { Title, Text } = Typography;

const formatPeso = (v: number | string) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange',
  IN_PROGRESS: 'blue',
  COMPLETED: 'cyan',
  BILLED: 'green',
  CANCELLED: 'red',
};

const OrderedServicesBillingPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [bulkBillModal, setBulkBillModal] = useState(false);
  const [billTargetInfo, setBillTargetInfo] = useState<{ patientId: string; patientName: string; ids: string[] } | null>(null);

  const { data: services = [], isLoading, refetch } = useOrderedServices({
    status: statusFilter || undefined,
    departmentId: deptFilter || undefined,
  });

  const { data: depts } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => api.get('/departments', { params: { limit: 100 } }).then((r) => r.data?.data?.data || r.data?.data || []),
  });

  const bulkBill = useBulkBillOrderedServices();
  const singleBill = useBillOrderedService();
  const cancelService = useCancelOrderedService();
  const updateStatus = useUpdateOrderedServiceStatus();

  // Filter by search text
  const filtered = useMemo(() => {
    if (!search) return services as any[];
    const q = search.toLowerCase();
    return (services as any[]).filter(
      (s) =>
        s.description?.toLowerCase().includes(q) ||
        s.patient?.lastName?.toLowerCase().includes(q) ||
        s.patient?.firstName?.toLowerCase().includes(q) ||
        s.patient?.patientNo?.toLowerCase().includes(q) ||
        s.departmentName?.toLowerCase().includes(q)
    );
  }, [services, search]);

  // Stats
  const pending = (services as any[]).filter((s) => s.status === 'PENDING').length;
  const completed = (services as any[]).filter((s) => s.status === 'COMPLETED').length;
  const totalPendingValue = (services as any[])
    .filter((s) => s.status !== 'BILLED' && s.status !== 'CANCELLED')
    .reduce((sum, s) => sum + Number(s.unitPrice) * s.quantity, 0);

  // Validate selection: must be same patient for bulk bill
  const selectedItems = filtered.filter((s) => selectedRowKeys.includes(s.id));
  const selectedPatientIds = [...new Set(selectedItems.map((s) => s.patientId))];
  const canBulkBill = selectedRowKeys.length > 0 && selectedPatientIds.length === 1;
  const selectedTotal = selectedItems.reduce((sum, s) => sum + Number(s.unitPrice) * s.quantity, 0);

  const openBulkBillModal = () => {
    if (!canBulkBill) {
      message.warning('Please select services from the same patient to bulk-bill.');
      return;
    }
    const first = selectedItems[0];
    setBillTargetInfo({
      patientId: first.patientId,
      patientName: `${first.patient?.lastName}, ${first.patient?.firstName}`,
      ids: selectedRowKeys,
    });
    setBulkBillModal(true);
  };

  const handleBulkBill = async () => {
    if (!billTargetInfo) return;
    try {
      await bulkBill.mutateAsync({ ids: billTargetInfo.ids });
      message.success(`${billTargetInfo.ids.length} service(s) posted to bill.`);
      setSelectedRowKeys([]);
      setBulkBillModal(false);
      setBillTargetInfo(null);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Failed to bill services.');
    }
  };

  const handleSingleBill = async (id: string) => {
    try {
      await singleBill.mutateAsync({ id });
      message.success('Service posted to bill.');
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Failed to bill service.');
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'COMPLETED' });
      message.success('Marked as completed.');
    } catch {
      message.error('Failed to update status.');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelService.mutateAsync(id);
      message.success('Service cancelled.');
    } catch {
      message.error('Failed to cancel.');
    }
  };

  const columns = [
    {
      title: 'Patient',
      key: 'patient',
      width: 180,
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.patient?.lastName}, {r.patient?.firstName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    {
      title: 'Service / Description',
      key: 'description',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text>{r.description}</Text>
          {r.notes && <Text type="secondary" style={{ fontSize: 11 }}>{r.notes}</Text>}
        </Space>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'departmentName',
      width: 140,
      render: (v: string) => v ? <Tag color="geekblue" style={{ fontSize: 11 }}>{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      width: 55,
      align: 'center' as const,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      width: 110,
      render: (v: number) => <Text>{formatPeso(v)}</Text>,
    },
    {
      title: 'Total',
      key: 'total',
      width: 120,
      render: (_: any, r: any) => (
        <Text strong>{formatPeso(Number(r.unitPrice) * r.quantity)}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => (
        <Badge status={v === 'BILLED' ? 'success' : v === 'CANCELLED' ? 'error' : v === 'COMPLETED' ? 'processing' : 'warning'}
          text={<Tag color={STATUS_COLORS[v] || 'default'} style={{ fontSize: 11 }}>{v}</Tag>}
        />
      ),
    },
    {
      title: 'Ordered',
      key: 'orderedAt',
      width: 130,
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 11 }}>{dayjs(r.orderedAt).format('MMM D, YYYY')}</Text>
          {r.orderedByName && <Text type="secondary" style={{ fontSize: 11 }}>{r.orderedByName}</Text>}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 170,
      render: (_: any, r: any) => (
        <Space size={4}>
          {(r.status === 'PENDING' || r.status === 'COMPLETED') && (
            <Tooltip title="Post to patient's active bill">
              <Button
                size="small"
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => handleSingleBill(r.id)}
                loading={singleBill.isPending}
              >
                Bill
              </Button>
            </Tooltip>
          )}
          {r.status === 'PENDING' && (
            <Tooltip title="Mark as completed">
              <Button
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleMarkComplete(r.id)}
              />
            </Tooltip>
          )}
          {(r.status === 'PENDING' || r.status === 'IN_PROGRESS') && (
            <Popconfirm
              title="Cancel this service order?"
              onConfirm={() => handleCancel(r.id)}
            >
              <Tooltip title="Cancel order">
                <Button size="small" danger icon={<StopOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
          {r.status === 'BILLED' && (
            <Tag color="green" style={{ fontSize: 11 }}>
              Billed {r.billedAt ? dayjs(r.billedAt).format('MMM D') : ''}
            </Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <DollarOutlined /> Department Orders — Billing Queue
          </Title>
          <Text type="secondary">
            Services ordered by clinical departments. Post to a patient's active bill when ready.
          </Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Pending Orders" value={pending} valueStyle={{ color: '#fa8c16' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Completed (Unbilled)" value={completed} valueStyle={{ color: '#13c2c2' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Unbilled Value" value={formatPeso(totalPendingValue)} valueStyle={{ color: '#cf1322', fontSize: 18 }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Selected"
              value={selectedRowKeys.length > 0 ? `${selectedRowKeys.length} items · ${formatPeso(selectedTotal)}` : '—'}
              valueStyle={{ fontSize: 14, color: canBulkBill ? '#52c41a' : '#999' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Multi-patient warning */}
      {selectedRowKeys.length > 0 && selectedPatientIds.length > 1 && (
        <Alert
          type="warning"
          showIcon
          message="Selected services belong to multiple patients. You can only bulk-bill services from the same patient at once."
          style={{ marginBottom: 12 }}
        />
      )}

      <Card>
        {/* Filters */}
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by patient name, service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={5}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="IN_PROGRESS">In Progress</Select.Option>
              <Select.Option value="COMPLETED">Completed</Select.Option>
              <Select.Option value="BILLED">Billed</Select.Option>
              <Select.Option value="CANCELLED">Cancelled</Select.Option>
            </Select>
          </Col>
          <Col span={5}>
            <Select
              placeholder="Filter by department"
              style={{ width: '100%' }}
              value={deptFilter}
              onChange={setDeptFilter}
              allowClear
              showSearch
              optionFilterProp="label"
              options={(depts || []).map((d: any) => ({ value: d.id, label: d.name }))}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<ShoppingCartOutlined />}
              disabled={!canBulkBill}
              onClick={openBulkBillModal}
            >
              Bulk Bill ({selectedRowKeys.length})
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          rowSelection={
            statusFilter !== 'BILLED' && statusFilter !== 'CANCELLED'
              ? {
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys as string[]),
                  getCheckboxProps: (record: any) => ({
                    disabled: record.status === 'BILLED' || record.status === 'CANCELLED',
                  }),
                }
              : undefined
          }
          pagination={{ pageSize: 20, showTotal: (t) => `${t} orders` }}
        />
      </Card>

      {/* Bulk Bill Confirmation Modal */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#52c41a' }} />
            Confirm Bulk Billing
          </Space>
        }
        open={bulkBillModal}
        onCancel={() => { setBulkBillModal(false); setBillTargetInfo(null); }}
        onOk={handleBulkBill}
        confirmLoading={bulkBill.isPending}
        okText="Post to Bill"
        okButtonProps={{ type: 'primary' }}
      >
        {billTargetInfo && (
          <>
            <Descriptions size="small" style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Patient" span={3}>
                <Text strong>{billTargetInfo.patientName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Services" span={3}>
                {billTargetInfo.ids.length} item(s)
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount" span={3}>
                <Text strong style={{ color: '#cf1322', fontSize: 16 }}>{formatPeso(selectedTotal)}</Text>
              </Descriptions.Item>
            </Descriptions>
            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              message="These services will be posted to the patient's active (Draft/Partial) bill. If no active bill exists, the request will fail — create a bill first."
              style={{ fontSize: 12 }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {selectedItems.map((s) => (
                <Row key={s.id} justify="space-between" style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Col flex="auto">
                    <Text style={{ fontSize: 12 }}>{s.description}</Text>
                    {s.departmentName && <Tag style={{ fontSize: 10, marginLeft: 6 }}>{s.departmentName}</Tag>}
                  </Col>
                  <Col>
                    <Text strong style={{ fontSize: 12 }}>
                      {s.quantity > 1 ? `${s.quantity} × ` : ''}{formatPeso(s.unitPrice)}
                    </Text>
                  </Col>
                </Row>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default OrderedServicesBillingPage;
