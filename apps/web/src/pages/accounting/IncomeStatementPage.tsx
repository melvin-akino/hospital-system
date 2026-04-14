import React, { useState } from 'react';
import {
  Table,
  Typography,
  Row,
  Col,
  Card,
  DatePicker,
  Divider,
  Statistic,
  Space,
} from 'antd';
import { RiseOutlined, FallOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useIncomeStatement } from '../../hooks/useAccounting';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const IncomeStatementPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const params = {
    dateFrom: dateRange[0]?.startOf('day').toISOString(),
    dateTo: dateRange[1]?.endOf('day').toISOString(),
  };

  const { data, isLoading } = useIncomeStatement(
    dateRange[0] || dateRange[1] ? params : undefined
  );

  const statement = data?.data;
  const revenues = statement?.revenues ?? [];
  const expenses = statement?.expenses ?? [];
  const totalRevenue = statement?.totalRevenue ?? 0;
  const totalExpense = statement?.totalExpense ?? 0;
  const netIncome = statement?.netIncome ?? 0;

  const revenueColumns = [
    { title: 'Code', dataIndex: 'accountCode', width: 120, render: (v: string) => <Text code>{v}</Text> },
    { title: 'Account', dataIndex: 'accountName' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: '#52c41a' }}>{formatPeso(v)}</Text>
      ),
    },
  ];

  const expenseColumns = [
    { title: 'Code', dataIndex: 'accountCode', width: 120, render: (v: string) => <Text code>{v}</Text> },
    { title: 'Account', dataIndex: 'accountName' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: '#ff4d4f' }}>{formatPeso(v)}</Text>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <RiseOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Income Statement (P&L)
          </Title>
        </Col>
      </Row>

      {/* Date filter */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Text>Period:</Text>
          <RangePicker
            value={dateRange}
            onChange={(v) => setDateRange(v as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
            format="MMM D, YYYY"
          />
        </Space>
      </Card>

      {/* Summary cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={formatPeso(totalRevenue)}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Total Expenses"
              value={formatPeso(totalExpense)}
              prefix={<FallOutlined />}
              valueStyle={{ color: '#ff4d4f', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={{ background: netIncome >= 0 ? '#f6ffed' : '#fff2f0' }}>
            <Statistic
              title={netIncome >= 0 ? 'Net Income' : 'Net Loss'}
              value={formatPeso(Math.abs(netIncome))}
              valueStyle={{ color: netIncome >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Revenue section */}
      <Card
        title={
          <Space>
            <RiseOutlined style={{ color: '#52c41a' }} />
            <Text strong style={{ color: '#52c41a' }}>Revenue</Text>
          </Space>
        }
        style={{ marginBottom: 16 }}
        headStyle={{ background: '#f6ffed' }}
      >
        <Table
          dataSource={revenues}
          columns={revenueColumns}
          rowKey="accountCode"
          loading={isLoading}
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Text strong>Total Revenue</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                  {formatPeso(totalRevenue)}
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      {/* Expense section */}
      <Card
        title={
          <Space>
            <FallOutlined style={{ color: '#ff4d4f' }} />
            <Text strong style={{ color: '#ff4d4f' }}>Expenses</Text>
          </Space>
        }
        style={{ marginBottom: 16 }}
        headStyle={{ background: '#fff2f0' }}
      >
        <Table
          dataSource={expenses}
          columns={expenseColumns}
          rowKey="accountCode"
          loading={isLoading}
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Text strong>Total Expenses</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>
                  {formatPeso(totalExpense)}
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      {/* Net Income Banner */}
      <Card style={{ background: netIncome >= 0 ? '#f6ffed' : '#fff2f0', border: `2px solid ${netIncome >= 0 ? '#52c41a' : '#ff4d4f'}` }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, color: netIncome >= 0 ? '#52c41a' : '#ff4d4f' }}>
              {netIncome >= 0 ? 'NET INCOME' : 'NET LOSS'}
            </Title>
            <Text type="secondary">Revenue − Expenses = {formatPeso(totalRevenue)} − {formatPeso(totalExpense)}</Text>
          </Col>
          <Col>
            <Title level={2} style={{ margin: 0, color: netIncome >= 0 ? '#52c41a' : '#ff4d4f' }}>
              {formatPeso(Math.abs(netIncome))}
            </Title>
          </Col>
        </Row>
      </Card>

      <Divider />
    </div>
  );
};

export default IncomeStatementPage;
