import React, { useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, Select,
  DatePicker, Popconfirm, Typography, Row, Col, Alert, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';

const { Text } = Typography;

const PROBLEM_STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'red',
  CHRONIC: 'orange',
  RESOLVED: 'green',
  INACTIVE: 'default',
};

const SEVERITY_COLOR: Record<string, string> = {
  MILD: 'green',
  MODERATE: 'orange',
  SEVERE: 'red',
  CRITICAL: 'volcano',
};

interface Props {
  patientId: string;
}

const ActiveProblemListPanel: React.FC<Props> = ({ patientId }) => {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['patient-problems', patientId],
    queryFn: () =>
      api.get(`/patients/${patientId}/problems`).then((r) => r.data?.data || []),
    enabled: !!patientId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/patients/${patientId}/problems`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-problems', patientId] });
      setModal(false);
      setEditItem(null);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/patients/${patientId}/problems/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-problems', patientId] });
      setModal(false);
      setEditItem(null);
      form.resetFields();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/patients/${patientId}/problems/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-problems', patientId] }),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/patients/${patientId}/problems/${id}`, { status: 'RESOLVED', resolvedDate: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-problems', patientId] }),
  });

  const problems: any[] = data || [];
  const activeProblems = problems.filter((p) => p.status === 'ACTIVE' || p.status === 'CHRONIC');
  const resolvedProblems = problems.filter((p) => p.status === 'RESOLVED' || p.status === 'INACTIVE');

  const openEdit = (item: any) => {
    setEditItem(item);
    form.setFieldsValue({
      ...item,
      onsetDate: item.onsetDate ? dayjs(item.onsetDate) : undefined,
      resolvedDate: item.resolvedDate ? dayjs(item.resolvedDate) : undefined,
    });
    setModal(true);
  };

  const handleSubmit = (values: any) => {
    const data = {
      ...values,
      onsetDate: values.onsetDate?.toISOString(),
      resolvedDate: values.resolvedDate?.toISOString(),
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      title: 'Problem / Condition',
      dataIndex: 'problem',
      render: (v: string, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          {r.icdCode && <Text type="secondary" style={{ fontSize: 11 }}>ICD: {r.icdCode}</Text>}
          {r.notes && <Text type="secondary" style={{ fontSize: 11 }}>{r.notes}</Text>}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={PROBLEM_STATUS_COLOR[v] || 'default'}>{v}</Tag>,
      width: 90,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      render: (v: string) => v ? <Tag color={SEVERITY_COLOR[v] || 'default'}>{v}</Tag> : '—',
      width: 90,
    },
    {
      title: 'Onset',
      dataIndex: 'onsetDate',
      render: (v: string) => v ? dayjs(v).format('MMM D, YYYY') : '—',
      width: 110,
    },
    {
      title: 'Treating Physician',
      dataIndex: 'treatingPhysician',
      render: (v: string) => v || '—',
    },
    {
      title: '',
      render: (_: any, r: any) => (
        <Space size={4}>
          {(r.status === 'ACTIVE' || r.status === 'CHRONIC') && (
            <Tooltip title="Mark Resolved">
              <Popconfirm title="Mark this problem as resolved?" onConfirm={() => resolveMutation.mutate(r.id)}>
                <Button size="small" icon={<CheckOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }} />
              </Popconfirm>
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Remove">
            <Popconfirm title="Remove this problem?" onConfirm={() => deleteMutation.mutate(r.id)}>
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
      width: 100,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space align="center">
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            <Text strong>Active Problem List</Text>
            {activeProblems.length > 0 && (
              <Tag color="red">{activeProblems.length} active</Tag>
            )}
          </Space>
        </Col>
        <Col>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => { setEditItem(null); form.resetFields(); setModal(true); }}
          >
            Add Problem
          </Button>
        </Col>
      </Row>

      {/* Active Problems */}
      {activeProblems.length > 0 ? (
        <Table
          dataSource={activeProblems}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={false}
          style={{ marginBottom: 16 }}
          rowClassName={(r: any) => r.severity === 'CRITICAL' ? 'ant-table-row-stat' : ''}
        />
      ) : (
        <Alert
          type="success"
          showIcon
          icon={<CheckOutlined />}
          message="No active problems on record"
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Resolved Problems (collapsible) */}
      {resolvedProblems.length > 0 && (
        <Card
          size="small"
          title={<Text type="secondary" style={{ fontSize: 12 }}>Past / Resolved Problems ({resolvedProblems.length})</Text>}
          collapsible
          defaultCollapsed
        >
          <Table
            dataSource={resolvedProblems}
            columns={[
              { title: 'Problem', dataIndex: 'problem', render: (v: string, r: any) => (
                <Space direction="vertical" size={0}>
                  <Text style={{ color: '#8c8c8c' }}>{v}</Text>
                  {r.icdCode && <Text type="secondary" style={{ fontSize: 10 }}>ICD: {r.icdCode}</Text>}
                </Space>
              )},
              { title: 'Onset', dataIndex: 'onsetDate', render: (v: string) => v ? dayjs(v).format('MMM D, YYYY') : '—', width: 100 },
              { title: 'Resolved', dataIndex: 'resolvedDate', render: (v: string) => v ? dayjs(v).format('MMM D, YYYY') : 'Date unknown', width: 110 },
              { title: '', render: (_: any, r: any) => (
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
              ), width: 50 },
            ]}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={editItem ? 'Edit Problem' : 'Add Problem / Condition'}
        open={modal}
        onCancel={() => { setModal(false); setEditItem(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="problem" label="Problem / Diagnosis" rules={[{ required: true }]}>
                <Input placeholder="e.g. Type 2 Diabetes Mellitus, Hypertension..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="icdCode" label="ICD-10 Code">
                <Input placeholder="E11.9" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="ACTIVE">
                <Select options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'CHRONIC', label: 'Chronic / Ongoing' },
                  { value: 'RESOLVED', label: 'Resolved' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="severity" label="Severity">
                <Select allowClear options={[
                  { value: 'MILD', label: 'Mild' },
                  { value: 'MODERATE', label: 'Moderate' },
                  { value: 'SEVERE', label: 'Severe' },
                  { value: 'CRITICAL', label: 'Critical' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="onsetDate" label="Onset Date">
                <DatePicker style={{ width: '100%' }} format="MMMM D, YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="resolvedDate" label="Resolved Date">
                <DatePicker style={{ width: '100%' }} format="MMMM D, YYYY" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="treatingPhysician" label="Treating Physician">
                <Input placeholder="Name of managing physician..." />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notes / Comments">
                <Input.TextArea rows={2} placeholder="Additional details, management plan..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default ActiveProblemListPanel;
