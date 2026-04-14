import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Typography,
  DatePicker,
  Space,
  Button,
  Select,
} from 'antd';
import { DownloadOutlined, DollarOutlined } from '@ant-design/icons';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { useRevenueAnalytics } from '../../hooks/useAnalytics';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const RevenueReportPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const { data, isLoading } = useRevenueAnalytics({
    dateFrom: dateRange[0]?.toISOString(),
    dateTo: dateRange[1]?.toISOString(),
    groupBy,
  });

  const revenue = data?.data;
  const series = revenue?.series ?? [];
  const byDoctor = revenue?.byDoctor ?? [];
  const byService = revenue?.byService ?? [];
  const byDepartment = revenue?.byDepartment ?? [];

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const wb = utils.book_new();

    utils.book_append_sheet(wb, utils.json_to_sheet(series), 'Revenue Trend');
    utils.book_append_sheet(wb, utils.json_to_sheet(byDoctor), 'By Doctor');
    utils.book_append_sheet(wb, utils.json_to_sheet(byService), 'By Service');
    utils.book_append_sheet(wb, utils.json_to_sheet(byDepartment), 'By Department');

    writeFile(wb, `Revenue-Report-${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  const doctorCols = [
    { title: 'Doctor', dataIndex: 'doctorName', render: (v: string) => <Text strong>{v}</Text> },
    {
      title: 'Revenue',
      dataIndex: 'amount',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#52c41a' }}>{formatPeso(v)}</Text>,
    },
  ];

  const serviceCols = [
    { title: 'Service', dataIndex: 'serviceName', render: (v: string) => <Text>{v}</Text> },
    {
      title: 'Revenue',
      dataIndex: 'amount',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#1890ff' }}>{formatPeso(v)}</Text>,
    },
  ];

  const deptCols = [
    { title: 'Department', dataIndex: 'deptName', render: (v: string) => <Text strong>{v}</Text> },
    {
      title: 'Revenue',
      dataIndex: 'amount',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#722ed1' }}>{formatPeso(v)}</Text>,
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <DollarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Revenue Report
          </Title>
        </Col>
        <Col>
          <Button icon={<DownloadOutlined />} onClick={exportExcel}>
            Export Excel
          </Button>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(v) => setDateRange(v as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
            format="MMM D, YYYY"
          />
          <Select
            value={groupBy}
            onChange={setGroupBy}
            style={{ width: 100 }}
            options={[
              { value: 'day', label: 'By Day' },
              { value: 'week', label: 'By Week' },
              { value: 'month', label: 'By Month' },
            ]}
          />
        </Space>
      </Card>

      {/* Revenue Trend Chart */}
      <Card title="Revenue Over Time" style={{ marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={series}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [formatPeso(v), 'Revenue']} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#1890ff"
              fill="url(#revGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Three tables */}
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card title="Revenue by Doctor">
            <Table
              dataSource={byDoctor}
              columns={doctorCols}
              rowKey="doctorName"
              loading={isLoading}
              pagination={{ pageSize: 10, size: 'small' }}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Revenue by Service">
            <Table
              dataSource={byService}
              columns={serviceCols}
              rowKey="serviceName"
              loading={isLoading}
              pagination={{ pageSize: 10, size: 'small' }}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Revenue by Department">
            <Table
              dataSource={byDepartment}
              columns={deptCols}
              rowKey="deptName"
              loading={isLoading}
              pagination={{ pageSize: 10, size: 'small' }}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RevenueReportPage;
