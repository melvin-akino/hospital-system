import React, { useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, Statistic, Row, Col,
  Input, Modal, Form, Select,
} from 'antd';
import { RadarChartOutlined, CheckOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const RadiologyQueuePage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [reportModal, setReportModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['radiology-orders'],
    queryFn: () =>
      api.get('/radiology-orders', { params: { limit: 100 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 30000,
  });

  const reportMutation = useMutation({
    mutationFn: ({ orderId, ...data }: any) =>
      api.post(`/radiology-reports`, { orderId, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['radiology-orders'] });
      setReportModal(false);
      form.resetFields();
    },
  });

  const filtered = (orders || []).filter((o: any) => {
    if (!search) return true;
    const name = `${o.patient?.firstName || ''} ${o.patient?.lastName || ''}`.toLowerCase();
    return name.includes(search.toLowerCase()) || o.orderNo?.includes(search);
  });

  const pending = filtered.filter((o: any) => o.status === 'PENDING' || o.status === 'IN_PROGRESS');

  const columns = [
    { title: 'Order #', dataIndex: 'orderNo', render: (v: string) => <Text code>{v}</Text>, width: 120 },
    {
      title: 'Patient',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.patient?.firstName} {r.patient?.lastName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    { title: 'Modality', dataIndex: 'modality', render: (v: string) => <Tag color="blue">{v}</Tag>, width: 100 },
    { title: 'Body Part', dataIndex: 'bodyPart', render: (v: string) => v || '—', width: 120 },
    { title: 'Clinical Hx', dataIndex: 'clinicalHistory', render: (v: string) => v || '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => (
        <Tag color={v === 'COMPLETED' ? 'green' : v === 'IN_PROGRESS' ? 'blue' : 'orange'}>{v}</Tag>
      ),
      width: 120,
    },
    {
      title: 'Ordered',
      dataIndex: 'orderedAt',
      render: (v: string) => dayjs(v).format('MMM D, h:mm A'),
      width: 130,
    },
    {
      title: 'Actions',
      render: (_: any, r: any) =>
        r.status !== 'COMPLETED' && (
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => { setSelectedOrder(r); setReportModal(true); }}
          >
            Report
          </Button>
        ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <RadarChartOutlined style={{ fontSize: 24, color: '#2f54eb' }} />
            <Title level={3} style={{ margin: 0 }}>Radiology / Imaging Queue</Title>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}><Card><Statistic title="Pending" value={pending.length} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        <Col xs={12} sm={8}><Card><Statistic title="Total Today" value={filtered.length} /></Card></Col>
        <Col xs={12} sm={8}><Card><Statistic title="Reported" value={filtered.filter((o: any) => o.status === 'COMPLETED').length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>

      <Card
        title="Imaging Orders"
        extra={
          <Input prefix={<SearchOutlined />} placeholder="Search..." size="small" style={{ width: 200 }} value={search} onChange={(e) => setSearch(e.target.value)} />
        }
      >
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 15 }} />
      </Card>

      <Modal
        title={`Radiology Report — ${selectedOrder?.orderNo}`}
        open={reportModal}
        onCancel={() => { setReportModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={reportMutation.isPending}
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => reportMutation.mutate({ orderId: selectedOrder?.id, ...v, reportedAt: new Date() })}
        >
          <Form.Item name="findings" label="Findings" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Radiological findings..." />
          </Form.Item>
          <Form.Item name="impression" label="Impression" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Radiological impression..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RadiologyQueuePage;
