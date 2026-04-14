import React, { useState } from 'react';
import {
  Table, Button, Input, Space, Tag, Typography, Row, Col, Card, Modal, Form, Select,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useBloodDonors, useRegisterDonor } from '../../hooks/useBloodBank';
import type { BloodDonor } from '../../services/bloodbankService';

const { Title, Text } = Typography;

const BLOOD_TYPES = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'];

const formatBloodType = (bt: string) =>
  bt.replace('_POSITIVE', '+').replace('_NEGATIVE', '-').replace('_', ' ');

const bloodTypeColor: Record<string, string> = {
  A_POSITIVE: 'red', A_NEGATIVE: 'volcano',
  B_POSITIVE: 'blue', B_NEGATIVE: 'geekblue',
  AB_POSITIVE: 'purple', AB_NEGATIVE: 'magenta',
  O_POSITIVE: 'green', O_NEGATIVE: 'cyan',
};

const DonorDatabasePage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [bloodTypeFilter, setBloodTypeFilter] = useState<string | undefined>();
  const [registerModal, setRegisterModal] = useState(false);
  const [registerForm] = Form.useForm();

  const { data, isLoading } = useBloodDonors({
    page,
    limit: 20,
    search: search || undefined,
    bloodType: bloodTypeFilter,
  });

  const registerDonor = useRegisterDonor();

  const handleRegister = async (values: {
    firstName: string;
    lastName: string;
    bloodType: string;
    phone?: string;
    email?: string;
  }) => {
    await registerDonor.mutateAsync(values);
    setRegisterModal(false);
    registerForm.resetFields();
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, row: BloodDonor) => (
        <Text strong>{row.lastName}, {row.firstName}</Text>
      ),
    },
    {
      title: 'Blood Type',
      dataIndex: 'bloodType',
      render: (v: string) => (
        <Tag color={bloodTypeColor[v] || 'default'} style={{ fontWeight: 700, fontSize: 13 }}>
          {formatBloodType(v)}
        </Tag>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Last Donated',
      dataIndex: 'lastDonated',
      render: (v: string) => v ? dayjs(v).format('MMM D, YYYY') : <Text type="secondary">Never</Text>,
    },
    {
      title: 'Total Donations',
      key: 'donations',
      render: (_: unknown, row: BloodDonor) => (
        <Tag color="blue">{row._count?.units || 0}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isDeferral',
      render: (v: boolean) => (
        <Tag color={v ? 'red' : 'green'}>{v ? 'DEFERRED' : 'ELIGIBLE'}</Tag>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Donor Database
            {data?.total !== undefined && (
              <Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>
                ({data.total} donors)
              </Text>
            )}
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setRegisterModal(true)}>
            Register Donor
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col flex="auto">
            <Input
              placeholder="Search donor by name or phone..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => { setSearch(searchInput); setPage(1); }}
              allowClear
              onClear={() => { setSearch(''); setSearchInput(''); }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Blood Type"
              allowClear
              style={{ width: 140 }}
              onChange={(v) => { setBloodTypeFilter(v); setPage(1); }}
              options={BLOOD_TYPES.map(bt => ({ value: bt, label: formatBloodType(bt) }))}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => { setSearch(searchInput); setPage(1); }}
            >
              Search
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={data?.data || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total || 0,
          onChange: setPage,
          showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`,
        }}
      />

      {/* Register Donor Modal */}
      <Modal
        title="Register New Donor"
        open={registerModal}
        onCancel={() => { setRegisterModal(false); registerForm.resetFields(); }}
        onOk={() => registerForm.submit()}
        okText="Register Donor"
        confirmLoading={registerDonor.isPending}
      >
        <Form form={registerForm} layout="vertical" onFinish={handleRegister}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="First Name"
                name="firstName"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Last Name"
                name="lastName"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="Blood Type"
            name="bloodType"
            rules={[{ required: true, message: 'Please select blood type' }]}
          >
            <Select
              options={BLOOD_TYPES.map(bt => ({ value: bt, label: formatBloodType(bt) }))}
            />
          </Form.Item>
          <Form.Item label="Phone" name="phone">
            <Input placeholder="e.g., 09xxxxxxxxx" />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input type="email" placeholder="email@example.com" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DonorDatabasePage;
