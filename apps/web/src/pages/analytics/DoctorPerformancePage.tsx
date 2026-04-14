import React, { useState } from 'react';
import {
  Table,
  Typography,
  Row,
  Col,
  Tag,
  Input,
  Card,
} from 'antd';
import { MedicineBoxOutlined, SearchOutlined } from '@ant-design/icons';
import { useDoctorPerformance } from '../../hooks/useAnalytics';
import type { DoctorPerformance } from '../../services/analyticsService';

const { Title, Text } = Typography;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const DoctorPerformancePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useDoctorPerformance();

  const doctors = (data?.data ?? []).filter(
    (d) =>
      !search ||
      d.doctorName.toLowerCase().includes(search.toLowerCase()) ||
      d.specialty.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      render: (_: unknown, __: unknown, index: number) => (
        <Text strong style={{ color: index < 3 ? '#faad14' : undefined }}>
          {index + 1}
        </Text>
      ),
    },
    {
      title: 'Doctor Name',
      dataIndex: 'doctorName',
      sorter: (a: DoctorPerformance, b: DoctorPerformance) =>
        a.doctorName.localeCompare(b.doctorName),
      render: (v: string) => <Text strong>Dr. {v}</Text>,
    },
    {
      title: 'Specialty',
      dataIndex: 'specialty',
      sorter: (a: DoctorPerformance, b: DoctorPerformance) =>
        a.specialty.localeCompare(b.specialty),
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Total Consultations',
      dataIndex: 'totalConsultations',
      align: 'right' as const,
      sorter: (a: DoctorPerformance, b: DoctorPerformance) =>
        a.totalConsultations - b.totalConsultations,
      render: (v: number) => <Text>{v.toLocaleString()}</Text>,
    },
    {
      title: 'Total Revenue',
      dataIndex: 'totalRevenue',
      align: 'right' as const,
      sorter: (a: DoctorPerformance, b: DoctorPerformance) =>
        a.totalRevenue - b.totalRevenue,
      defaultSortOrder: 'descend' as const,
      render: (v: number) => (
        <Text strong style={{ color: '#52c41a' }}>{formatPeso(v)}</Text>
      ),
    },
    {
      title: 'Avg / Day',
      dataIndex: 'avgConsultationsPerDay',
      align: 'right' as const,
      sorter: (a: DoctorPerformance, b: DoctorPerformance) =>
        a.avgConsultationsPerDay - b.avgConsultationsPerDay,
      render: (v: number) => <Text>{v.toFixed(2)}</Text>,
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <MedicineBoxOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Doctor Performance
          </Title>
          <Text type="secondary">
            Leaderboard ranked by revenue. Click column headers to sort.
          </Text>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by doctor name or specialty..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 360 }}
        />
      </Card>

      <Table
        dataSource={doctors}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        rowClassName={(_, index) =>
          index === 0 ? 'ant-table-row-gold' : ''
        }
      />
    </div>
  );
};

export default DoctorPerformancePage;
