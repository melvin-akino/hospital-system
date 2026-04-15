import React from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Space, Spin, Alert, List, Badge } from 'antd';
import {
  UserOutlined, FileTextOutlined, DollarOutlined, MedicineBoxOutlined,
  ArrowUpOutlined, HeartOutlined, ExperimentOutlined, AlertOutlined,
  CalendarOutlined, FormOutlined, HomeOutlined, ShoppingCartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { usePatients } from '../../hooks/usePatients';
import { useConsultations } from '../../hooks/useConsultations';
import { useBills } from '../../hooks/useBilling';
import { useDoctors } from '../../hooks/useDoctors';
import { useAuthStore } from '../../store/authStore';
import type { Consultation, Bill } from '../../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const formatPeso = (amount: number) =>
  `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const statusColor: Record<string, string> = {
  SCHEDULED: 'blue', IN_PROGRESS: 'orange', COMPLETED: 'green',
  CANCELLED: 'red', NO_SHOW: 'default',
  DRAFT: 'blue', FINALIZED: 'purple', PAID: 'green', PARTIAL: 'orange',
};

const consultationColumns = [
  {
    title: 'Patient',
    key: 'patient',
    render: (_: unknown, row: Consultation) => (
      <Space direction="vertical" size={0}>
        <Text strong>{row.patient?.lastName}, {row.patient?.firstName}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{row.patient?.patientNo}</Text>
      </Space>
    ),
  },
  {
    title: 'Doctor',
    key: 'doctor',
    render: (_: unknown, row: Consultation) => <Text>Dr. {row.doctor?.lastName}</Text>,
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
  { title: 'Bill No.', dataIndex: 'billNo', render: (v: string) => <Text strong>{v}</Text> },
  {
    title: 'Patient', key: 'patient',
    render: (_: unknown, row: Bill) => <Text>{row.patient?.lastName}, {row.patient?.firstName}</Text>,
  },
  {
    title: 'Amount', dataIndex: 'totalAmount',
    render: (v: number) => <Text>{formatPeso(v)}</Text>,
  },
  {
    title: 'Status', dataIndex: 'status',
    render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v}</Tag>,
  },
];

// ── Admin/Full Dashboard ────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const today = dayjs().format('YYYY-MM-DD');
  const { data: patientsData } = usePatients({ limit: 1 });
  const { data: doctorsData } = useDoctors({ limit: 1 });
  const { data: todayConsultations, isLoading: loadingCons } = useConsultations({
    from: today, to: today + 'T23:59:59', limit: 10,
  });
  const { data: recentBills, isLoading: loadingBills } = useBills({ limit: 5, page: 1 });
  const { data: monthBills } = useQuery({
    queryKey: ['bills-month'],
    queryFn: async () => {
      const { billingService } = await import('../../services/billingService');
      return billingService.getAll({ from: dayjs().startOf('month').toISOString(), limit: 100 });
    },
  });
  const monthRevenue = monthBills?.data?.reduce(
    (sum: number, b: Bill) => sum + (b.status !== 'CANCELLED' ? Number(b.totalAmount) : 0), 0
  ) || 0;

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Patients" value={patientsData?.total || 0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              suffix={<Text type="secondary" style={{ fontSize: 13 }}><ArrowUpOutlined /> registered</Text>} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Active Doctors" value={doctorsData?.total || 0}
              prefix={<MedicineBoxOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Today's Consultations" value={todayConsultations?.total || 0}
              prefix={<FileTextOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Monthly Revenue" value={formatPeso(monthRevenue)}
              prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 18 }} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Today's Consultations"
            extra={<Text type="secondary">{dayjs().format('MMMM D, YYYY')}</Text>}>
            {loadingCons ? <Spin /> : (
              <Table dataSource={todayConsultations?.data || []} columns={consultationColumns}
                rowKey="id" pagination={false} size="small"
                locale={{ emptyText: 'No consultations today' }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Recent Bills">
            {loadingBills ? <Spin /> : (
              <Table dataSource={recentBills?.data || []} columns={billColumns}
                rowKey="id" pagination={false} size="small"
                locale={{ emptyText: 'No recent bills' }} />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
};

// ── Doctor Dashboard ────────────────────────────────────────────────────────
const DoctorDashboard: React.FC = () => {
  const today = dayjs().format('YYYY-MM-DD');
  const { data: myConsultations, isLoading } = useConsultations({
    from: today, to: today + 'T23:59:59', limit: 20,
  });
  const { data: pendingLabs } = useQuery({
    queryKey: ['lab-pending'],
    queryFn: async () => {
      const res = await import('../../lib/api').then(m =>
        m.default.get('/lab/requisitions', { params: { status: 'PENDING', limit: 5 } })
      );
      return res.data.data;
    },
  });

  const scheduled = myConsultations?.data?.filter((c: Consultation) => c.status === 'SCHEDULED') || [];
  const inProgress = myConsultations?.data?.filter((c: Consultation) => c.status === 'IN_PROGRESS') || [];

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #1890ff' }}>
            <Statistic title="Scheduled Today" value={scheduled.length}
              prefix={<CalendarOutlined style={{ color: '#1890ff' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #fa8c16' }}>
            <Statistic title="In Progress" value={inProgress.length}
              prefix={<HeartOutlined style={{ color: '#fa8c16' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #ff4d4f' }}>
            <Statistic title="Pending Lab Orders" value={pendingLabs?.total || 0}
              prefix={<ExperimentOutlined style={{ color: '#ff4d4f' }} />} />
          </Card>
        </Col>
      </Row>
      <Card title={<><CalendarOutlined style={{ marginRight: 8 }} />Today's Schedule</>}>
        {isLoading ? <Spin /> : (
          <Table dataSource={myConsultations?.data || []} columns={consultationColumns}
            rowKey="id" pagination={false} size="small"
            locale={{ emptyText: "No consultations scheduled for today" }} />
        )}
      </Card>
    </>
  );
};

// ── Nurse Dashboard ─────────────────────────────────────────────────────────
const NurseDashboard: React.FC = () => {
  const { data: admissions, isLoading } = useQuery({
    queryKey: ['admitted-patients'],
    queryFn: async () => {
      const res = await import('../../lib/api').then(m =>
        m.default.get('/admissions', { params: { status: 'ADMITTED', limit: 10 } })
      );
      return res.data.data;
    },
  });

  const shiftHour = dayjs().hour();
  const shiftLabel = shiftHour < 14 ? 'Morning Shift (6AM–2PM)'
    : shiftHour < 22 ? 'Afternoon Shift (2PM–10PM)' : 'Night Shift (10PM–6AM)';

  return (
    <>
      <Alert
        message={`Current Shift: ${shiftLabel}`}
        description={`Today is ${dayjs().format('dddd, MMMM D, YYYY')}`}
        type="info" showIcon style={{ marginBottom: 16 }}
      />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #108ee9' }}>
            <Statistic title="Admitted Patients" value={admissions?.total || 0}
              prefix={<HomeOutlined style={{ color: '#108ee9' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #faad14' }}>
            <Statistic title="Pending Vitals" value="—"
              prefix={<HeartOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #52c41a' }}>
            <Statistic title="Care Plans Active" value="—"
              prefix={<FormOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
      </Row>
      <Card title={<><HomeOutlined style={{ marginRight: 8 }} />Currently Admitted Patients</>}>
        {isLoading ? <Spin /> : (
          <List
            size="small"
            dataSource={admissions?.data || []}
            locale={{ emptyText: 'No admitted patients' }}
            renderItem={(item: { id: string; patient: { firstName: string; lastName: string; patientNo: string }; room?: { roomNumber: string }; admittedAt: string }) => (
              <List.Item>
                <List.Item.Meta
                  title={<Text strong>{item.patient?.lastName}, {item.patient?.firstName}</Text>}
                  description={
                    <Space size={16}>
                      <Text type="secondary">{item.patient?.patientNo}</Text>
                      {item.room && <Tag color="blue">Room {item.room.roomNumber}</Tag>}
                      <Text type="secondary">Since {dayjs(item.admittedAt).format('MMM D')}</Text>
                    </Space>
                  }
                />
                <Badge status="processing" text="Admitted" />
              </List.Item>
            )}
          />
        )}
      </Card>
    </>
  );
};

// ── Billing Dashboard ───────────────────────────────────────────────────────
const BillingDashboard: React.FC = () => {
  const { data: unpaidBills, isLoading } = useBills({ limit: 10, page: 1 });
  const { data: recentPayments } = useQuery({
    queryKey: ['recent-payments'],
    queryFn: async () => {
      const res = await import('../../lib/api').then(m =>
        m.default.get('/billing', { params: { status: 'PAID', limit: 5 } })
      );
      return res.data.data;
    },
  });

  const draftBills = unpaidBills?.data?.filter((b: Bill) => b.status === 'DRAFT') || [];
  const partialBills = unpaidBills?.data?.filter((b: Bill) => b.status === 'PARTIAL') || [];
  const totalOutstanding = unpaidBills?.data
    ?.filter((b: Bill) => b.status !== 'PAID' && b.status !== 'CANCELLED')
    .reduce((sum: number, b: Bill) => sum + Number(b.balance || 0), 0) || 0;

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #722ed1' }}>
            <Statistic title="Draft Bills" value={draftBills.length}
              prefix={<FileTextOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #fa8c16' }}>
            <Statistic title="Partial Payments" value={partialBills.length}
              prefix={<DollarOutlined style={{ color: '#fa8c16' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #ff4d4f' }}>
            <Statistic title="Total Outstanding" value={formatPeso(totalOutstanding)}
              valueStyle={{ color: '#ff4d4f', fontSize: 16 }}
              prefix={<AlertOutlined style={{ color: '#ff4d4f' }} />} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Unpaid / Partial Bills">
            {isLoading ? <Spin /> : (
              <Table
                dataSource={unpaidBills?.data?.filter(
                  (b: Bill) => b.status !== 'PAID' && b.status !== 'CANCELLED'
                ) || []}
                columns={billColumns} rowKey="id" pagination={false} size="small"
                locale={{ emptyText: 'All bills settled' }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Recently Paid">
            <Table dataSource={recentPayments?.data || []} columns={billColumns}
              rowKey="id" pagination={false} size="small"
              locale={{ emptyText: 'No recent payments' }} />
          </Card>
        </Col>
      </Row>
    </>
  );
};

// ── Receptionist Dashboard ──────────────────────────────────────────────────
const ReceptionistDashboard: React.FC = () => {
  const today = dayjs().format('YYYY-MM-DD');
  const { data: todayAppts, isLoading } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: async () => {
      const res = await import('../../lib/api').then(m =>
        m.default.get('/appointments', {
          params: { from: today, to: today + 'T23:59:59', limit: 20 }
        })
      );
      return res.data.data;
    },
  });
  const { data: todayConsultations } = useConsultations({
    from: today, to: today + 'T23:59:59', limit: 1,
  });

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card style={{ borderLeft: '4px solid #13c2c2' }}>
            <Statistic title="Today's Appointments" value={todayAppts?.total || 0}
              prefix={<CalendarOutlined style={{ color: '#13c2c2' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card style={{ borderLeft: '4px solid #1890ff' }}>
            <Statistic title="Today's Consultations" value={todayConsultations?.total || 0}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />} />
          </Card>
        </Col>
      </Row>
      <Card title={<><CalendarOutlined style={{ marginRight: 8 }} />Today's Appointments</>}>
        {isLoading ? <Spin /> : (
          <Table
            dataSource={todayAppts?.data || []}
            rowKey="id" size="small" pagination={false}
            locale={{ emptyText: 'No appointments today' }}
            columns={[
              { title: 'Time', dataIndex: 'scheduledAt', render: (v: string) => dayjs(v).format('h:mm A') },
              {
                title: 'Patient', key: 'patient',
                render: (_: unknown, r: { patient?: { lastName: string; firstName: string } }) =>
                  <Text>{r.patient?.lastName}, {r.patient?.firstName}</Text>,
              },
              {
                title: 'Doctor', key: 'doctor',
                render: (_: unknown, r: { doctor?: { lastName: string } }) =>
                  <Text>Dr. {r.doctor?.lastName}</Text>,
              },
              {
                title: 'Status', dataIndex: 'status',
                render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v}</Tag>,
              },
            ]}
          />
        )}
      </Card>
    </>
  );
};

// ── Pharmacist Dashboard ────────────────────────────────────────────────────
const PharmacistDashboard: React.FC = () => {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async () => {
      const res = await import('../../lib/api').then(m =>
        m.default.get('/pharmacy/alerts', { params: { limit: 10 } })
      );
      return res.data.data;
    },
  });

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card style={{ borderLeft: '4px solid #ff4d4f' }}>
            <Statistic title="Low Stock Alerts" value={alerts?.total || 0}
              prefix={<AlertOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card style={{ borderLeft: '4px solid #fa8c16' }}>
            <Statistic title="Items to Reorder" value="—"
              prefix={<ShoppingCartOutlined style={{ color: '#fa8c16' }} />} />
          </Card>
        </Col>
      </Row>
      <Card title={<><AlertOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />Stock Alerts</>}>
        {isLoading ? <Spin /> : (
          <List
            size="small"
            dataSource={alerts?.data || []}
            locale={{ emptyText: 'All stock levels are healthy' }}
            renderItem={(item: { name?: string; genericName?: string; currentStock?: number; minimumStock?: number }) => (
              <List.Item>
                <List.Item.Meta
                  title={<Text strong>{item.name || item.genericName}</Text>}
                  description={`Stock: ${item.currentStock} / Min: ${item.minimumStock}`}
                />
                <Tag color="red">Low Stock</Tag>
              </List.Item>
            )}
          />
        )}
      </Card>
    </>
  );
};

// ── Lab Tech Dashboard ──────────────────────────────────────────────────────
const LabDashboard: React.FC = () => {
  const { data: pending, isLoading } = useQuery({
    queryKey: ['lab-pending'],
    queryFn: async () => {
      const res = await import('../../lib/api').then(m =>
        m.default.get('/lab/requisitions', { params: { status: 'PENDING', limit: 10 } })
      );
      return res.data.data;
    },
  });

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card style={{ borderLeft: '4px solid #faad14' }}>
            <Statistic title="Pending Requisitions" value={pending?.total || 0}
              prefix={<ExperimentOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
      </Row>
      <Card title={<><ExperimentOutlined style={{ marginRight: 8 }} />Pending Lab Requisitions</>}>
        {isLoading ? <Spin /> : (
          <List
            size="small"
            dataSource={pending?.data || []}
            locale={{ emptyText: 'No pending requisitions' }}
            renderItem={(item: { requisitionNo?: string; patient?: { firstName: string; lastName: string }; createdAt?: string }) => (
              <List.Item>
                <List.Item.Meta
                  title={<Text strong>{item.requisitionNo}</Text>}
                  description={`Patient: ${item.patient?.lastName}, ${item.patient?.firstName} — ${dayjs(item.createdAt).format('MMM D, h:mm A')}`}
                />
                <Tag color="orange">PENDING</Tag>
              </List.Item>
            )}
          />
        )}
      </Card>
    </>
  );
};

// ── Main Dashboard Router ───────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role || '';

  const greetings: Record<string, { icon: React.ReactNode; subtitle: string }> = {
    SUPER_ADMIN: { icon: <MedicineBoxOutlined />, subtitle: 'System Overview — All Modules' },
    ADMIN: { icon: <MedicineBoxOutlined />, subtitle: 'Hospital Administration Dashboard' },
    DOCTOR: { icon: <HeartOutlined />, subtitle: "Today's Clinical Schedule" },
    NURSE: { icon: <FormOutlined />, subtitle: 'Nursing Station — Current Shift' },
    BILLING: { icon: <DollarOutlined />, subtitle: 'Billing & Collections Overview' },
    RECEPTIONIST: { icon: <CalendarOutlined />, subtitle: "Today's Appointments & Queue" },
    PHARMACIST: { icon: <ShoppingCartOutlined />, subtitle: 'Pharmacy — Stock & Dispensing' },
    LAB_TECH: { icon: <ExperimentOutlined />, subtitle: 'Laboratory — Pending Requisitions' },
    RADIOLOGY_TECH: { icon: <ExperimentOutlined />, subtitle: 'Radiology — Pending Orders' },
  };

  const { icon, subtitle } = greetings[role] || { icon: <MedicineBoxOutlined />, subtitle: '' };

  const renderDashboard = () => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return <AdminDashboard />;
      case 'DOCTOR':
        return <DoctorDashboard />;
      case 'NURSE':
        return <NurseDashboard />;
      case 'BILLING':
        return <BillingDashboard />;
      case 'RECEPTIONIST':
        return <ReceptionistDashboard />;
      case 'PHARMACIST':
        return <PharmacistDashboard />;
      case 'LAB_TECH':
      case 'RADIOLOGY_TECH':
        return <LabDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <Space>
          <span style={{ fontSize: 22, color: '#1890ff' }}>{icon}</span>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Welcome, {user?.displayName || user?.username}
            </Title>
            <Text type="secondary">{subtitle}</Text>
          </div>
        </Space>
      </div>
      {renderDashboard()}
    </div>
  );
};

export default DashboardPage;
