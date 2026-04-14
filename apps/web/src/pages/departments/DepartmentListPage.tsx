import React, { useState } from 'react';
import {
  Table, Button, Typography, Row, Col, Card, Space, Tag, Modal,
  Form, Input, Popconfirm, Badge,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '../../hooks/useDepartments';

const { Title, Text } = Typography;

interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  doctorsCount?: number;
  roomsCount?: number;
  isActive?: boolean;
  status?: string;
}

const DepartmentListPage: React.FC = () => {
  const { data: deptData, isLoading } = useDepartments();
  const { mutateAsync: createDepartment, isPending: isCreating } = useCreateDepartment();
  const { mutateAsync: updateDepartment, isPending: isUpdating } = useUpdateDepartment();
  const { mutate: deleteDepartment } = useDeleteDepartment();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form] = Form.useForm();

  const departments: Department[] = Array.isArray(deptData) ? deptData : (deptData?.data || []);

  const totalDoctors = departments.reduce((sum, d) => sum + (d.doctorsCount || 0), 0);

  const openAdd = () => {
    setEditingDept(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    form.setFieldsValue({
      name: dept.name,
      code: dept.code,
      description: dept.description,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: { name: string; code: string; description?: string }) => {
    if (editingDept) {
      await updateDepartment({ id: editingDept.id, data: values });
    } else {
      await createDepartment(values);
    }
    setModalOpen(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      width: 100,
      render: (v: string) => (
        <Tag style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</Tag>
      ),
      sorter: (a: Department, b: Department) => a.code.localeCompare(b.code),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a: Department, b: Department) => a.name.localeCompare(b.name),
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Doctors',
      dataIndex: 'doctorsCount',
      width: 90,
      render: (v: number) => <Badge count={v || 0} showZero style={{ backgroundColor: '#1677ff' }} />,
    },
    {
      title: 'Rooms',
      dataIndex: 'roomsCount',
      width: 80,
      render: (v: number) => v ?? '—',
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_: unknown, row: Department) => {
        const active = row.isActive !== false && row.status !== 'INACTIVE';
        return <Tag color={active ? 'green' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, row: Department) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEdit(row)}
            title="Edit"
          />
          <Popconfirm
            title={`Deactivate "${row.name}"?`}
            description="This will deactivate the department."
            onConfirm={() => deleteDepartment(row.id)}
            okText="Deactivate"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="Deactivate"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Departments</Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add Department
          </Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card>
            <Text type="secondary">Total Departments</Text>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>{departments.length}</div>
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Text type="secondary">Total Doctors</Text>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>{totalDoctors}</div>
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={departments}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
      />

      <Modal
        open={modalOpen}
        title={editingDept ? 'Edit Department' : 'Add Department'}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={isCreating || isUpdating}
        okText={editingDept ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            label="Department Name"
            name="name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g. Cardiology" />
          </Form.Item>
          <Form.Item
            label="Department Code"
            name="code"
            rules={[{ required: true, message: 'Code is required' }]}
            normalize={(v: string) => v?.toUpperCase()}
          >
            <Input placeholder="e.g. CARD" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Brief description of the department..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentListPage;
