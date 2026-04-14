import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Typography,
  DatePicker,
  Space,
  Tag,
  Spin,
  Select,
} from 'antd';
import {
  DollarOutlined,
  UserOutlined,
  FileTextOutlined,
  BarChartOutlined,
  TeamOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import dayjs from 'dayjs';
import {
  useDashboardKPIs,
  useRevenueAnalytics,
  usePatientStatistics,
  useDoctorPerformance,
  useDepartmentPerformance,
} from '../../hooks/useAnalytics';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

const GENDER_COLORS = ['#1890ff', '#ff69b4', '#52c41a'];

const AnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const { data: kpiData, isLoading: kpiLoading } = useDashboardKPIs();
  const { data: revenueData } = useRevenueAnalytics({
    dateFrom: dateRange[0]?.toISOString(),
    dateTo: dateRange[1]?.toISOString(),
    groupBy,
  });
  const { data: patientData } = usePatientStatistics();
  const { data: doctorData } = useDoctorPerformance();
  const { data: deptData } = useDepartmentPerformance();

  const kpis = kpiData?.data;
  const revenue = revenueData?.data;
  const patients = patientData?.data;
  const doctors = doctorData?.data ?? [];
  const departments = deptData?.data ?? [];

  const genderData = patients
    ? [
        { name: 'Male', value: patients.byGender.male },
        { name: 'Female', value: patients.byGender.female },
        { name: 'Other', value: patients.byGender.other },
      ]
    : [];

  if (kpiLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const doctorColumns = [
    { title: 'Doctor', dataIndex: 'doctorName', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Specialty', dataIndex: 'specialty', render: (v: string) => <Tag>{v}</Tag> },
    {
      title: 'Consultations',
      dataIndex: 'totalConsultations',
      align: 'right' as const,
      render: (v: number) => <Text>{v}</Text>,
    },
    {
      title: 'Revenue',
      dataIndex: 'totalRevenue',
      align: 'right' as const,
      render: (v: number) => <Text strong style={{ color: '#52c41a' }}>{formatPeso(v)}</Text>,
    },
    {
      title: 'Avg/Day',
      dataIndex: 'avgConsultationsPerDay',
      align: 'right' as const,
      render: (v: number) => <Text>{v}</Text>,
    },
  ];

  const deptColumns = [
    { title: 'Department', dataIndex: 'deptName', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Consultations', dataIndex: 'totalConsultations', align: 'right' as const },
    {
      title: 'Revenue',
      dataIndex: 'totalRevenue',
      align: 'right' as const,
      render: (v: number) => <Text strong style={{ color: '#52c41a' }}>{formatPeso(v)}</Text>,
    },
    { title: 'Admissions', dataIndex: 'totalAdmissions', align: 'right' as const },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Analytics Dashboard
          </Title>
          <Text type="secondary">Business intelligence overview</Text>
        </Col>
      </Row>

      {/* Row 1: KPI Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Today's Revenue"
              value={formatPeso(kpis?.todayRevenue ?? 0)}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontSize: 16, color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Month Revenue"
              value={formatPeso(kpis?.monthRevenue ?? 0)}
              prefix={<DollarOutlined />}
              valueStyle={{ fontSize: 16, color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Today's Patients"
              value={kpis?.todayPatients ?? 0}
              prefix={<UserOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ fontSize: 16 }}
              suffix={<Text type="secondary" style={{ fontSize: 12 }}>/{kpis?.monthPatients ?? 0} this mo.</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Total Patients"
              value={kpis?.totalPatients ?? 0}
              prefix={<TeamOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Pending Bills"
              value={kpis?.pendingBills ?? 0}
              prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ fontSize: 16, color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Occupancy Rate"
              value={`${kpis?.occupancyRate ?? 0}%`}
              prefix={<HomeOutlined style={{ color: kpis?.occupancyRate ?? 0 > 80 ? '#ff4d4f' : '#52c41a' }} />}
              valueStyle={{ fontSize: 16, color: kpis?.occupancyRate ?? 0 > 80 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Row 2: Charts */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title="Revenue Trend"
            extra={
              <Space>
                <RangePicker
                  value={dateRange}
                  onChange={(v) => setDateRange(v as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
                  format="MMM D"
                  size="small"
                />
                <Select
                  value={groupBy}
                  onChange={setGroupBy}
                  size="small"
                  style={{ width: 90 }}
                  options={[
                    { value: 'day', label: 'Day' },
                    { value: 'week', label: 'Week' },
                    { value: 'month', label: 'Month' },
                  ]}
                />
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenue?.series ?? []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Today's Consultations by Hour">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenue?.series?.slice(-7) ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatPeso(v), 'Revenue']} />
                <Bar dataKey="amount" fill="#52c41a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Row 3: Demographics + Top Doctors */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card title="Patient Distribution by Gender">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {genderData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Top Performing Doctors">
            <Table
              dataSource={doctors.slice(0, 5)}
              columns={doctorColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Row 4: Department Performance */}
      <Card title="Department Performance">
        <Table
          dataSource={departments}
          columns={deptColumns}
          rowKey="deptName"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
