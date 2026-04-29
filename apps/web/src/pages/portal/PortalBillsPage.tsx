import React, { useState } from 'react';
import {
  Table, Card, Tag, Typography, Space, Modal, Descriptions,
  Statistic, Row, Col, Progress, Empty,
} from 'antd';
import { CreditCardOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import portalApi from '../../lib/portalApi';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default', FINALIZED: 'blue', PAID: 'green', PARTIAL: 'orange', CANCELLED: 'red',
};

const formatPeso = (v: number) =>
  `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const PortalBillsPage: React.FC = () => {
  const [selected, setSelected] = useState<any>(null);

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['portal-bills'],
    queryFn: () => portalApi.get('/patient-portal/bills').then((r) => r.data?.data || []),
  });

  const totalBilled = bills.reduce((s: number, b: any) => s + Number(b.totalAmount || 0), 0);
  const totalPaid   = bills.reduce((s: number, b: any) => s + Number(b.amountPaid || 0), 0);
  const totalDue    = totalBilled - totalPaid;

  const columns = [
    {
      title: 'Bill Number',
      dataIndex: 'billNo',
      render: (v: string) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      render: (v: number) => <Text strong>{formatPeso(Number(v))}</Text>,
    },
    {
      title: 'Amount Paid',
      dataIndex: 'amountPaid',
      render: (v: number) => (
        <Text style={{ color: Number(v) > 0 ? '#16a34a' : '#9ca3af' }}>
          {formatPeso(Number(v || 0))}
        </Text>
      ),
    },
    {
      title: 'Balance',
      key: 'balance',
      render: (_: any, r: any) => {
        const balance = Number(r.totalAmount) - Number(r.amountPaid || 0);
        return (
          <Text strong style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>
            {formatPeso(balance)}
          </Text>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => <Tag color={STATUS_COLOR[s] || 'default'}>{s}</Tag>,
    },
    {
      title: '',
      key: 'action',
      render: (_: any, r: any) => (
        <EyeOutlined
          style={{ color: '#0d9488', cursor: 'pointer', fontSize: 16 }}
          onClick={() => setSelected(r)}
        />
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ margin: '0 0 20px', color: '#0f766e' }}>
        <CreditCardOutlined /> My Bills
      </Title>

      {/* Summary cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, border: 'none' }} bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<Text style={{ color: '#6b7280' }}>Total Billed</Text>}
              value={totalBilled}
              precision={2}
              prefix="₱"
              valueStyle={{ color: '#1e40af', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, border: 'none' }} bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<Text style={{ color: '#6b7280' }}>Total Paid</Text>}
              value={totalPaid}
              precision={2}
              prefix="₱"
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            style={{
              borderRadius: 12, border: 'none',
              background: totalDue > 0 ? '#fff7ed' : '#f0fdf4',
            }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <Statistic
              title={<Text style={{ color: '#6b7280' }}>Balance Due</Text>}
              value={totalDue}
              precision={2}
              prefix="₱"
              valueStyle={{ color: totalDue > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}
            />
            {totalDue === 0 && (
              <Space style={{ marginTop: 4 }}>
                <CheckCircleOutlined style={{ color: '#16a34a' }} />
                <Text style={{ color: '#16a34a', fontSize: 12 }}>All settled!</Text>
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {/* Overall payment progress */}
      {totalBilled > 0 && (
        <Card style={{ borderRadius: 12, border: 'none', marginBottom: 16 }} bodyStyle={{ padding: '16px 24px' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text strong>Overall Payment Progress</Text>
            <Text type="secondary">{Math.round((totalPaid / totalBilled) * 100)}% paid</Text>
          </Space>
          <Progress
            percent={Math.min(100, Math.round((totalPaid / totalBilled) * 100))}
            strokeColor={{ '0%': '#0d9488', '100%': '#16a34a' }}
            showInfo={false}
          />
        </Card>
      )}

      <Card style={{ borderRadius: 12, border: 'none' }}>
        <Table
          dataSource={bills}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="No bills found" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <CreditCardOutlined style={{ color: '#0891b2' }} />
            Bill — {selected?.billNo}
          </Space>
        }
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        width={500}
      >
        {selected && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Bill Number" span={2}>
                <Text strong style={{ fontFamily: 'monospace' }}>{selected.billNo}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {dayjs(selected.createdAt).format('MMM D, YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR[selected.status]}>{selected.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                <Text strong>{formatPeso(Number(selected.totalAmount))}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Discount">
                {formatPeso(Number(selected.discountAmount || 0))}
              </Descriptions.Item>
              <Descriptions.Item label="Amount Paid">
                <Text style={{ color: '#16a34a' }}>{formatPeso(Number(selected.amountPaid || 0))}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Balance Due">
                <Text strong style={{ color: '#dc2626' }}>
                  {formatPeso(Number(selected.totalAmount) - Number(selected.amountPaid || 0))}
                </Text>
              </Descriptions.Item>
              {selected.notes && (
                <Descriptions.Item label="Notes" span={2}>{selected.notes}</Descriptions.Item>
              )}
            </Descriptions>
            {selected.status !== 'PAID' && (
              <div style={{
                marginTop: 16, padding: 12, background: '#fef3c7',
                borderRadius: 8, border: '1px solid #fde68a',
              }}>
                <Text style={{ color: '#92400e', fontSize: 12 }}>
                  To settle this bill, please visit the Billing Department or contact our cashier.
                </Text>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default PortalBillsPage;
