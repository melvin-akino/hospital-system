import React, { useState } from 'react';
import {
  Table,
  Button,
  Typography,
  Row,
  Col,
  Card,
  DatePicker,
  Space,
  Tag,
} from 'antd';
import { DownloadOutlined, BarChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTrialBalance } from '../../hooks/useAccounting';
import type { TrialBalanceRow } from '../../services/accountingService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const typeColor: Record<string, string> = {
  ASSET: 'blue',
  LIABILITY: 'orange',
  EQUITY: 'purple',
  REVENUE: 'green',
  EXPENSE: 'red',
};

const TrialBalancePage: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const params = {
    dateFrom: dateRange[0]?.startOf('day').toISOString(),
    dateTo: dateRange[1]?.endOf('day').toISOString(),
  };

  const { data, isLoading } = useTrialBalance(
    dateRange[0] || dateRange[1] ? params : undefined
  );

  const rows = data?.data?.rows ?? [];
  const grandTotalDebit = data?.data?.grandTotalDebit ?? 0;
  const grandTotalCredit = data?.data?.grandTotalCredit ?? 0;

  const exportToExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet(
      rows.map((r) => ({
        'Account Code': r.accountCode,
        'Account Name': r.accountName,
        'Account Type': r.accountType,
        'Total Debit': r.totalDebit,
        'Total Credit': r.totalCredit,
        'Balance': r.balance,
      }))
    );
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Trial Balance');
    writeFile(wb, `Trial-Balance-${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  const columns = [
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
      title: 'Type',
      dataIndex: 'accountType',
      width: 120,
      render: (v: string) => <Tag color={typeColor[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'Total Debit',
      dataIndex: 'totalDebit',
      width: 160,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#1890ff' : undefined }}>{formatPeso(v)}</Text>
      ),
    },
    {
      title: 'Total Credit',
      dataIndex: 'totalCredit',
      width: 160,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#52c41a' : undefined }}>{formatPeso(v)}</Text>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      width: 160,
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ color: v >= 0 ? '#1890ff' : '#ff4d4f' }}>
          {formatPeso(Math.abs(v))}
          {v < 0 ? ' (Cr)' : ' (Dr)'}
        </Text>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Trial Balance
          </Title>
        </Col>
        <Col>
          <Button icon={<DownloadOutlined />} onClick={exportToExcel}>
            Export Excel
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Text>Date Range:</Text>
          </Col>
          <Col>
            <RangePicker
              value={dateRange}
              onChange={(v) => setDateRange(v as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
              format="MMM D, YYYY"
            />
          </Col>
          <Col>
            <Button onClick={() => setDateRange([null, null])}>Clear</Button>
          </Col>
          {dateRange[0] && (
            <Col>
              <Text type="secondary">
                {dateRange[0]?.format('MMM D, YYYY')} – {dateRange[1]?.format('MMM D, YYYY')}
              </Text>
            </Col>
          )}
        </Row>
      </Card>

      <Table
        dataSource={rows}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
              <Table.Summary.Cell index={0} colSpan={3}>
                <Text strong>TOTALS</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <Text strong style={{ color: '#1890ff' }}>{formatPeso(grandTotalDebit)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <Text strong style={{ color: '#52c41a' }}>{formatPeso(grandTotalCredit)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <Text
                  strong
                  style={{
                    color:
                      Math.abs(grandTotalDebit - grandTotalCredit) < 0.01
                        ? '#52c41a'
                        : '#ff4d4f',
                  }}
                >
                  {Math.abs(grandTotalDebit - grandTotalCredit) < 0.01
                    ? '✓ Balanced'
                    : `Diff: ${formatPeso(Math.abs(grandTotalDebit - grandTotalCredit))}`}
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  );
};

export default TrialBalancePage;
