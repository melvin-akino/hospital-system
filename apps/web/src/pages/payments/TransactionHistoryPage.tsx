import React, { useState } from 'react';
import { Card, Typography, Table, Tag, Select, Space, Button } from 'antd';
import { CreditCardOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePaymentTransactions } from '../../hooks/useOnlinePayments';
import type { PaymentIntent } from '../../services/onlinePaymentService';

const { Title } = Typography;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const methodColors: Record<string, string> = {
  GCASH: 'blue',
  MAYA: 'green',
  CREDIT_CARD: 'purple',
  DEBIT_CARD: 'cyan',
};

const statusColors: Record<string, string> = {
  PAID: 'green',
  PENDING: 'orange',
  FAILED: 'red',
  CANCELLED: 'default',
};

const TransactionHistoryPage: React.FC = () => {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data: transactions = [], isLoading, refetch } = usePaymentTransactions(filters);

  const columns = [
    { title: 'Intent ID', dataIndex: 'intentId', width: 200 },
    {
      title: 'Bill #',
      key: 'bill',
      render: (_: unknown, row: PaymentIntent) => row.bill?.billNo || '—',
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: PaymentIntent) => row.bill?.patientName || '—',
    },
    {
      title: 'Method',
      dataIndex: 'method',
      width: 130,
      render: (v: string) => <Tag color={methodColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      width: 130,
      render: (v: number) => formatPeso(v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => dayjs(v).format('MMM D, YYYY HH:mm'),
    },
  ];

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 16 }}>
        <CreditCardOutlined /> Online Payment Transactions
      </Title>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="Filter by method"
            allowClear
            style={{ width: 150 }}
            onChange={(v) => setFilters((f) => ({ ...f, method: v || '' }))}
            options={[
              { label: 'GCash', value: 'GCASH' },
              { label: 'Maya', value: 'MAYA' },
              { label: 'Credit Card', value: 'CREDIT_CARD' },
              { label: 'Debit Card', value: 'DEBIT_CARD' },
            ]}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 140 }}
            onChange={(v) => setFilters((f) => ({ ...f, status: v || '' }))}
            options={[
              { label: 'Paid', value: 'PAID' },
              { label: 'Pending', value: 'PENDING' },
              { label: 'Failed', value: 'FAILED' },
              { label: 'Cancelled', value: 'CANCELLED' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        </Space>

        <Table
          dataSource={transactions}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default TransactionHistoryPage;
