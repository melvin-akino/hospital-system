import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Statistic,
  Spin,
  List,
  Tag,
  Space,
  Avatar,
} from 'antd';
import {
  CalendarOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../lib/api';
import { usePatientAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

interface Appointment {
  id: string;
  appointmentNo: string;
  scheduledAt: string;
  status: string;
  notes?: string;
  doctor?: { firstName: string; lastName: string };
  service?: { name: string };
}

interface Bill {
  id: string;
  billNo: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  createdAt: string;
}

interface LabResult {
  id: string;
  testName?: string;
  resultDate: string;
}

interface Consultation {
  id: string;
  scheduledAt: string;
  chiefComplaint?: string;
  assessment?: string;
  doctor?: { firstName: string; lastName: string };
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const PatientDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { patient } = usePatientAuthStore();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [apptRes, billRes, labRes, medRes] = await Promise.allSettled([
          api.get('/appointments'),
          api.get('/bills'),
          api.get('/lab-results'),
          api.get('/medical-records'),
        ]);

        if (apptRes.status === 'fulfilled') {
          setAppointments(apptRes.value.data.data || []);
        }
        if (billRes.status === 'fulfilled') {
          setBills(billRes.value.data.data || []);
        }
        if (labRes.status === 'fulfilled') {
          setLabResults(labRes.value.data.data || []);
        }
        if (medRes.status === 'fulfilled') {
          setConsultations(medRes.value.data.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const now = dayjs();
  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'SCHEDULED' && dayjs(a.scheduledAt).isAfter(now)
  );
  const pendingBills = bills.filter((b) => b.status !== 'PAID');
  const recentConsultations = consultations.slice(0, 3);

  const quickActions = [
    {
      title: 'Book Appointment',
      icon: <CalendarOutlined style={{ fontSize: 32 }} />,
      color: '#0891b2',
      bg: '#e0f2fe',
      path: '/appointments',
    },
    {
      title: 'View Lab Results',
      icon: <ExperimentOutlined style={{ fontSize: 32 }} />,
      color: '#2563eb',
      bg: '#eff6ff',
      path: '/lab-results',
    },
    {
      title: 'Medical Records',
      icon: <FileTextOutlined style={{ fontSize: 32 }} />,
      color: '#16a34a',
      bg: '#f0fdf4',
      path: '/medical-records',
    },
    {
      title: 'Pay Bills',
      icon: <DollarOutlined style={{ fontSize: 32 }} />,
      color: '#ea580c',
      bg: '#fff7ed',
      path: '/bills',
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
          {getGreeting()}, {patient?.firstName || 'Patient'}!
        </Title>
        <Text style={{ color: '#64748b' }}>
          Here's an overview of your health information.
        </Text>
      </div>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 10, borderTop: '4px solid #0891b2' }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <Statistic
              title={<Text style={{ color: '#64748b', fontSize: 13 }}>Upcoming Appointments</Text>}
              value={upcomingAppointments.length}
              prefix={<CalendarOutlined style={{ color: '#0891b2' }} />}
              valueStyle={{ color: '#0891b2', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 10, borderTop: '4px solid #ea580c' }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <Statistic
              title={<Text style={{ color: '#64748b', fontSize: 13 }}>Pending Bills</Text>}
              value={pendingBills.length}
              prefix={<DollarOutlined style={{ color: '#ea580c' }} />}
              valueStyle={{ color: '#ea580c', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 10, borderTop: '4px solid #2563eb' }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <Statistic
              title={<Text style={{ color: '#64748b', fontSize: 13 }}>Lab Results</Text>}
              value={labResults.length}
              prefix={<ExperimentOutlined style={{ color: '#2563eb' }} />}
              valueStyle={{ color: '#2563eb', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card
        title={<Text strong style={{ fontSize: 15 }}>Quick Actions</Text>}
        style={{ borderRadius: 10, marginBottom: 24 }}
        bodyStyle={{ padding: 16 }}
      >
        <Row gutter={[12, 12]}>
          {quickActions.map((action) => (
            <Col xs={12} sm={6} key={action.path}>
              <Card
                hoverable
                onClick={() => navigate(action.path)}
                style={{
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: `1px solid ${action.bg}`,
                  textAlign: 'center',
                }}
                bodyStyle={{ padding: '24px 16px' }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    backgroundColor: action.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: action.color,
                  }}
                >
                  {action.icon}
                </div>
                <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
                  {action.title}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Recent Consultations */}
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: '#0891b2' }} />
            <Text strong style={{ fontSize: 15 }}>Recent Consultations</Text>
          </Space>
        }
        extra={
          <Text
            style={{ color: '#0891b2', cursor: 'pointer', fontSize: 13 }}
            onClick={() => navigate('/medical-records')}
          >
            View all <ArrowRightOutlined />
          </Text>
        }
        style={{ borderRadius: 10 }}
        bodyStyle={{ padding: 0 }}
      >
        {recentConsultations.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <Text style={{ color: '#94a3b8' }}>No consultation records found.</Text>
          </div>
        ) : (
          <List
            dataSource={recentConsultations}
            renderItem={(c) => (
              <List.Item
                style={{ padding: '14px 24px' }}
                extra={
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                    {dayjs(c.scheduledAt).format('MMM DD, YYYY')}
                  </Text>
                }
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      style={{ backgroundColor: '#e0f2fe', color: '#0891b2' }}
                      icon={<FileTextOutlined />}
                    />
                  }
                  title={
                    <Text strong style={{ fontSize: 13 }}>
                      {c.doctor
                        ? `Dr. ${c.doctor.firstName} ${c.doctor.lastName}`
                        : 'Consultation'}
                    </Text>
                  }
                  description={
                    <Text style={{ fontSize: 12, color: '#64748b' }}>
                      {c.chiefComplaint || c.assessment || 'No details available'}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default PatientDashboardPage;
