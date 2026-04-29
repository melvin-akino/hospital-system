import React, { useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, Statistic, Row, Col,
  Input, Modal, Form, Select, InputNumber,
} from 'antd';
import { ToolOutlined, CheckOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import PatientSearchModal from '../../components/patients/PatientSearchModal';

const { Title, Text } = Typography;

const CSRQueuePage: React.FC = () => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [orderModal, setOrderModal] = useState(false);
  const [patientSearch, setPatientSearch] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [form] = Form.useForm();

  // Ordered services coming TO CSR
  const { data: incoming, isLoading } = useQuery({
    queryKey: ['csr-orders', user?.departmentId],
    queryFn: () =>
      api.get('/ordered-services', {
        params: { departmentId: user?.departmentId, status: 'PENDING', limit: 100 },
      }).then((r) => r.data?.data || []),
    refetchInterval: 30000,
    enabled: !!user?.departmentId,
  });

  const { data: services } = useQuery({
    queryKey: ['csr-services'],
    queryFn: () =>
      api.get('/services', { params: { limit: 500 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.put(`/ordered-services/${id}/status`, { status: 'COMPLETED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['csr-orders'] }),
  });

  const chargeMutation = useMutation({
    mutationFn: (data: any) => api.post('/ordered-services', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['csr-orders'] }); setOrderModal(false); form.resetFields(); setSelectedPatient(null); },
  });

  const filtered = (incoming || []).filter((o: any) => {
    if (!search) return true;
    const name = `${o.patient?.firstName || ''} ${o.patient?.lastName || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const columns = [
    {
      title: 'Patient',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.patient?.firstName} {r.patient?.lastName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    { title: 'Item / Supply', dataIndex: 'description' },
    { title: 'Qty', dataIndex: 'quantity', width: 60 },
    { title: 'Price', dataIndex: 'unitPrice', render: (v: number) => `₱${Number(v).toLocaleString()}`, width: 100 },
    { title: 'Requested by', dataIndex: 'orderedByName', render: (v: string) => v || '—' },
    {
      title: 'Time',
      dataIndex: 'orderedAt',
      render: (v: string) => dayjs(v).format('h:mm A'),
      width: 80,
    },
    {
      title: '',
      render: (_: any, r: any) => (
        <Button
          size="small"
          type="primary"
          icon={<CheckOutlined />}
          onClick={() => completeMutation.mutate(r.id)}
        >
          Issue
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <ToolOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
            <Title level={3} style={{ margin: 0 }}>Central Supply Room (CSR)</Title>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOrderModal(true)}>
            Charge Supply
          </Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}><Card><Statistic title="Pending Requests" value={filtered.length} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        <Col xs={12} sm={8}><Card><Statistic title="Issued Today" value={0} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>

      <Card
        title="Supply Requests"
        extra={
          <Input prefix={<SearchOutlined />} placeholder="Search patient..." size="small" style={{ width: 200 }} value={search} onChange={(e) => setSearch(e.target.value)} />
        }
      >
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 15 }} />
      </Card>

      {/* Manual charge modal */}
      <Modal
        title="Charge Supply to Patient"
        open={orderModal}
        onCancel={() => { setOrderModal(false); form.resetFields(); setSelectedPatient(null); }}
        onOk={() => form.submit()}
        confirmLoading={chargeMutation.isPending}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) =>
            chargeMutation.mutate({
              patientId: selectedPatient?.id,
              serviceId: v.serviceId || null,
              description: v.description,
              quantity: v.quantity || 1,
              unitPrice: v.unitPrice || 0,
              departmentId: user?.departmentId,
              status: 'COMPLETED',
            })
          }
        >
          <Form.Item label="Patient" required>
            {selectedPatient ? (
              <Space>
                <Tag color="green">{selectedPatient.firstName} {selectedPatient.lastName} — {selectedPatient.patientNo}</Tag>
                <Button size="small" onClick={() => setSelectedPatient(null)}>Change</Button>
              </Space>
            ) : (
              <Button onClick={() => setPatientSearch(true)}>Search Patient</Button>
            )}
          </Form.Item>
          <Form.Item name="serviceId" label="Supply / Service (catalog)">
            <Select
              showSearch optionFilterProp="label" allowClear placeholder="Search catalog..."
              onChange={(id) => {
                const s = (services || []).find((s: any) => s.id === id);
                if (s) form.setFieldsValue({ description: s.serviceName, unitPrice: Number(s.basePrice) });
              }}
              options={(services || []).map((s: any) => ({
                value: s.id, label: `${s.serviceName} — ₱${Number(s.basePrice).toLocaleString()}`,
              }))}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}><Form.Item name="description" label="Description" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={4}><Form.Item name="quantity" label="Qty" initialValue={1}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="unitPrice" label="Price" rules={[{ required: true }]}><InputNumber min={0} prefix="₱" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <PatientSearchModal open={patientSearch} onClose={() => setPatientSearch(false)} onSelect={(p) => { setSelectedPatient(p); setPatientSearch(false); }} />
    </div>
  );
};

export default CSRQueuePage;
