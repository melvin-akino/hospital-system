import React, { useState } from 'react';
import {
  Table,
  Button,
  Typography,
  Row,
  Col,
  Card,
  Select,
  Tag,
  Space,
  Modal,
  Form,
  Input,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useHmoClaims, useUpdateHmoClaimStatus, useHmoCompanies } from '../../hooks/useHMO';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  PENDING: 'orange',
  SUBMITTED: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  PAID: 'purple',
};

interface HmoClaim {
  id: string;
  claimNo: string;
  billId?: string;
  patientId?: string;
  amount: number;
  status: string;
  submittedAt?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  hmoCompany?: { name: string; code: string };
}

interface HmoCompany {
  id: string;
  name: string;
  code: string;
}

const HMOClaimsPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [hmoFilter, setHmoFilter] = useState<string | undefined>();
  const [updateModal, setUpdateModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<HmoClaim | null>(null);
  const [form] = Form.useForm();

  const params: Record<string, unknown> = { page, limit: 20 };
  if (statusFilter) params['status'] = statusFilter;
  if (hmoFilter) params['hmoCompanyId'] = hmoFilter;

  const { data, isLoading } = useHmoClaims(params);
  const { data: companiesData } = useHmoCompanies();
  const updateStatus = useUpdateHmoClaimStatus();

  const companies: HmoCompany[] = companiesData?.data || [];

  const openUpdateModal = (claim: HmoClaim) => {
    setSelectedClaim(claim);
    form.setFieldsValue({ status: claim.status, notes: claim.notes });
    setUpdateModal(true);
  };

  const handleUpdate = async (values: { status: string; notes?: string }) => {
    if (!selectedClaim) return;
    await updateStatus.mutateAsync({ id: selectedClaim.id, data: values });
    setUpdateModal(false);
  };

  const columns = [
    {
      title: 'Claim No.',
      dataIndex: 'claimNo',
      render: (v: string) => <Text strong style={{ color: '#1890ff' }}>{v}</Text>,
    },
    {
      title: 'HMO Company',
      key: 'company',
      render: (_: unknown, row: HmoClaim) => (
        <Space>
          <span>{row.hmoCompany?.name || '—'}</span>
          {row.hmoCompany?.code && <Tag>{row.hmoCompany.code}</Tag>}
        </Space>
      ),
    },
    { title: 'Bill #', dataIndex: 'billId', render: (v?: string) => v || '—' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (v: number) => <Text strong>₱{Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Submitted',
      dataIndex: 'submittedAt',
      render: (v?: string) => v ? dayjs(v).format('MMM D, YYYY') : '—',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, row: HmoClaim) => (
        <Button size="small" onClick={() => openUpdateModal(row)}>Update Status</Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            HMO Claims
            {data?.total !== undefined && (
              <Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>
                ({data.total} total)
              </Text>
            )}
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/hmo/claims/new')}>
            New Claim
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col span={8}>
            <Select
              placeholder="Filter by Status"
              style={{ width: '100%' }}
              allowClear
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'SUBMITTED', label: 'Submitted' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'PAID', label: 'Paid' },
              ]}
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="Filter by HMO Company"
              style={{ width: '100%' }}
              allowClear
              onChange={(v) => { setHmoFilter(v); setPage(1); }}
              options={companies.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
            />
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
          showSizeChanger: false,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        }}
      />

      {/* Update Status Modal */}
      <Modal
        title={`Update Claim — ${selectedClaim?.claimNo}`}
        open={updateModal}
        onCancel={() => setUpdateModal(false)}
        onOk={() => form.submit()}
        confirmLoading={updateStatus.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'SUBMITTED', label: 'Submitted' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'PAID', label: 'Paid' },
              ]}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Reason for status change..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HMOClaimsPage;
