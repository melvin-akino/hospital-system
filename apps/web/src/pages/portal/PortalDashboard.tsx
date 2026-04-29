import React from 'react';
import {
  Row, Col, Card, Statistic, Typography, List, Tag, Space, Button,
  Empty, Spin, Badge,
} from 'antd';
import {
  CalendarOutlined, ExperimentOutlined, MedicineBoxOutlined,
  CreditCardOutlined, ArrowRightOutlined, CheckCircleOutlined,
  ClockCircleOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import portalApi from '../../lib/portalApi';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const BILL_STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default', FINALIZED: 'blue', PAID: 'green', PARTIAL: 'orange', CANCELLED: 'red',
};

const APT_STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'blue', CONFIRMED: 'green', CANCELLED: 'red', COMPLETED: 'default', NO_SHOW: 'orange',
};

const PortalDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: appointments, isLoading: loadingApts } = useQuery({
    queryKey: ['portal-appointments'],
    queryFn: () => portalApi.get('/patient-portal/appointments').then((r) => r.data?.data || []),
  });

  const { data: labResults, isLoading: loadingLabs } = useQuery({
    queryKey: ['portal-lab-results'],
    queryFn: () => portalApi.get('/patient-portal/lab-results').then((r) => r.data?.data || []),
  });

  const { data: prescriptions, isLoading: loadingRx } = useQuery({
    queryKey: ['portal-prescriptions'],
    queryFn: () => portalApi.get('/patient-portal/prescriptions').then((r) => r.data?.data || []),
  });

  const { data: bills, isLoading: loadingBills } = useQuery({
    queryKey: ['portal-bills'],
    queryFn: () => portalApi.get('/patient-portal/bills').then((r) => r.data?.data || []),
  });

  const upcomingApts = (appointments || []).filter(
    (a: any) => ['SCHEDULED', 'CONFIRMED'].includes(a.status) && dayjs(a.scheduledAt).isAfter(dayjs())
  );
  const nextApt = upcomingApts[0];

  const activeRx = (prescriptions || []).filter((p: any) => p.status === 'ACTIVE');

  const unpaidBills = (bills || []).filter((b: any) => ['FINALIZED', 'PARTIAL'].includes(b.status));
  const totalDue = unpaidBills.reduce((s: number, b: any) => s + (Number(b.totalAmount) - Number(b.amountPaid || 0)), 0);

  const recentLabs = (labResults || []).slice(0, 3);

  const isLoading = loadingApts || loadingLabs || loadingRx || loadingBills;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#0d9488' }}>Loading your health records…</div>
      </div>
    );
  }

  return (
    <div>
      <Title level={4} style={{ margin: '0 0 20px', color: '#0f766e' }}>My Health Summary</Title>

      {/* Stats row */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            style={{ borderRadius: 12, border: 'none', background: '#fff', cursor: 'pointer' }}
            bodyStyle={{ padding: '20px 24px' }}
            onClick={() => navigate('/portal/appointments')}
          >
            <Statistic
              title={<Text style={{ color: '#6b7280' }}>Upcoming Appointments</Text>}
              value={upcomingApts.length}
              prefix={<CalendarOutlined style={{ color: '#0d9488' }} />}
              valueStyle={{ color: '#0f766e', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            style={{ borderRadius: 12, border: 'none', background: '#fff', cursor: 'pointer' }}
            bodyStyle={{ padding: '20px 24px' }}
            onClick={() => navigate('/portal/lab-results')}
          >
            <Statistic
              title={<Text style={{ color: '#6b7280' }}>Lab Results</Text>}
              value={labResults?.length || 0}
              prefix={<ExperimentOutlined style={{ color: '#7c3aed' }} />}
              valueStyle={{ color: '#7c3aed', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            style={{ borderRadius: 12, border: 'none', background: '#fff', cursor: 'pointer' }}
            bodyStyle={{ padding: '20px 24px' }}
            onClick={() => navigate('/portal/prescriptions')}
          >
            <Statistic
              title={<Text style={{ color: '#6b7280' }}>Active Prescriptions</Text>}
              value={activeRx.length}
              prefix={<MedicineBoxOutlined style={{ color: '#d97706' }} />}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            style={{
              borderRadius: 12, border: 'none', cursor: 'pointer',
              background: unpaidBills.length > 0 ? '#fff7ed' : '#fff',
            }}
            bodyStyle={{ padding: '20px 24px' }}
            onClick={() => navigate('/portal/bills')}
          >
            <Statistic
              title={<Text style={{ color: '#6b7280' }}>Balance Due</Text>}
              value={totalDue}
              precision={2}
              prefix="₱"
              valueStyle={{ color: unpaidBills.length > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}
            />
            {unpaidBills.length > 0 && (
              <Badge status="warning" text={<Text style={{ fontSize: 11, color: '#d97706' }}>{unpaidBills.length} unpaid bill(s)</Text>} />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Next appointment */}
        <Col xs={24} md={12} style={{ marginBottom: 16 }}>
          <Card
            title={<Space><CalendarOutlined style={{ color: '#0d9488' }} /><span>Next Appointment</span></Space>}
            style={{ borderRadius: 12, border: 'none', height: '100%' }}
            extra={<Button type="link" size="small" onClick={() => navigate('/portal/appointments')} icon={<ArrowRightOutlined />}>All</Button>}
          >
            {nextApt ? (
              <div style={{
                background: '#f0fdfa',
                borderRadius: 8,
                padding: 16,
                border: '1px solid #99f6e4',
              }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: 16, color: '#0f766e' }}>
                    {dayjs(nextApt.scheduledAt).format('dddd, MMMM D, YYYY')}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: 700, color: '#0d9488' }}>
                    {dayjs(nextApt.scheduledAt).format('h:mm A')}
                  </Text>
                  {nextApt.doctor && (
                    <Text type="secondary">
                      Dr. {nextApt.doctor.firstName} {nextApt.doctor.lastName}
                      {(nextApt.doctor.specialty || nextApt.doctor.specialization) ? ` — ${nextApt.doctor.specialty || nextApt.doctor.specialization}` : ''}
                    </Text>
                  )}
                  <Space style={{ marginTop: 4 }}>
                    <Tag color={APT_STATUS_COLOR[nextApt.status] || 'default'}>{nextApt.status}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ClockCircleOutlined /> {dayjs(nextApt.scheduledAt).fromNow()}
                    </Text>
                  </Space>
                </Space>
              </div>
            ) : (
              <Empty
                description="No upcoming appointments"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" size="small" onClick={() => navigate('/portal/appointments')}
                  style={{ background: '#0d9488', borderColor: '#0d9488' }}>
                  Book Appointment
                </Button>
              </Empty>
            )}
          </Card>
        </Col>

        {/* Recent lab results */}
        <Col xs={24} md={12} style={{ marginBottom: 16 }}>
          <Card
            title={<Space><ExperimentOutlined style={{ color: '#7c3aed' }} /><span>Recent Lab Results</span></Space>}
            style={{ borderRadius: 12, border: 'none', height: '100%' }}
            extra={<Button type="link" size="small" onClick={() => navigate('/portal/lab-results')} icon={<ArrowRightOutlined />}>All</Button>}
          >
            {recentLabs.length > 0 ? (
              <List
                dataSource={recentLabs}
                renderItem={(item: any) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Text strong style={{ fontSize: 13 }}>
                        {item.requisition?.testName || 'Lab Test'}
                      </Text>
                      <Space>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.resultDate ? dayjs(item.resultDate).format('MMM D, YYYY') : '—'}
                        </Text>
                        {item.isAbnormal && (
                          <Tag color="orange" icon={<WarningOutlined />} style={{ fontSize: 10 }}>Abnormal</Tag>
                        )}
                        {!item.isAbnormal && (
                          <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: 10 }}>Normal</Tag>
                        )}
                      </Space>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No lab results yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* Active prescriptions */}
        <Col xs={24} md={12} style={{ marginBottom: 16 }}>
          <Card
            title={<Space><MedicineBoxOutlined style={{ color: '#d97706' }} /><span>Active Prescriptions</span></Space>}
            style={{ borderRadius: 12, border: 'none' }}
            extra={<Button type="link" size="small" onClick={() => navigate('/portal/prescriptions')} icon={<ArrowRightOutlined />}>All</Button>}
          >
            {activeRx.length > 0 ? (
              <List
                dataSource={activeRx.slice(0, 3)}
                renderItem={(rx: any) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ fontSize: 13 }}>Rx #{rx.rxNo}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {rx.items?.length || 0} medication(s) · Prescribed {dayjs(rx.prescribedAt).fromNow()}
                      </Text>
                      {rx.prescribedBy && (
                        <Text type="secondary" style={{ fontSize: 11 }}>by {rx.prescribedBy}</Text>
                      )}
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No active prescriptions" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* Unpaid bills */}
        <Col xs={24} md={12} style={{ marginBottom: 16 }}>
          <Card
            title={<Space><CreditCardOutlined style={{ color: '#dc2626' }} /><span>Pending Bills</span></Space>}
            style={{ borderRadius: 12, border: 'none' }}
            extra={<Button type="link" size="small" onClick={() => navigate('/portal/bills')} icon={<ArrowRightOutlined />}>All</Button>}
          >
            {unpaidBills.length > 0 ? (
              <List
                dataSource={unpaidBills.slice(0, 3)}
                renderItem={(bill: any) => {
                  const balance = Number(bill.totalAmount) - Number(bill.amountPaid || 0);
                  return (
                    <List.Item style={{ padding: '8px 0' }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space direction="vertical" size={0}>
                          <Text strong style={{ fontSize: 13 }}>Bill #{bill.billNo}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(bill.createdAt).format('MMM D, YYYY')}
                          </Text>
                        </Space>
                        <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
                          <Text strong style={{ color: '#dc2626' }}>
                            ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </Text>
                          <Tag color={BILL_STATUS_COLOR[bill.status]}>{bill.status}</Tag>
                        </Space>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty
                description={<Text style={{ color: '#16a34a' }}>No outstanding bills</Text>}
                image={<CheckCircleOutlined style={{ fontSize: 32, color: '#16a34a' }} />}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PortalDashboard;
