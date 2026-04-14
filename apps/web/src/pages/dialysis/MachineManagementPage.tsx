import React, { useState } from 'react';
import {
  Table, Button, Typography, Row, Col, Card, Tag, Modal, Form, Input, Space, Popconfirm,
} from 'antd';
import { PlusOutlined, ToolOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useDialysisMachines, useCreateMachine, useUpdateMachine } from '../../hooks/useDialysis';
import type { DialysisMachine } from '../../services/dialysisService';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  AVAILABLE: 'green',
  IN_USE: 'orange',
  MAINTENANCE: 'red',
};

const MachineManagementPage: React.FC = () => {
  const [addModal, setAddModal] = useState(false);
  const [addForm] = Form.useForm();

  const { data, isLoading } = useDialysisMachines();
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();

  const machines: DialysisMachine[] = data?.data || [];

  const handleAdd = async (values: { machineCode: string; model?: string }) => {
    await createMachine.mutateAsync(values);
    setAddModal(false);
    addForm.resetFields();
  };

  const setStatus = async (id: string, status: string) => {
    await updateMachine.mutateAsync({ id, data: { status } });
  };

  const columns = [
    {
      title: 'Machine Code',
      dataIndex: 'machineCode',
      render: (v: string) => <Text strong style={{ color: '#1890ff' }}>{v}</Text>,
    },
    {
      title: 'Model',
      dataIndex: 'model',
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => (
        <Tag color={statusColors[v] || 'default'}>{v.replace('_', ' ')}</Tag>
      ),
    },
    {
      title: 'Total Sessions',
      key: 'sessions',
      render: (_: unknown, row: DialysisMachine) => row._count?.sessions || 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, row: DialysisMachine) => (
        <Space>
          {row.status !== 'AVAILABLE' && row.status !== 'IN_USE' && (
            <Popconfirm
              title="Set machine as Available?"
              onConfirm={() => setStatus(row.id, 'AVAILABLE')}
              okText="Yes"
            >
              <Button
                size="small"
                type="primary"
                ghost
                icon={<CheckCircleOutlined />}
                loading={updateMachine.isPending}
              >
                Set Available
              </Button>
            </Popconfirm>
          )}
          {row.status === 'AVAILABLE' && (
            <Popconfirm
              title="Set machine under maintenance?"
              onConfirm={() => setStatus(row.id, 'MAINTENANCE')}
              okText="Yes"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<ToolOutlined />}
                loading={updateMachine.isPending}
              >
                Set Maintenance
              </Button>
            </Popconfirm>
          )}
          {row.status === 'IN_USE' && (
            <Tag color="orange">In Use — Cannot change status</Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Dialysis Machine Management
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModal(true)}>
            Add Machine
          </Button>
        </Col>
      </Row>

      {/* Status Summary */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {(['AVAILABLE', 'IN_USE', 'MAINTENANCE'] as const).map(status => {
          const count = machines.filter(m => m.status === status).length;
          return (
            <Col key={status} xs={8}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: status === 'AVAILABLE' ? '#52c41a' : status === 'IN_USE' ? '#faad14' : '#ff4d4f' }}>
                  {count}
                </div>
                <div style={{ color: '#999', fontSize: 12 }}>{status.replace('_', ' ')}</div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Table
        dataSource={machines}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
      />

      {/* Add Machine Modal */}
      <Modal
        title="Add Dialysis Machine"
        open={addModal}
        onCancel={() => { setAddModal(false); addForm.resetFields(); }}
        onOk={() => addForm.submit()}
        okText="Add Machine"
        confirmLoading={createMachine.isPending}
      >
        <Form form={addForm} layout="vertical" onFinish={handleAdd}>
          <Form.Item
            label="Machine Code"
            name="machineCode"
            rules={[{ required: true, message: 'Required' }]}
            tooltip="Unique identifier for this machine"
          >
            <Input placeholder="e.g., DM-001, HD-A1..." />
          </Form.Item>
          <Form.Item label="Model / Brand" name="model">
            <Input placeholder="e.g., Fresenius 5008S, Nipro SURDIAL..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MachineManagementPage;
