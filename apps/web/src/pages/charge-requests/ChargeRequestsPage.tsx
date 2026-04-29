import React, { useState } from 'react';
import {
  Card, Table, Button, Space, Tag, Select, Typography,
  Modal, Form, Input, Badge, Descriptions, Divider, Statistic, Row, Col, message, Tooltip,
} from 'antd';
import {
  CheckOutlined, CloseOutlined, ClockCircleOutlined,
  CheckCircleOutlined, StopOutlined, PlusCircleOutlined,
  EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useChargeRequests, useApproveChargeRequest, useRejectChargeRequest } from '../../hooks/useChargeRequests';
import { useAuthStore } from '../../store/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { TextArea } = Input;

const REQUEST_TYPE_TAG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  ADD:    { color: 'blue',   icon: <PlusCircleOutlined />,  label: 'Add Charge' },
  EDIT:   { color: 'orange', icon: <EditOutlined />,        label: 'Edit Charge' },
  REMOVE: { color: 'red',    icon: <DeleteOutlined />,      label: 'Remove Charge' },
};

const STATUS_TAG: Record<string, { color: string; icon: React.ReactNode }> = {
  PENDING:  { color: 'orange', icon: <ClockCircleOutlined /> },
  APPROVED: { color: 'green',  icon: <CheckCircleOutlined /> },
  REJECTED: { color: 'red',    icon: <StopOutlined /> },
};

const ChargeRequestsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isReviewer = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'BILLING_SUPERVISOR';

  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [page, setPage] = useState(1);
  const [reviewModal, setReviewModal] = useState<{ open: boolean; action: 'approve' | 'reject'; record: any }>({
    open: false, action: 'approve', record: null,
  });
  const [reviewNotes, setReviewNotes] = useState('');
  const [detailRecord, setDetailRecord] = useState<any>(null);

  const { data, isLoading } = useChargeRequests({ status: statusFilter as any, page, limit: 20 });
  const approveReq = useApproveChargeRequest();
  const rejectReq  = useRejectChargeRequest();

  const requests = data?.data ?? [];
  const total = data?.total ?? 0;

  const pendingCount = requests.filter((r: any) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r: any) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r: any) => r.status === 'REJECTED').length;

  const openReview = (action: 'approve' | 'reject', record: any) => {
    setReviewNotes('');
    setReviewModal({ open: true, action, record });
  };

  const handleReview = async () => {
    const { action, record } = reviewModal;
    try {
      if (action === 'approve') {
        await approveReq.mutateAsync({ id: record.id, reviewNotes });
        message.success('Request approved and changes applied');
      } else {
        await rejectReq.mutateAsync({ id: record.id, reviewNotes });
        message.success('Request rejected');
      }
      setReviewModal({ open: false, action: 'approve', record: null });
    } catch {
      message.error('Action failed');
    }
  };

  const getDeptName = (r: any) =>
    r.departmentCharge?.department?.name ?? r.department?.name ?? '—';

  const getServiceName = (r: any) =>
    r.departmentCharge?.service?.serviceName ?? r.service?.serviceName ?? '—';

  const columns = [
    {
      title: 'Request Type',
      dataIndex: 'requestType',
      key: 'type',
      render: (v: string) => {
        const t = REQUEST_TYPE_TAG[v] ?? { color: 'default', icon: null, label: v };
        return <Tag color={t.color} icon={t.icon}>{t.label}</Tag>;
      },
    },
    {
      title: 'Department',
      key: 'dept',
      render: (_: any, r: any) => <Text strong>{getDeptName(r)}</Text>,
    },
    {
      title: 'Service',
      key: 'service',
      render: (_: any, r: any) => <Text>{getServiceName(r)}</Text>,
    },
    {
      title: 'Proposed Price',
      key: 'price',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          {r.proposedPrice != null ? (
            <Text style={{ color: '#1677ff' }}>₱{Number(r.proposedPrice).toFixed(2)}</Text>
          ) : (
            <Text type="secondary">—</Text>
          )}
          {r.currentPrice != null && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Current: ₱{Number(r.currentPrice).toFixed(2)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Requested By',
      key: 'requester',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.requestedBy?.displayName || r.requestedBy?.username}</Text>
          <Tag color="blue" style={{ fontSize: 10 }}>{r.requestedBy?.role}</Tag>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => {
        const s = STATUS_TAG[v] ?? { color: 'default', icon: null };
        return <Tag color={s.color} icon={s.icon}>{v}</Tag>;
      },
    },
    {
      title: 'Submitted',
      dataIndex: 'createdAt',
      key: 'created',
      render: (v: string) => (
        <Tooltip title={dayjs(v).format('MMM D, YYYY h:mm A')}>
          <Text type="secondary">{dayjs(v).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => setDetailRecord(r)}>View</Button>
          {isReviewer && r.status === 'PENDING' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => openReview('approve', r)}
              >
                Approve
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => openReview('reject', r)}
              >
                Reject
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 16 }}>Charge Approval Queue</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Pending"
              value={pendingCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Approved"
              value={approvedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Rejected"
              value={rejectedCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<StopOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            style={{ width: 160 }}
            options={[
              { value: 'PENDING',  label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
          {statusFilter === 'PENDING' && pendingCount > 0 && (
            <Badge count={pendingCount} color="orange">
              <Text type="warning">requests awaiting review</Text>
            </Badge>
          )}
        </Space>

        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={isLoading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
        />
      </Card>

      {/* Review Modal */}
      <Modal
        title={reviewModal.action === 'approve' ? '✅ Approve Request' : '❌ Reject Request'}
        open={reviewModal.open}
        onOk={handleReview}
        onCancel={() => setReviewModal({ open: false, action: 'approve', record: null })}
        confirmLoading={approveReq.isPending || rejectReq.isPending}
        okText={reviewModal.action === 'approve' ? 'Approve & Apply' : 'Reject'}
        okButtonProps={{ danger: reviewModal.action === 'reject' }}
      >
        {reviewModal.record && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Type">
                <Tag color={REQUEST_TYPE_TAG[reviewModal.record.requestType]?.color}>
                  {reviewModal.record.requestType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Department">{getDeptName(reviewModal.record)}</Descriptions.Item>
              <Descriptions.Item label="Service">{getServiceName(reviewModal.record)}</Descriptions.Item>
              {reviewModal.record.proposedPrice != null && (
                <Descriptions.Item label="Proposed Price">
                  ₱{Number(reviewModal.record.proposedPrice).toFixed(2)}
                </Descriptions.Item>
              )}
              {reviewModal.record.reason && (
                <Descriptions.Item label="Requester's Reason">{reviewModal.record.reason}</Descriptions.Item>
              )}
            </Descriptions>
            <Divider />
          </>
        )}
        <Form layout="vertical">
          <Form.Item label="Review Notes (optional)">
            <TextArea
              rows={3}
              placeholder="Reason for approval/rejection — visible to requester"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title="Request Details"
        open={!!detailRecord}
        onCancel={() => setDetailRecord(null)}
        footer={null}
        width={520}
      >
        {detailRecord && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Request Type">
              <Tag color={REQUEST_TYPE_TAG[detailRecord.requestType]?.color} icon={REQUEST_TYPE_TAG[detailRecord.requestType]?.icon}>
                {detailRecord.requestType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_TAG[detailRecord.status]?.color} icon={STATUS_TAG[detailRecord.status]?.icon}>
                {detailRecord.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Department">{getDeptName(detailRecord)}</Descriptions.Item>
            <Descriptions.Item label="Service">{getServiceName(detailRecord)}</Descriptions.Item>
            {detailRecord.currentPrice != null && (
              <Descriptions.Item label="Current Price">₱{Number(detailRecord.currentPrice).toFixed(2)}</Descriptions.Item>
            )}
            {detailRecord.proposedPrice != null && (
              <Descriptions.Item label="Proposed Price">₱{Number(detailRecord.proposedPrice).toFixed(2)}</Descriptions.Item>
            )}
            <Descriptions.Item label="Requested By">
              {detailRecord.requestedBy?.displayName || detailRecord.requestedBy?.username} ({detailRecord.requestedBy?.role})
            </Descriptions.Item>
            <Descriptions.Item label="Submitted">{dayjs(detailRecord.createdAt).format('MMM D, YYYY h:mm A')}</Descriptions.Item>
            {detailRecord.reason && (
              <Descriptions.Item label="Requester's Reason">{detailRecord.reason}</Descriptions.Item>
            )}
            {detailRecord.reviewedBy && (
              <>
                <Descriptions.Item label="Reviewed By">
                  {detailRecord.reviewedBy?.displayName || detailRecord.reviewedBy?.username}
                </Descriptions.Item>
                <Descriptions.Item label="Reviewed At">
                  {dayjs(detailRecord.reviewedAt).format('MMM D, YYYY h:mm A')}
                </Descriptions.Item>
              </>
            )}
            {detailRecord.reviewNotes && (
              <Descriptions.Item label="Review Notes">{detailRecord.reviewNotes}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ChargeRequestsPage;
