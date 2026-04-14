import React, { useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Typography,
  Row,
  Col,
  Card,
  Modal,
  Form,
  Input,
  Select,
  Space,
} from 'antd';
import { PlusOutlined, EditOutlined, BankOutlined } from '@ant-design/icons';
import { useChartOfAccounts, useCreateAccount, useUpdateAccount } from '../../hooks/useAccounting';
import type { Account } from '../../services/accountingService';

const { Title, Text } = Typography;

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const typeColor: Record<string, string> = {
  ASSET: 'blue',
  LIABILITY: 'orange',
  EQUITY: 'purple',
  REVENUE: 'green',
  EXPENSE: 'red',
};

const ChartOfAccountsPage: React.FC = () => {
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useChartOfAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  const accounts = data?.data?.accounts ?? [];
  const grouped = data?.data?.grouped ?? {};

  const openCreate = () => {
    setEditingAccount(null);
    form.resetFields();
    setModalMode('create');
  };

  const openEdit = (acc: Account) => {
    setEditingAccount(acc);
    form.setFieldsValue({
      accountCode: acc.accountCode,
      accountName: acc.accountName,
      accountType: acc.accountType,
      parentId: acc.parentId,
    });
    setModalMode('edit');
  };

  const handleSubmit = async (values: Omit<Account, 'id' | 'isActive'>) => {
    if (modalMode === 'create') {
      await createAccount.mutateAsync(values);
    } else if (editingAccount) {
      await updateAccount.mutateAsync({ id: editingAccount.id, data: values });
    }
    setModalMode(null);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Account Code',
      dataIndex: 'accountCode',
      width: 150,
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: 'Account Name',
      dataIndex: 'accountName',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'accountType',
      width: 130,
      render: (v: string) => <Tag color={typeColor[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'Parent',
      dataIndex: 'parentId',
      width: 160,
      render: (v: string) => {
        if (!v) return <Text type="secondary">—</Text>;
        const parent = accounts.find((a) => a.id === v);
        return parent ? <Text type="secondary">{parent.accountCode} – {parent.accountName}</Text> : <Text type="secondary">{v}</Text>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 100,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, row: Account) => (
        <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(row)} />
      ),
    },
  ];

  // Grouped display
  const groupedData = ACCOUNT_TYPES.map((type) => ({
    key: type,
    accountCode: '',
    accountName: type,
    accountType: type,
    parentId: undefined,
    isActive: true,
    _isGroup: true,
    children: (grouped[type] ?? []).map((a: Account) => ({ ...a, _isGroup: false })),
  }));

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <BankOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Chart of Accounts
          </Title>
          <Text type="secondary">{accounts.length} accounts across {ACCOUNT_TYPES.length} types</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Account
          </Button>
        </Col>
      </Row>

      {/* Summary cards */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {ACCOUNT_TYPES.map((type) => (
          <Col key={type} xs={12} sm={8} md={4} lg={4}>
            <Card size="small">
              <Tag color={typeColor[type]}>{type}</Tag>
              <Text style={{ marginLeft: 8 }}>{(grouped[type] ?? []).length}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Table
        dataSource={groupedData}
        columns={columns}
        rowKey={(r) => (r._isGroup ? `group-${r.accountType}` : r.id)}
        loading={isLoading}
        pagination={false}
        defaultExpandAllRows
        rowClassName={(r) => (r._isGroup ? 'ant-table-row-level-0' : '')}
        onRow={(r) => ({
          style: r._isGroup ? { background: '#fafafa', fontWeight: 600 } : {},
        })}
      />

      <Modal
        title={modalMode === 'create' ? 'Add New Account' : `Edit Account: ${editingAccount?.accountCode}`}
        open={!!modalMode}
        onCancel={() => { setModalMode(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createAccount.isPending || updateAccount.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="accountCode"
            label="Account Code"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="e.g., 1000, 2100, 4000" />
          </Form.Item>
          <Form.Item
            name="accountName"
            label="Account Name"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="e.g., Cash on Hand" />
          </Form.Item>
          <Form.Item
            name="accountType"
            label="Account Type"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Select
              options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
              placeholder="Select type"
            />
          </Form.Item>
          <Form.Item name="parentId" label="Parent Account (Optional)">
            <Select
              allowClear
              showSearch
              placeholder="Select parent account..."
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={accounts.map((a) => ({
                value: a.id,
                label: `${a.accountCode} – ${a.accountName}`,
              }))}
            />
          </Form.Item>
          <Space>
            <Text type="secondary">
              Account types: ASSET (debit balance), LIABILITY/EQUITY/REVENUE (credit balance), EXPENSE (debit balance).
            </Text>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default ChartOfAccountsPage;
