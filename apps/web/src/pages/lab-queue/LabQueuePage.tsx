import React, { useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, Statistic, Row, Col,
  Input, Modal, Form, Select, Alert,
} from 'antd';
import { ExperimentOutlined, CheckOutlined, WarningOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const LabQueuePage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [resultModal, setResultModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: requisitions, isLoading } = useQuery({
    queryKey: ['lab-requisitions'],
    queryFn: () =>
      api.get('/lab-requisitions', { params: { limit: 100 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 30000,
  });

  const { data: results } = useQuery({
    queryKey: ['lab-results-today'],
    queryFn: () =>
      api.get('/lab-results', { params: { limit: 50 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
  });

  const resultMutation = useMutation({
    mutationFn: (data: any) => api.post('/lab-results', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-requisitions'] });
      qc.invalidateQueries({ queryKey: ['lab-results-today'] });
      setResultModal(false);
      form.resetFields();
    },
  });

  const filtered = (requisitions || []).filter((r: any) => {
    if (!search) return true;
    const name = `${r.patient?.firstName || ''} ${r.patient?.lastName || ''}`.toLowerCase();
    return name.includes(search.toLowerCase()) || r.requisitionNo?.includes(search);
  });

  const pending = filtered.filter((r: any) => r.status === 'PENDING' || r.status === 'IN_PROGRESS');

  const columns = [
    {
      title: 'Req #',
      dataIndex: 'requisitionNo',
      render: (v: string) => <Text code>{v}</Text>,
      width: 130,
    },
    {
      title: 'Patient',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.patient?.firstName} {r.patient?.lastName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    {
      title: 'Tests',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          {(r.items || []).map((i: any) => (
            <Tag key={i.id} style={{ fontSize: 11 }}>{i.testName}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      render: (v: string) => (
        <Tag color={v === 'STAT' ? 'red' : v === 'URGENT' ? 'orange' : 'default'}>{v}</Tag>
      ),
      width: 90,
    },
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
            onClick={() => { setSelectedReq(r); setResultModal(true); }}
          >
            Enter Result
          </Button>
        ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <ExperimentOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
            <Title level={3} style={{ margin: 0 }}>Laboratory Queue</Title>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card><Statistic title="Pending" value={pending.length} valueStyle={{ color: '#fa8c16' }} /></Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card><Statistic title="STAT Orders" value={pending.filter((r: any) => r.priority === 'STAT').length} valueStyle={{ color: '#cf1322' }} /></Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card><Statistic title="Completed Today" value={(results || []).filter((r: any) => dayjs(r.createdAt).isAfter(dayjs().startOf('day'))).length} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
      </Row>

      <Card
        title="Test Requests"
        extra={
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search patient or req #"
            size="small"
            style={{ width: 220 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {/* Enter Result Modal */}
      <Modal
        title={`Enter Lab Result — ${selectedReq?.requisitionNo}`}
        open={resultModal}
        onCancel={() => { setResultModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={resultMutation.isPending}
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => {
            resultMutation.mutate({
              patientId: selectedReq?.patientId,
              requisitionId: selectedReq?.id,
              testName: v.testName,
              result: v.result,
              unit: v.unit,
              referenceRange: v.referenceRange,
              isAbnormal: v.isAbnormal || false,
              status: 'COMPLETED',
              performedAt: new Date(),
              notes: v.notes,
            });
          }}
        >
          <Form.Item name="testName" label="Test Name" rules={[{ required: true }]}>
            <Select
              options={
                (selectedReq?.items || []).map((i: any) => ({ value: i.testName, label: i.testName }))
              }
              placeholder="Select test"
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="result" label="Result" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="unit" label="Unit">
                <Input placeholder="e.g. g/dL" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="referenceRange" label="Reference Range">
                <Input placeholder="e.g. 12.0–16.0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isAbnormal" label="Flag as abnormal?" valuePropName="checked">
            <Select
              options={[{ value: false, label: 'Normal' }, { value: true, label: '⚠ Abnormal' }]}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LabQueuePage;
