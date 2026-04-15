import React, { useState } from 'react';
import {
  Card, Table, Button, Space, Tag, Typography, Input, Select, Modal, Form,
  Popconfirm, Tooltip, Badge, Row, Col, Divider,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, LockOutlined, MailOutlined, CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUsers, useCreateUser, useUpdateUser, useToggleUserStatus, useDeleteUser } from '../../hooks/useUsers';
import { useAuthStore } from '../../store/authStore';
import type { SystemUser } from '../../services/userService';

const { Title } = Typography;
const { Option } = Select;

const ROLES = [
  'SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST',
  'BILLING', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGY_TECH',
];

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'red', ADMIN: 'volcano', DOCTOR: 'blue', NURSE: 'cyan',
  RECEPTIONIST: 'green', BILLING: 'gold', PHARMACIST: 'purple',
  LAB_TECH: 'geekblue', RADIOLOGY_TECH: 'magenta',
};

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useUsers({ page, limit: 20, search: search || undefined, role: roleFilter });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const toggleStatus = useToggleUserStatus();
  const deleteUser = useDeleteUser();

  const users: SystemUser[] = data?.data?.data ?? [];
  const total: number = data?.data?.total ?? 0;

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (u: SystemUser) => {
    setEditing(u);
    form.setFieldsValue({ username: u.username, email: u.email, role: u.role });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateUser.mutateAsync({ id: editing.id, data: values });
    } else {
      await createUser.mutateAsync(values);
    }
    setModalOpen(false);
  };

  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      render: (v: string, r: SystemUser) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{v}</span>
          {r.id === currentUser?.id && <Tag color="blue" style={{ fontSize: 10 }}>You</Tag>}
        </Space>
      ),
    },
    { title: 'Email', dataIndex: 'email', render: (v: string) => <Space><MailOutlined />{v}</Space> },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (v: string) => <Tag color={roleColors[v] || 'default'}>{v.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (v: boolean) => v
        ? <Badge status="success" text="Active" />
        : <Badge status="error" text="Inactive" />,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: 'Actions',
      render: (_: unknown, r: SystemUser) => (
        <Space>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title={r.isActive ? 'Deactivate' : 'Activate'}>
            <Button
              size="small"
              icon={r.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
              danger={r.isActive}
              onClick={() => toggleStatus.mutate(r.id)}
              disabled={r.id === currentUser?.id}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete this user?"
              description="This action cannot be undone."
              onConfirm={() => deleteUser.mutate(r.id)}
              disabled={r.id === currentUser?.id}
            >
              <Button
                size="small"
                icon={<DeleteOutlined />}
                danger
                disabled={r.id === currentUser?.id}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={3} style={{ margin: 0 }}><UserOutlined /> User Management</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Create User
          </Button>
        </Col>
      </Row>

      <Card>
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col span={10}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by username or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="Filter by role"
              allowClear
              style={{ width: '100%' }}
              value={roleFilter}
              onChange={(v) => { setRoleFilter(v); setPage(1); }}
            >
              {ROLES.map((r) => (
                <Option key={r} value={r}><Tag color={roleColors[r]}>{r.replace('_', ' ')}</Tag></Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (t) => `${t} users` }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit User' : 'Create New User'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={createUser.isPending || updateUser.isPending}
        okText={editing ? 'Save Changes' : 'Create User'}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Required' }]}>
                <Input prefix={<UserOutlined />} placeholder="e.g. jdelacruz" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Required' }]}>
                <Select placeholder="Select role">
                  {ROLES.map((r) => (
                    <Option key={r} value={r}><Tag color={roleColors[r]}>{r.replace('_', ' ')}</Tag></Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
            <Input prefix={<MailOutlined />} placeholder="user@hospital.ph" />
          </Form.Item>
          <Divider dashed style={{ margin: '8px 0' }} />
          <Form.Item
            label={editing ? 'New Password (leave blank to keep current)' : 'Password'}
            name="password"
            rules={editing ? [] : [{ required: true, min: 6, message: 'Minimum 6 characters' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={editing ? 'Leave blank to keep current' : 'Min. 6 characters'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
