import React, { useState } from 'react';
import {
  Modal, Form, Select, Input, InputNumber, Button, Space, Table, Tag,
  Typography, Popconfirm, Empty, Spin, Divider, Alert,
} from 'antd';
import { PlusOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange', IN_PROGRESS: 'blue', COMPLETED: 'green', BILLED: 'purple', CANCELLED: 'red',
};

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  admissionId?: string;
  consultationId?: string;
  patientName: string;
  allowBilling?: boolean; // billing staff only
}

const OrderServicesModal: React.FC<Props> = ({
  open, onClose, patientId, admissionId, consultationId, patientName, allowBilling,
}) => {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [showForm, setShowForm] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);

  const qKey = ['ordered-services', patientId, admissionId, consultationId];

  const { data: ordered, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () =>
      api.get('/ordered-services', {
        params: { patientId, ...(admissionId && { admissionId }), ...(consultationId && { consultationId }) },
      }).then((r) => r.data?.data || []),
    enabled: open && !!patientId,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services-list'],
    queryFn: () => api.get('/services', { params: { limit: 500 } }).then((r) => r.data?.data?.data || r.data?.data || []),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/ordered-services', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); form.resetFields(); setShowForm(false); setSelectedService(null); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ordered-services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.put(`/ordered-services/${id}/status`, { status: 'COMPLETED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  });

  const billMutation = useMutation({
    mutationFn: (id: string) => api.post(`/ordered-services/${id}/bill`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  });

  const handleServiceSelect = (serviceId: string) => {
    const svc = servicesData?.find((s: any) => s.id === serviceId);
    if (svc) {
      setSelectedService(svc);
      form.setFieldsValue({ description: svc.serviceName, unitPrice: Number(svc.basePrice) });
    }
  };

  const handleOrder = (values: any) => {
    createMutation.mutate({
      patientId,
      admissionId: admissionId || null,
      consultationId: consultationId || null,
      serviceId: values.serviceId || null,
      description: values.description,
      quantity: values.quantity || 1,
      unitPrice: values.unitPrice || 0,
      notes: values.notes,
    });
  };

  const orderedList: any[] = ordered || [];
  const pendingCount = orderedList.filter((o) => o.status === 'PENDING' || o.status === 'IN_PROGRESS').length;

  const columns = [
    {
      title: 'Service / Description',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.description}</Text>
          {r.departmentName && <Text type="secondary" style={{ fontSize: 11 }}>from {r.departmentName}</Text>}
        </Space>
      ),
    },
    { title: 'Qty', dataIndex: 'quantity', width: 55 },
    {
      title: 'Price',
      dataIndex: 'unitPrice',
      width: 90,
      render: (v: number) => `₱${Number(v).toLocaleString()}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s: string) => <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
    },
    {
      title: 'Ordered',
      dataIndex: 'orderedAt',
      width: 110,
      render: (v: string) => dayjs(v).format('MMM D, h:mm A'),
    },
    {
      title: '',
      width: 130,
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'PENDING' && (
            <Button size="small" icon={<CheckOutlined />} onClick={() => completeMutation.mutate(r.id)}>
              Done
            </Button>
          )}
          {allowBilling && (r.status === 'COMPLETED' || r.status === 'PENDING') && (
            <Popconfirm title="Bill this service?" onConfirm={() => billMutation.mutate(r.id)}>
              <Button size="small" type="primary">Bill</Button>
            </Popconfirm>
          )}
          {r.status !== 'BILLED' && r.status !== 'CANCELLED' && (
            <Popconfirm title="Cancel this order?" onConfirm={() => cancelMutation.mutate(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <span>Service Orders</span>
          <Text type="secondary" style={{ fontSize: 13 }}>— {patientName}</Text>
          {pendingCount > 0 && <Tag color="orange">{pendingCount} pending</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
    >
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(!showForm)}>
          Order Service
        </Button>
      </Space>

      {showForm && (
        <Form form={form} layout="vertical" onFinish={handleOrder} style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <Form.Item name="serviceId" label="Service (from catalog)">
            <Select
              showSearch
              placeholder="Search service..."
              optionFilterProp="label"
              onChange={handleServiceSelect}
              allowClear
              options={(servicesData || []).map((s: any) => ({
                value: s.id,
                label: `${s.serviceName} — ₱${Number(s.basePrice).toLocaleString()}`,
              }))}
            />
          </Form.Item>
          <Row>
            <Col span={14}>
              <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                <Input placeholder="Service description" />
              </Form.Item>
            </Col>
            <Col span={4} offset={1}>
              <Form.Item name="quantity" label="Qty" initialValue={1}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4} offset={1}>
              <Form.Item name="unitPrice" label="Price" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} prefix="₱" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes">
            <Input placeholder="Additional notes..." />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>Submit Order</Button>
            <Button onClick={() => { setShowForm(false); form.resetFields(); setSelectedService(null); }}>Cancel</Button>
          </Space>
        </Form>
      )}

      {isLoading ? (
        <Spin style={{ display: 'block', textAlign: 'center', padding: 40 }} />
      ) : orderedList.length === 0 ? (
        <Empty description="No service orders" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table dataSource={orderedList} columns={columns} rowKey="id" size="small" pagination={false} />
      )}
    </Modal>
  );
};

// Need to import Row + Col inside this file
import { Row, Col } from 'antd';

export default OrderServicesModal;
