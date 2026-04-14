import React from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Space, Spin } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  DollarOutlined,
  MedicineBoxOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { usePatients } from '../../hooks/usePatients';
import { useConsultations } from '../../hooks/useConsultations';
import { useBills } from '../../hooks/useBilling';
import { useDoctors } from '../../hooks/useDoctors';
import type { Consultation, Bill } from '../../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const formatPeso = (amount: number) =>
  `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const statusColor: Record<string, string> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'orange',
  COMPLETED: 'green',
  CANCELLED: 'red',
  NO_SHOW: 'default',
  DRAFT: 'blue',
  FINALIZED: 'purple',
  PAID: 'green',
  PARTIAL: 'orange',
};

const DashboardPage: React.FC = () => {
  const today = dayjs().format('YYYY-MM-DD');

  const { data: patientsData } = usePatients({ limit: 1 });
  const { data: doctorsData } = useDoctors({ limit: 1 });
  const { data: todayConsultations, isLoading: loadingCons } = useConsultations({
    from: today,
    to: today + 'T23:59:59',
    limit: 10,
  });
  const { data: recentBills, isLoading: loadingBills } = useBills({
    limit: 5,
    page: 1,
  });

  // Monthly revenue (current month)
  const firstOfMonth = dayjs().startOf('month').toISOString();
  const { data: monthBills } = useQuery({
    queryKey: ['bills-month'],
    queryFn: async () => {
      const { billingService } = await import('../../services/billingService');
      return billingService.getAll({ from: firstOfMonth, limit: 100 });
    },
  });

  const monthRevenue = monthBills?.data?.reduce((sum: number, b: Bill) => {
    return sum + (b.status !== 'CANCELLED' ? Number(b.totalAmount) : 0);
  }, 0) || 0;

  const consultationColumns = [
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: Consultation) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {row.patient?.lastName}, {row.patient?.firstName}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.patient?.patientNo}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: unknown, row: Consultation) => (
        <Text>Dr. {row.doctor?.lastName}</Text>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'scheduledAt',
      render: (v: string) => dayjs(v).format('h:mm A'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v}</Tag>,
    },
  ];

  const billColumns = [
    {
      title: 'Bill No.',
      dataIndex: 'billNo',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: Bill) => (
        <Text>
          {row.patient?.lastName}, {row.patient?.firstName}
        </Text>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      render: (v: number) => <Text className="currency">{formatPeso(v)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v}</Tag>,
    },
  ];

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Patients"
              value={patientsData?.total || 0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              suffix={
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <ArrowUpOutlined /> registered
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Doctors"
              value={doctorsData?.total || 0}
              prefix={<MedicineBoxOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Today's Consultations"
              value={todayConsultations?.total || 0}
              prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Monthly Revenue"
              value={formatPeso(monthRevenue)}
              prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tables */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title="Today's Consultations"
            extra={
              <Text type="secondary">{dayjs().format('MMMM D, YYYY')}</Text>
            }
          >
            {loadingCons ? (
              <Spin />
            ) : (
              <Table
                dataSource={todayConsultations?.data || []}
                columns={consultationColumns}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: 'No consultations today' }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Recent Bills">
            {loadingBills ? (
              <Spin />
            ) : (
              <Table
                dataSource={recentBills?.data || []}
                columns={billColumns}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: 'No recent bills' }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
