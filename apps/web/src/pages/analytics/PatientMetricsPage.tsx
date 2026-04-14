import React from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Typography,
  Tag,
  Spin,
} from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { usePatientStatistics } from '../../hooks/useAnalytics';

const { Title, Text } = Typography;

const GENDER_COLORS = ['#1890ff', '#ff69b4', '#52c41a'];

const PatientMetricsPage: React.FC = () => {
  const { data, isLoading } = usePatientStatistics();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const stats = data?.data;
  const genderData = stats
    ? [
        { name: 'Male', value: stats.byGender.male },
        { name: 'Female', value: stats.byGender.female },
        { name: 'Other', value: stats.byGender.other },
      ]
    : [];

  const diagColumns = [
    { title: '#', key: 'rank', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
    {
      title: 'ICD Code',
      dataIndex: 'icdCode',
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: 'Count', dataIndex: 'count', align: 'right' as const },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Patient Metrics
          </Title>
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Patients"
              value={stats?.totalPatients ?? 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="New This Month"
              value={stats?.newPatientsThisMonth ?? 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Senior Citizens"
              value={stats?.seniorCount ?? 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="PWD Patients"
              value={stats?.pwdCount ?? 0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* Gender Pie Chart */}
        <Col xs={24} md={10}>
          <Card title="Patient Distribution by Gender">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
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

        {/* Age Group Bar Chart */}
        <Col xs={24} md={14}>
          <Card title="Patients by Age Group">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats?.byAgeGroup ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="group" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1890ff" radius={[4, 4, 0, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Top Diagnoses */}
      <Card title="Top Diagnoses (by ICD Code Frequency)">
        <Table
          dataSource={stats?.topDiagnoses ?? []}
          columns={diagColumns}
          rowKey="icdCode"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default PatientMetricsPage;
