import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, Typography, Input, Select, Modal, Form,
  Popconfirm, Tooltip, Badge, Row, Col, Divider, Drawer, Switch, Checkbox,
  Descriptions,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, LockOutlined, MailOutlined, CheckCircleOutlined, StopOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useUsers, useCreateUser, useUpdateUser, useToggleUserStatus, useDeleteUser } from '../../hooks/useUsers';
import { useUserPermissions, useSetUserPermissions, ALL_MODULES, type PermissionEntry } from '../../hooks/useUserPermissions';
import { useAuthStore } from '../../store/authStore';
import type { SystemUser } from '../../services/userService';
import api from '../../lib/api';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLES = [
  'SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR', 'DOCTOR', 'NURSE', 'RECEPTIONIST',
  'BILLING', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGY_TECH',
];

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'red', ADMIN: 'volcano', BILLING_SUPERVISOR: 'orange',
  DOCTOR: 'blue', NURSE: 'cyan',
  RECEPTIONIST: 'green', BILLING: 'gold', PHARMACIST: 'purple',
  LAB_TECH: 'geekblue', RADIOLOGY_TECH: 'magenta',
};

const FLAG_LABELS = ['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const;
type FlagKey = typeof FLAG_LABELS[number];

// Blank permission for a module
const blankPerm = (module: string): PermissionEntry => ({
  module, canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false,
});

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [form] = Form.useForm();

  // Permission drawer
  const [permTarget, setPermTarget] = useState<SystemUser | null>(null);
  const [permDraft, setPermDraft] = useState<PermissionEntry[]>([]);

  const { data, isLoading } = useUsers({ page, limit: 20, search: search || undefined, role: roleFilter });
  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => api.get('/departments', { params: { limit: 100 } }).then((r) => r.data?.data?.data || r.data?.data || []),
  });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const toggleStatus = useToggleUserStatus();
  const deleteUser = useDeleteUser();

  const { data: existingPerms } = useUserPermissions(permTarget?.id);
  const setPerms = useSetUserPermissions();

  // When permission drawer opens, merge existing perms with all modules
  useEffect(() => {
    if (permTarget && existingPerms !== undefined) {
      const draft = ALL_MODULES.map((m) => {
        const found = existingPerms.find((p) => p.module === m.key);
        return found ? { ...found } : blankPerm(m.key);
      });
      setPermDraft(draft);
    }
  }, [permTarget, existingPerms]);

  const users: SystemUser[] = data?.data?.data ?? [];
  const total: number = data?.data?.total ?? 0;

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (u: SystemUser) => {
    setEditing(u);
    form.setFieldsValue({ username: u.username, email: u.email, role: u.role, displayName: (u as any).displayName, departmentId: (u as any).departmentId });
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

  // Toggle one flag on one module in the draft
  const toggleFlag = (module: string, flag: FlagKey, value: boolean) => {
    setPermDraft((prev) =>
      prev.map((p) => (p.module === module ? { ...p, [flag]: value } : p))
    );
  };

  // Toggle all flags for a module row
  const toggleAllForModule = (module: string, checked: boolean) => {
    setPermDraft((prev) =>
      prev.map((p) =>
        p.module === module
          ? { module, canView: checked, canCreate: checked, canEdit: checked, canDelete: checked, canApprove: checked }
          : p
      )
    );
  };

  const savePerm = async () => {
    if (!permTarget) return;
    // Only save modules where at least one flag is true
    const toSave = permDraft.filter(
      (p) => p.canView || p.canCreate || p.canEdit || p.canDelete || p.canApprove
    );
    await setPerms.mutateAsync({ userId: permTarget.id, permissions: toSave });
    setPermTarget(null);
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
      render: (v: string) => <Tag color={roleColors[v] || 'default'}>{v.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Department',
      render: (_: any, r: any) => r.department
        ? <Tag color="geekblue">{r.department.name}</Tag>
        : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
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
          <Tooltip title="Edit user">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Assign module permissions">
            <Button size="small" icon={<KeyOutlined />} onClick={() => setPermTarget(r)} />
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

  // Permission drawer columns
  const permColumns = [
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 180,
      render: (v: string) => {
        const m = ALL_MODULES.find((x) => x.key === v);
        return <Text strong>{m?.label ?? v}</Text>;
      },
    },
    {
      title: 'All',
      key: 'all',
      width: 60,
      render: (_: any, r: PermissionEntry) => {
        const allChecked = FLAG_LABELS.every((f) => r[f]);
        const someChecked = FLAG_LABELS.some((f) => r[f]);
        return (
          <Checkbox
            checked={allChecked}
            indeterminate={someChecked && !allChecked}
            onChange={(e) => toggleAllForModule(r.module, e.target.checked)}
          />
        );
      },
    },
    ...FLAG_LABELS.map((flag) => ({
      title: flag.replace('can', ''),
      key: flag,
      width: 72,
      render: (_: any, r: PermissionEntry) => (
        <Switch
          size="small"
          checked={r[flag]}
          onChange={(v) => toggleFlag(r.module, flag, v)}
        />
      ),
    })),
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
                <Option key={r} value={r}><Tag color={roleColors[r]}>{r.replace(/_/g, ' ')}</Tag></Option>
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

      {/* Create / Edit User Modal */}
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
                    <Option key={r} value={r}><Tag color={roleColors[r]}>{r.replace(/_/g, ' ')}</Tag></Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
            <Input prefix={<MailOutlined />} placeholder="user@hospital.ph" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Display Name" name="displayName">
                <Input placeholder="e.g. Juan dela Cruz" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Department" name="departmentId">
                <Select allowClear placeholder="Assign department..." showSearch optionFilterProp="label"
                  options={(departments || []).map((d: any) => ({ value: d.id, label: `${d.name}${d.code ? ' (' + d.code + ')' : ''}` }))} />
              </Form.Item>
            </Col>
          </Row>
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

      {/* Permissions Drawer */}
      <Drawer
        title={
          <Space>
            <KeyOutlined />
            Module Permissions
            {permTarget && (
              <Tag color={roleColors[permTarget.role] || 'default'}>
                {permTarget.username} · {permTarget.role.replace(/_/g, ' ')}
              </Tag>
            )}
          </Space>
        }
        open={!!permTarget}
        onClose={() => setPermTarget(null)}
        width={680}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setPermTarget(null)}>Cancel</Button>
            <Button type="primary" onClick={savePerm} loading={setPerms.isPending}>
              Save Permissions
            </Button>
          </div>
        }
      >
        {permTarget && (
          <>
            <Descriptions size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="User">{permTarget.username}</Descriptions.Item>
              <Descriptions.Item label="Role">
                <Tag color={roleColors[permTarget.role]}>{permTarget.role.replace(/_/g, ' ')}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <div
              style={{
                padding: '8px 12px',
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 6,
                marginBottom: 16,
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                Role-based access is always applied first. These permissions grant <strong>additional</strong> access
                on top of what the user's role already provides. Admin and Super Admin always have full access
                regardless of this table.
              </Text>
            </div>

            <Table
              dataSource={permDraft}
              columns={permColumns}
              rowKey="module"
              size="small"
              pagination={false}
              scroll={{ y: 'calc(100vh - 320px)' }}
              rowClassName={(r) =>
                FLAG_LABELS.some((f) => r[f]) ? 'ant-table-row-selected' : ''
              }
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default UserManagementPage;
