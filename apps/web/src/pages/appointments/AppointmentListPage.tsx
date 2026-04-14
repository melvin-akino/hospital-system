import React, { useState } from 'react';
import {
  Card, Row, Col, Typography, Statistic, Table, Tag, Button, Select,
  Space, DatePicker, Popconfirm,
} from 'antd';
import {
  CalendarOutlined, PlusOutlined, StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAppointments, useCancelAppointment } from '../../hooks/useAppointments';
import type { Appointment } from '../../services/appointmentService';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const statusColors: Record<string, string> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'orange',
  COMPLETED: 'green',
  CANCELLED: 'red',
  NO_SHOW: 'default',
};

const AppointmentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data, isLoading } = useAppointments(filters);
  const cancelAppointment = useCancelAppointment();

  const appointments: Appointment[] = (data?.data as Appointment[]) || [];
  const total = data?.total || 0;

  const today = appointments.filter(
    (a) => dayjs(a.scheduledAt).isSame(dayjs(), 'day') && a.status !== 'CANCELLED'
  ).length;
  const thisWeek = appointments.filter(
    (a) =>
      dayjs(a.scheduledAt).isSame(dayjs(), 'week') && a.status !== 'CANCELLED'
  ).length;
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;
  const completed = appointments.filter((a) => a.status === 'COMPLETED').length;

  const columns = [
    { title: 'Appt #', dataIndex: 'appointmentNo', width: 130 },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: Appointment) =>
        row.patient ? `${row.patient.firstName} ${row.patient.lastName}` : '—',
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: unknown, row: Appointment) => row.doctorId || '—',
    },
    {
      title: 'Date / Time',
      dataIndex: 'scheduledAt',
      width: 180,
      render: (v: string) => dayjs(v).format('MMM D, YYYY h:mm A'),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      width: 100,
      render: (v: number) => `${v} min`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 150,
      render: (_: unknown, row: Appointment) => (
        <Space>
          <Button
            size="small"
            type="link"
            onClick={() => navigate(`/appointments/new?edit=${row.id}`)}
          >
            Edit
          </Button>
          {row.status === 'SCHEDULED' && (
            <Popconfirm
              title="Cancel this appointment?"
              onConfirm={() => cancelAppointment.mutate(row.id)}
              okText="Cancel Appt"
              okType="danger"
            >
              <Button size="small" danger icon={<StopOutlined />}>
                Cancel
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <CalendarOutlined /> Appointments
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/appointments/new')}
          >
            Book Appointment
          </Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { title: 'Today', value: today, color: '#1890ff' },
          { title: 'This Week', value: thisWeek, color: '#722ed1' },
          { title: 'Cancelled', value: cancelled, color: '#ff4d4f' },
          { title: 'Completed', value: completed, color: '#52c41a' },
        ].map((s) => (
          <Col key={s.title} xs={12} sm={6}>
            <Card>
              <Statistic title={s.title} value={s.value} valueStyle={{ color: s.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 150 }}
            onChange={(v) => setFilters((f) => ({ ...f, status: v || '' }))}
            options={[
              { label: 'Scheduled', value: 'SCHEDULED' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Completed', value: 'COMPLETED' },
              { label: 'Cancelled', value: 'CANCELLED' },
            ]}
          />
          <RangePicker
            onChange={(dates) => {
              if (dates?.[0] && dates[1]) {
                setFilters((f) => ({
                  ...f,
                  dateFrom: dates[0]!.toISOString(),
                  dateTo: dates[1]!.toISOString(),
                }));
              } else {
                setFilters((f) => {
                  const copy = { ...f };
                  delete copy.dateFrom;
                  delete copy.dateTo;
                  return copy;
                });
              }
            }}
          />
        </Space>

        <Table
          dataSource={appointments}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 20, total }}
        />
      </Card>
    </div>
  );
};

export default AppointmentListPage;
