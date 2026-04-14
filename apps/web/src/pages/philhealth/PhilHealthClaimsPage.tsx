import React, { useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Card,
  Select,
  Modal,
  Form,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  EditOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  usePhilHealthClaims,
  usePhilHealthStats,
  useUpdatePhilHealthClaim,
  useGenerateCF4,
} from '../../hooks/usePhilHealth';
import type { PhilHealthClaim } from '../../services/philhealthService';

const { Title, Text } = Typography;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const statusColor: Record<string, string> = {
  PENDING: 'orange',
  SUBMITTED: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  PAID: 'purple',
};

const PhilHealthClaimsPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [updateModal, setUpdateModal] = useState<PhilHealthClaim | null>(null);
  const [form] = Form.useForm();

  const { data: claimsData, isLoading } = usePhilHealthClaims({
    page,
    limit: 20,
    status: statusFilter,
  });
  const { data: statsData } = usePhilHealthStats();
  const updateClaim = useUpdatePhilHealthClaim();
  const generateCF4 = useGenerateCF4();

  const stats = statsData?.data;
  const claims = claimsData?.data ?? [];

  const handleUpdateStatus = async (values: { status: string; notes?: string }) => {
    if (!updateModal) return;
    await updateClaim.mutateAsync({ id: updateModal.id, data: values });
    setUpdateModal(null);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Claim #',
      dataIndex: 'claimNo',
      width: 160,
      render: (v: string) => <Text strong style={{ color: '#1890ff' }}>{v}</Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: PhilHealthClaim) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.patient?.lastName}, {row.patient?.firstName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.patient?.patientNo}</Text>
        </Space>
      ),
    },
    {
      title: 'PhilHealth #',
      key: 'philhealthNo',
      render: (_: unknown, row: PhilHealthClaim) => (
        <Text>{row.patient?.philhealthNo ?? '—'}</Text>
      ),
    },
    {
      title: 'Diagnosis',
      key: 'diagnosis',
      render: (_: unknown, row: PhilHealthClaim) =>
        row.caseRate ? (
          <Space direction="vertical" size={0}>
            <Text code>{row.caseRate.icdCode}</Text>
            <Text style={{ fontSize: 12 }}>{row.caseRate.description}</Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Claim Amount',
      dataIndex: 'claimAmount',
      render: (v: number) => <Text className="currency">{formatPeso(v)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={statusColor[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'CF4',
      dataIndex: 'cf4Generated',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Generated' : 'Pending'}</Tag>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: unknown, row: PhilHealthClaim) => (
        <Space>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              generateCF4.mutate({ id: row.id, claimNo: row.claimNo });
            }}
            title="Generate CF4 XML"
          >
            CF4
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setUpdateModal(row);
              form.setFieldsValue({ status: row.status, notes: row.notes });
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            PhilHealth Claims
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/philhealth/claims/new')}
          >
            Create Claim
          </Button>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Claims" value={stats?.totalClaims ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending"
              value={stats?.pending ?? 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Approved"
              value={stats?.approved ?? 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={formatPeso(stats?.totalAmount ?? 0)}
              valueStyle={{ color: '#1890ff', fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col>
            <Select
              placeholder="Filter by Status"
              style={{ width: 180 }}
              allowClear
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'].map((v) => ({
                value: v,
                label: v,
              }))}
            />
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={claims}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: claimsData?.total ?? 0,
          onChange: setPage,
          showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`,
        }}
      />

      {/* Update Status Modal */}
      <Modal
        title={`Update Claim: ${updateModal?.claimNo}`}
        open={!!updateModal}
        onCancel={() => { setUpdateModal(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={updateClaim.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select a status' }]}
          >
            <Select
              options={['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'].map((v) => ({
                value: v,
                label: v,
              }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Select mode="tags" placeholder="Add notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PhilHealthClaimsPage;
