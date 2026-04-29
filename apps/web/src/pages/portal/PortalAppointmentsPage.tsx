import React, { useState } from 'react';
import {
  Table, Card, Tag, Typography, Space, Button, Modal, Form,
  DatePicker, Select, Input, Alert, Empty, Tabs,
} from 'antd';
import { CalendarOutlined, PlusOutlined } from '@ant-design/icons';
import { App } from 'antd';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import portalApi from '../../lib/portalApi';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'blue', CONFIRMED: 'green', CANCELLED: 'red',
  COMPLETED: 'default', NO_SHOW: 'orange',
};

const PortalAppointmentsPage: React.FC = () => {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [bookOpen, setBookOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['portal-appointments'],
    queryFn: () => portalApi.get('/patient-portal/appointments').then((r) => r.data?.data || []),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['portal-doctors'],
    queryFn: () => portalApi.get('/patient-portal/doctors').then((r) => r.data?.data || []),
  });

  const bookMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      portalApi.post('/patient-portal/appointments', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-appointments'] });
      message.success('Appointment booked successfully!');
      setBookOpen(false);
      form.resetFields();
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Failed to book appointment');
    },
  });

  const handleBook = async (values: any) => {
    await bookMutation.mutateAsync({
      doctorId: values.doctorId || undefined,
      scheduledAt: values.scheduledAt.toISOString(),
      notes: values.notes,
    });
  };

  const upcoming = appointments.filter(
    (a: any) => ['SCHEDULED', 'CONFIRMED'].includes(a.status) && dayjs(a.scheduledAt).isAfter(dayjs())
  );
  const past = appointments.filter(
    (a: any) => !upcoming.find((u: any) => u.id === a.id)
  );

  const columns = [
    {
      title: 'Date & Time',
      key: 'scheduledAt',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{dayjs(r.scheduledAt).format('MMMM D, YYYY')}</Text>
          <Text type="secondary">{dayjs(r.scheduledAt).format('h:mm A')}</Text>
        </Space>
      ),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: any, r: any) =>
        r.doctor
          ? <Space direction="vertical" size={0}>
              <Text strong>Dr. {r.doctor.firstName} {r.doctor.lastName}</Text>
              {(r.doctor.specialty || r.doctor.specialization) && <Text type="secondary" style={{ fontSize: 12 }}>{r.doctor.specialty || r.doctor.specialization}</Text>}
            </Space>
          : <Text type="secondary">Not assigned</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => <Tag color={STATUS_COLOR[s] || 'default'}>{s}</Tag>,
    },
    { title: 'Notes', dataIndex: 'notes', render: (v?: string) => v || '—' },
  ];

  const tabItems = [
    {
      key: 'upcoming',
      label: <span><CalendarOutlined /> Upcoming ({upcoming.length})</span>,
      children: (
        <Table
          dataSource={upcoming}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: <Empty description="No upcoming appointments" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      ),
    },
    {
      key: 'past',
      label: `Past (${past.length})`,
      children: (
        <Table
          dataSource={past}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 20, width: '100%', justifyContent: 'space-between' }}>
        <Title level={4} style={{ margin: 0, color: '#0f766e' }}>
          <CalendarOutlined /> My Appointments
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setBookOpen(true)}
          style={{ background: '#0d9488', borderColor: '#0d9488' }}
        >
          Book Appointment
        </Button>
      </Space>

      <Card style={{ borderRadius: 12, border: 'none' }} loading={isLoading}>
        <Tabs items={tabItems} />
      </Card>

      {/* Book Modal */}
      <Modal
        title={<Space><CalendarOutlined style={{ color: '#0d9488' }} />Book an Appointment</Space>}
        open={bookOpen}
        onCancel={() => { setBookOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Book Appointment"
        okButtonProps={{ loading: bookMutation.isPending, style: { background: '#0d9488', borderColor: '#0d9488' } }}
      >
        <Alert
          type="info"
          showIcon
          message="Our staff will confirm your appointment within 24 hours."
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical" onFinish={handleBook}>
          <Form.Item name="doctorId" label="Preferred Doctor (optional)">
            <Select
              placeholder="Any available doctor"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {doctors.map((d: any) => (
                <Select.Option key={d.id} value={d.id}>
                  Dr. {d.firstName} {d.lastName}
                  {d.specialty ? ` — ${d.specialty}` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="scheduledAt"
            label="Preferred Date & Time"
            rules={[{ required: true, message: 'Please select a date and time' }]}
          >
            <DatePicker
              showTime={{ format: 'h:mm A', use12Hours: true }}
              format="MMMM D, YYYY h:mm A"
              style={{ width: '100%' }}
              disabledDate={(d) => d.isBefore(dayjs(), 'day')}
            />
          </Form.Item>
          <Form.Item name="notes" label="Reason / Notes">
            <Input.TextArea rows={3} placeholder="Describe your concern or reason for visit..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PortalAppointmentsPage;
