import React, { useEffect, useState } from 'react';
import {
  Typography,
  Tabs,
  Card,
  Tag,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  message,
  Space,
  Table,
  Empty,
  Spin,
  Row,
  Col,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import api from '../lib/api';

const { Title, Text } = Typography;

interface Appointment {
  id: string;
  appointmentNo: string;
  scheduledAt: string;
  status: string;
  notes?: string;
  duration?: number;
  doctor?: { id: string; firstName: string; lastName: string; specialization?: string };
  service?: { name: string };
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialization?: string;
  specialty?: string;
}

interface BookingFormValues {
  doctorId?: string;
  scheduledAt: Dayjs;
  notes?: string;
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'blue',
  CONFIRMED: 'cyan',
  COMPLETED: 'green',
  CANCELLED: 'red',
  NO_SHOW: 'orange',
};

const MyAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<BookingFormValues>();

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data.data || []);
    } catch {
      setAppointments([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchAppointments();
      // Load doctors from main API
      try {
        const res = await api.get('/api/doctors');
        setDoctors(res.data.data || []);
      } catch {
        // Try alternate path
        try {
          const res = await fetch('/api/doctors', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('patient_portal_token')}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setDoctors(data.data || []);
          }
        } catch {
          setDoctors([]);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const now = dayjs();
  const upcoming = appointments.filter(
    (a) =>
      (a.status === 'SCHEDULED' || a.status === 'CONFIRMED') &&
      dayjs(a.scheduledAt).isAfter(now)
  );
  const past = appointments.filter(
    (a) =>
      a.status === 'COMPLETED' ||
      a.status === 'CANCELLED' ||
      a.status === 'NO_SHOW' ||
      (a.status === 'SCHEDULED' && dayjs(a.scheduledAt).isBefore(now))
  );

  const handleBook = async (values: BookingFormValues) => {
    setSubmitting(true);
    try {
      await api.post('/appointments', {
        doctorId: values.doctorId || undefined,
        scheduledAt: values.scheduledAt.toISOString(),
        notes: values.notes,
      });
      message.success('Appointment booked successfully!');
      setModalOpen(false);
      form.resetFields();
      await fetchAppointments();
    } catch {
      message.error('Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const pastColumns: ColumnsType<Appointment> = [
    {
      title: 'Appt #',
      dataIndex: 'appointmentNo',
      key: 'appointmentNo',
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Date & Time',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      render: (v: string) => (
        <Text style={{ fontSize: 12 }}>{dayjs(v).format('MMM DD, YYYY h:mm A')}</Text>
      ),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: unknown, r: Appointment) =>
        r.doctor ? (
          <Text style={{ fontSize: 12 }}>
            Dr. {r.doctor.firstName} {r.doctor.lastName}
          </Text>
        ) : (
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>—</Text>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={statusColors[v] || 'default'} style={{ fontSize: 11 }}>
          {v}
        </Tag>
      ),
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
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            My Appointments
          </Title>
          <Text style={{ color: '#64748b' }}>Manage your scheduled visits</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
        >
          Book New Appointment
        </Button>
      </div>

      <Card style={{ borderRadius: 10 }} bodyStyle={{ padding: 0 }}>
        <Tabs
          defaultActiveKey="upcoming"
          style={{ padding: '0 16px' }}
          items={[
            {
              key: 'upcoming',
              label: (
                <Space>
                  <CalendarOutlined />
                  Upcoming
                  {upcoming.length > 0 && (
                    <Tag color="blue" style={{ fontSize: 11, marginLeft: 4 }}>
                      {upcoming.length}
                    </Tag>
                  )}
                </Space>
              ),
              children: (
                <div style={{ padding: '8px 0 16px' }}>
                  {upcoming.length === 0 ? (
                    <Empty
                      description="No upcoming appointments"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: '32px 0' }}
                    />
                  ) : (
                    <Row gutter={[12, 12]}>
                      {upcoming.map((appt) => (
                        <Col xs={24} md={12} key={appt.id}>
                          <Card
                            size="small"
                            style={{
                              borderRadius: 8,
                              border: '1px solid #e0f2fe',
                              borderLeft: '4px solid #0891b2',
                            }}
                            bodyStyle={{ padding: 16 }}
                          >
                            <Space
                              style={{ marginBottom: 8, justifyContent: 'space-between', width: '100%' }}
                            >
                              <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                                {appt.appointmentNo}
                              </Text>
                              <Tag
                                color={statusColors[appt.status] || 'blue'}
                                style={{ fontSize: 11 }}
                              >
                                {appt.status}
                              </Tag>
                            </Space>

                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <Space>
                                <CalendarOutlined style={{ color: '#0891b2' }} />
                                <Text strong style={{ fontSize: 13 }}>
                                  {dayjs(appt.scheduledAt).format('MMMM DD, YYYY')}
                                </Text>
                              </Space>
                              <Space>
                                <ClockCircleOutlined style={{ color: '#64748b' }} />
                                <Text style={{ fontSize: 13, color: '#64748b' }}>
                                  {dayjs(appt.scheduledAt).format('h:mm A')}
                                  {appt.duration && ` · ${appt.duration} min`}
                                </Text>
                              </Space>
                              {appt.doctor && (
                                <Space>
                                  <UserOutlined style={{ color: '#64748b' }} />
                                  <Text style={{ fontSize: 13, color: '#64748b' }}>
                                    Dr. {appt.doctor.firstName} {appt.doctor.lastName}
                                    {appt.doctor.specialization &&
                                      ` · ${appt.doctor.specialization}`}
                                  </Text>
                                </Space>
                              )}
                              {appt.notes && (
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: '#94a3b8',
                                    fontStyle: 'italic',
                                    marginTop: 4,
                                  }}
                                >
                                  "{appt.notes}"
                                </Text>
                              )}
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              ),
            },
            {
              key: 'past',
              label: 'Past',
              children: (
                <div style={{ padding: '8px 0 16px' }}>
                  {past.length === 0 ? (
                    <Empty
                      description="No past appointments"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: '32px 0' }}
                    />
                  ) : (
                    <Table
                      columns={pastColumns}
                      dataSource={past.map((a) => ({ ...a, key: a.id }))}
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Book Appointment Modal */}
      <Modal
        title={
          <Space>
            <CalendarOutlined style={{ color: '#0891b2' }} />
            <Text strong>Book New Appointment</Text>
          </Space>
        }
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={480}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleBook}
          requiredMark={false}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="doctorId"
            label={<Text strong style={{ fontSize: 13 }}>Doctor (Optional)</Text>}
          >
            <Select
              showSearch
              placeholder="Select a doctor"
              optionFilterProp="label"
              allowClear
              options={doctors.map((d) => ({
                value: d.id,
                label: `Dr. ${d.firstName} ${d.lastName}${d.specialization || d.specialty ? ` — ${d.specialization || d.specialty}` : ''}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="scheduledAt"
            label={<Text strong style={{ fontSize: 13 }}>Date & Time</Text>}
            rules={[{ required: true, message: 'Please select a date and time' }]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              format="YYYY-MM-DD HH:mm"
              placeholder="Select date and time"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              minuteStep={15}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label={<Text strong style={{ fontSize: 13 }}>Notes (Optional)</Text>}
          >
            <Input.TextArea
              rows={3}
              placeholder="Describe your concern or reason for visit..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setModalOpen(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
              >
                Book Appointment
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MyAppointmentsPage;
