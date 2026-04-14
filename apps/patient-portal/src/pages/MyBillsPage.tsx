import React, { useEffect, useState } from 'react';
import {
  Typography,
  Table,
  Tag,
  Button,
  Modal,
  Space,
  Card,
  Descriptions,
  message,
  Spin,
  Empty,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  DollarOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import api from '../lib/api';

const { Title, Text } = Typography;

interface Bill {
  id: string;
  billNo: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  items?: BillItem[];
}

interface BillItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const statusColors: Record<string, string> = {
  PAID: 'success',
  PARTIAL: 'warning',
  UNPAID: 'error',
  CANCELLED: 'default',
};

const formatPeso = (amount: number): string => {
  return `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const MyBillsPage: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    api
      .get('/bills')
      .then((res) => setBills(res.data.data || []))
      .catch(() => setBills([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePayOnline = (bill: Bill) => {
    setSelectedBill(bill);
    setPaymentMethod(null);
    setConfirmVisible(false);
    setPayModalOpen(true);
  };

  const handleMethodSelect = (method: string) => {
    setPaymentMethod(method);
    setConfirmVisible(true);
  };

  const columns: ColumnsType<Bill> = [
    {
      title: 'Bill #',
      dataIndex: 'billNo',
      key: 'billNo',
      render: (v: string) => <Text style={{ fontWeight: 600, fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => (
        <Text style={{ fontSize: 12 }}>{dayjs(v).format('MMM DD, YYYY')}</Text>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (v: number) => (
        <Text strong style={{ fontSize: 13 }}>
          {formatPeso(v)}
        </Text>
      ),
      align: 'right' as const,
    },
    {
      title: 'Paid',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      render: (v: number) => (
        <Text style={{ color: '#16a34a', fontSize: 13 }}>{formatPeso(v)}</Text>
      ),
      align: 'right' as const,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (v: number) => (
        <Text
          strong
          style={{ color: v > 0 ? '#dc2626' : '#16a34a', fontSize: 13 }}
        >
          {formatPeso(v)}
        </Text>
      ),
      align: 'right' as const,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag
          color={statusColors[v] || 'default'}
          style={{ fontSize: 11, fontWeight: 600 }}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Bill) =>
        record.status !== 'PAID' && record.status !== 'CANCELLED' ? (
          <Button
            size="small"
            type="primary"
            icon={<CreditCardOutlined />}
            onClick={() => handlePayOnline(record)}
            style={{ backgroundColor: '#0891b2', borderColor: '#0891b2', fontSize: 12 }}
          >
            Pay Online
          </Button>
        ) : null,
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Summary stats
  const totalBalance = bills.reduce((sum, b) => sum + (b.balance || 0), 0);
  const totalPaid = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const unpaidCount = bills.filter((b) => b.status !== 'PAID').length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          My Bills
        </Title>
        <Text style={{ color: '#64748b' }}>View and pay your medical bills</Text>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 10, borderTop: '4px solid #dc2626' }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <Text style={{ color: '#64748b', fontSize: 12, display: 'block' }}>
              Outstanding Balance
            </Text>
            <Text strong style={{ fontSize: 22, color: '#dc2626' }}>
              {formatPeso(totalBalance)}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 10, borderTop: '4px solid #16a34a' }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <Text style={{ color: '#64748b', fontSize: 12, display: 'block' }}>
              Total Paid
            </Text>
            <Text strong style={{ fontSize: 22, color: '#16a34a' }}>
              {formatPeso(totalPaid)}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 10, borderTop: '4px solid #ea580c' }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <Text style={{ color: '#64748b', fontSize: 12, display: 'block' }}>
              Unpaid / Partial Bills
            </Text>
            <Text strong style={{ fontSize: 22, color: '#ea580c' }}>
              {unpaidCount}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Bills Table */}
      <Card style={{ borderRadius: 10 }} bodyStyle={{ padding: 0 }}>
        {bills.length === 0 ? (
          <Empty
            description="No bills found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '48px 0' }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={bills.map((b) => ({ ...b, key: b.id }))}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 700 }}
          />
        )}
      </Card>

      {/* Pay Online Modal */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#0891b2' }} />
            <Text strong>Pay Bill Online</Text>
          </Space>
        }
        open={payModalOpen}
        onCancel={() => {
          setPayModalOpen(false);
          setSelectedBill(null);
          setPaymentMethod(null);
          setConfirmVisible(false);
        }}
        footer={null}
        width={480}
        centered
      >
        {selectedBill && (
          <div>
            {/* Bill Details */}
            <Descriptions
              column={1}
              size="small"
              style={{ marginBottom: 16 }}
              bordered
            >
              <Descriptions.Item label="Bill #">
                <Text strong>{selectedBill.billNo}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {dayjs(selectedBill.createdAt).format('MMMM DD, YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                <Text strong>{formatPeso(selectedBill.totalAmount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Amount Paid">
                <Text style={{ color: '#16a34a' }}>
                  {formatPeso(selectedBill.paidAmount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Balance Due">
                <Text strong style={{ color: '#dc2626', fontSize: 16 }}>
                  {formatPeso(selectedBill.balance)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '16px 0' }} />

            {!confirmVisible ? (
              <>
                <Text
                  strong
                  style={{ display: 'block', marginBottom: 12, fontSize: 14 }}
                >
                  Select Payment Method:
                </Text>
                <Row gutter={12}>
                  <Col span={12}>
                    <Button
                      size="large"
                      block
                      onClick={() => handleMethodSelect('GCash')}
                      style={{
                        backgroundColor: '#1677ff',
                        borderColor: '#1677ff',
                        color: '#fff',
                        borderRadius: 8,
                        height: 52,
                        fontWeight: 600,
                        fontSize: 16,
                      }}
                    >
                      GCash
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button
                      size="large"
                      block
                      onClick={() => handleMethodSelect('Maya')}
                      style={{
                        backgroundColor: '#00b14f',
                        borderColor: '#00b14f',
                        color: '#fff',
                        borderRadius: 8,
                        height: 52,
                        fontWeight: 600,
                        fontSize: 16,
                      }}
                    >
                      Maya
                    </Button>
                  </Col>
                </Row>
              </>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px 8px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: 8,
                  border: '1px solid #bbf7d0',
                }}
              >
                <CheckCircleOutlined
                  style={{ fontSize: 36, color: '#16a34a', marginBottom: 12 }}
                />
                <Title level={5} style={{ margin: '0 0 8px', color: '#15803d' }}>
                  {paymentMethod} Selected
                </Title>
                <Text style={{ color: '#166534', fontSize: 13 }}>
                  Please proceed to the payment counter or use our online payment
                  terminal to complete your {formatPeso(selectedBill.balance)} payment
                  via {paymentMethod}.
                </Text>
                <br />
                <br />
                <Text style={{ color: '#4b5563', fontSize: 12 }}>
                  Show your Bill # <strong>{selectedBill.billNo}</strong> at the payment
                  counter.
                </Text>
                <br />
                <Button
                  type="primary"
                  style={{
                    marginTop: 16,
                    backgroundColor: '#0891b2',
                    borderColor: '#0891b2',
                  }}
                  onClick={() => {
                    setPayModalOpen(false);
                    setSelectedBill(null);
                    setPaymentMethod(null);
                    setConfirmVisible(false);
                    message.info('Please proceed to the payment counter with your bill number.');
                  }}
                >
                  Got it
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyBillsPage;
