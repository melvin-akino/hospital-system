import React from 'react';
import { Table, Typography, Row, Col, Card, Alert, Statistic, Spin } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { useBalanceSheet } from '../../hooks/useAccounting';

const { Title, Text } = Typography;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const accountColumns = [
  {
    title: 'Account Code',
    dataIndex: 'accountCode',
    width: 140,
    render: (v: string) => <Text code>{v}</Text>,
  },
  {
    title: 'Account Name',
    dataIndex: 'accountName',
    render: (v: string) => <Text>{v}</Text>,
  },
  {
    title: 'Balance',
    dataIndex: 'balance',
    align: 'right' as const,
    render: (v: number) => (
      <Text strong style={{ color: '#1890ff' }}>
        {formatPeso(v)}
      </Text>
    ),
  },
];

const BalanceSheetPage: React.FC = () => {
  const { data, isLoading } = useBalanceSheet();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const bs = data?.data;
  const assets = bs?.assets ?? [];
  const liabilities = bs?.liabilities ?? [];
  const equity = bs?.equity ?? [];
  const totalAssets = bs?.totalAssets ?? 0;
  const totalLiabilities = bs?.totalLiabilities ?? 0;
  const totalEquity = bs?.totalEquity ?? 0;

  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <BankOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Balance Sheet
          </Title>
          <Text type="secondary">As of {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </Col>
      </Row>

      {/* Accounting equation check */}
      {isBalanced ? (
        <Alert
          type="success"
          message={`Assets (${formatPeso(totalAssets)}) = Liabilities (${formatPeso(totalLiabilities)}) + Equity (${formatPeso(totalEquity)}) ✓ Balanced`}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Alert
          type="error"
          message={`Balance sheet is out of balance! Assets: ${formatPeso(totalAssets)}, Liabilities + Equity: ${formatPeso(totalLiabilities + totalEquity)}`}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Total Assets"
              value={formatPeso(totalAssets)}
              valueStyle={{ color: '#1890ff', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Total Liabilities"
              value={formatPeso(totalLiabilities)}
              valueStyle={{ color: '#ff4d4f', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Total Equity"
              value={formatPeso(totalEquity)}
              valueStyle={{ color: '#52c41a', fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Assets */}
      <Card
        title={<Text strong style={{ color: '#1890ff' }}>ASSETS</Text>}
        headStyle={{ background: '#e6f7ff' }}
        style={{ marginBottom: 16 }}
      >
        <Table
          dataSource={assets}
          columns={accountColumns}
          rowKey="accountCode"
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Text strong>Total Assets</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text strong style={{ color: '#1890ff', fontSize: 16 }}>{formatPeso(totalAssets)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      {/* Liabilities */}
      <Card
        title={<Text strong style={{ color: '#ff4d4f' }}>LIABILITIES</Text>}
        headStyle={{ background: '#fff2f0' }}
        style={{ marginBottom: 16 }}
      >
        <Table
          dataSource={liabilities}
          columns={accountColumns}
          rowKey="accountCode"
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Text strong>Total Liabilities</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>{formatPeso(totalLiabilities)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      {/* Equity */}
      <Card
        title={<Text strong style={{ color: '#52c41a' }}>EQUITY</Text>}
        headStyle={{ background: '#f6ffed' }}
        style={{ marginBottom: 16 }}
      >
        <Table
          dataSource={equity}
          columns={accountColumns}
          rowKey="accountCode"
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Text strong>Total Equity</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text strong style={{ color: '#52c41a', fontSize: 16 }}>{formatPeso(totalEquity)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      {/* Accounting Equation */}
      <Card style={{ background: '#fafafa', border: '2px solid #d9d9d9' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={5} style={{ margin: 0 }}>Accounting Equation</Title>
          </Col>
          <Col>
            <Text style={{ fontSize: 16 }}>
              <Text strong style={{ color: '#1890ff' }}>Assets</Text>
              {' = '}
              <Text strong style={{ color: '#ff4d4f' }}>Liabilities</Text>
              {' + '}
              <Text strong style={{ color: '#52c41a' }}>Equity</Text>
            </Text>
          </Col>
          <Col>
            <Text style={{ fontSize: 16 }}>
              <Text strong style={{ color: '#1890ff' }}>{formatPeso(totalAssets)}</Text>
              {' = '}
              <Text strong style={{ color: '#ff4d4f' }}>{formatPeso(totalLiabilities)}</Text>
              {' + '}
              <Text strong style={{ color: '#52c41a' }}>{formatPeso(totalEquity)}</Text>
              {'  '}
              <Text strong style={{ color: isBalanced ? '#52c41a' : '#ff4d4f' }}>
                {isBalanced ? '✓' : '✗'}
              </Text>
            </Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default BalanceSheetPage;
