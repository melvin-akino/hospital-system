import React, { useState } from 'react';
import {
  Card, Table, Button, Space, Tag, Select, Input, Typography,
  Modal, Form, InputNumber, Tooltip, Badge, Popconfirm, message, Switch,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useDeptCharges, useCreateDeptCharge, useUpdateDeptCharge, useDeleteDeptCharge } from '../../hooks/useDepartmentCharges';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;
const { Search } = Input;

const APPROVAL_TAG: Record<string, { color: string; icon: React.ReactNode }> = {
  APPROVED: { color: 'green',  icon: <CheckCircleOutlined /> },
  PENDING:  { color: 'orange', icon: <ClockCircleOutlined /> },
  REJECTED: { color: 'red',    icon: <ExclamationCircleOutlined /> },
};

const DepartmentChargesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isSupervisor = user?.role === 'BILLING_SUPERVISOR';
  const isBilling = user?.role === 'BILLING';
  const canWrite = isAdmin || isSupervisor || isBilling;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useDeptCharges({ departmentId: deptFilter, search, page, limit: 20 });
  const { data: deptsData } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => api.get('/departments').then((r) => r.data.data),
  });
  const { data: servicesData } = useQuery({
    queryKey: ['services-all'],
    queryFn: () => api.get('/services?limit=500').then((r) => r.data.data),
  });

  const createCharge = useCreateDeptCharge();
  const updateCharge = useUpdateDeptCharge();
  const deleteCharge = useDeleteDeptCharge();

  const departments = deptsData ?? [];
  const services = servicesData ?? [];
  const charges = data?.data ?? [];
  const total = data?.total ?? 0;

  const openCreate = () => {
    setEditRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditRecord(record);
    form.setFieldsValue({
      departmentId: record.departmentId,
      serviceId: record.serviceId,
      overridePrice: record.overridePrice,
      isActive: record.isActive,
      notes: record.notes,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        await updateCharge.mutateAsync({ id: editRecord.id, ...values });
        if (isBilling) {
          message.success('Edit request submitted for supervisor approval');
        } else {
          message.success('Department charge updated');
        }
      } else {
        await createCharge.mutateAsync(values);
        if (isBilling) {
          message.success('Add request submitted for supervisor approval');
        } else {
          message.success('Department charge created');
        }
      }
      setModalOpen(false);
    } catch {
      // form validation error
    }
  };

  const handleDelete = async (record: any) => {
    await deleteCharge.mutateAsync({ id: record.id });
    if (isBilling) {
      message.success('Remove request submitted for supervisor approval');
    } else {
      message.success('Department charge deactivated');
    }
  };

  const effectivePrice = (record: any) =>
    record.overridePrice != null
      ? record.overridePrice
      : record.service?.basePrice;

  const columns = [
    {
      title: 'Department',
      dataIndex: ['department', 'name'],
      key: 'dept',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.department?.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.department?.code}</Text>
        </Space>
      ),
    },
    {
      title: 'Service',
      key: 'service',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.service?.serviceName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.service?.serviceCode} · {r.service?.category?.name}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Effective Price',
      key: 'price',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1677ff' }}>
            ₱{Number(effectivePrice(r)).toFixed(2)}
          </Text>
          {r.overridePrice != null && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Override (base: ₱{Number(r.service?.basePrice).toFixed(2)})
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, r: any) => (
        <Space>
          <Tag color={r.isActive ? 'green' : 'default'}>
            {r.isActive ? 'Active' : 'Inactive'}
          </Tag>
          <Tag
            color={APPROVAL_TAG[r.approvalStatus]?.color}
            icon={APPROVAL_TAG[r.approvalStatus]?.icon}
          >
            {r.approvalStatus}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (v: string) => v ? <Text type="secondary">{v}</Text> : '—',
    },
    ...(canWrite
      ? [{
          title: 'Actions',
          key: 'actions',
          render: (_: any, r: any) => (
            <Space>
              <Tooltip title="Edit charge">
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
              </Tooltip>
              {(isAdmin || isSupervisor) && (
                <Popconfirm
                  title="Deactivate this department charge?"
                  onConfirm={() => handleDelete(r)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
              {isBilling && (
                <Popconfirm
                  title="Submit a removal request for this charge?"
                  onConfirm={() => handleDelete(r)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </Space>
          ),
        }]
      : []),
  ];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Department Charges</Title>
        {canWrite && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {isBilling ? 'Request New Charge' : 'Add Charge'}
          </Button>
        )}
      </div>

      {isBilling && (
        <Card size="small" style={{ marginBottom: 16, background: '#fffbe6', border: '1px solid #ffe58f' }}>
          <Text type="warning">
            <ExclamationCircleOutlined style={{ marginRight: 6 }} />
            As Billing staff, your add/edit/remove actions are submitted as requests and require
            supervisor approval before taking effect.
          </Text>
        </Card>
      )}

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Search
            placeholder="Search service name or code"
            allowClear
            style={{ width: 280 }}
            onSearch={setSearch}
          />
          <Select
            placeholder="Filter by department"
            allowClear
            style={{ width: 220 }}
            onChange={setDeptFilter}
            options={departments.map((d: any) => ({ value: d.id, label: d.name }))}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={charges}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
            showTotal: (t) => `${t} charges`,
          }}
        />
      </Card>

      <Modal
        title={editRecord ? 'Edit Department Charge' : 'Add Department Charge'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createCharge.isPending || updateCharge.isPending}
        okText={
          isBilling
            ? (editRecord ? 'Submit Edit Request' : 'Submit Add Request')
            : (editRecord ? 'Save Changes' : 'Create Charge')
        }
        width={520}
      >
        {isBilling && (
          <div style={{ marginBottom: 12, padding: 8, background: '#fffbe6', borderRadius: 6 }}>
            <Text type="warning" style={{ fontSize: 13 }}>
              This will create a pending request that a supervisor must approve.
            </Text>
          </div>
        )}

        <Form form={form} layout="vertical">
          {!editRecord && (
            <>
              <Form.Item name="departmentId" label="Department" rules={[{ required: true }]}>
                <Select
                  placeholder="Select department"
                  options={departments.map((d: any) => ({ value: d.id, label: d.name }))}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label).toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
              <Form.Item name="serviceId" label="Service" rules={[{ required: true }]}>
                <Select
                  placeholder="Select service from catalog"
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label).toLowerCase().includes(input.toLowerCase())
                  }
                  options={services.map((s: any) => ({
                    value: s.id,
                    label: `${s.serviceName} (₱${Number(s.basePrice).toFixed(2)})`,
                  }))}
                />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="overridePrice"
            label="Department Price Override"
            help="Leave blank to use the service's base price"
          >
            <InputNumber
              prefix="₱"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="Optional — overrides base price for this department"
            />
          </Form.Item>

          {editRecord && (isAdmin || isSupervisor) && (
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}

          <Form.Item name={isBilling ? 'reason' : 'notes'} label={isBilling ? 'Reason for request' : 'Notes'}>
            <Input.TextArea rows={2} placeholder="Optional notes or reason" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentChargesPage;
