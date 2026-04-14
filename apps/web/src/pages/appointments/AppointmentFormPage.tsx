import React, { useState, useEffect } from 'react';
import {
  Card, Form, Button, DatePicker, Select, Input, InputNumber, Typography,
  Space, Row, Col, Tag, Spin, Alert,
} from 'antd';
import { ArrowLeftOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { usePatients } from '../../hooks/usePatients';
import { useDoctors } from '../../hooks/useDoctors';
import { useServices } from '../../hooks/useServices';
import {
  useCreateAppointment, useUpdateAppointment, useDoctorAvailability,
} from '../../hooks/useAppointments';
import { appointmentService } from '../../services/appointmentService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const AppointmentFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const prefillPatientId = searchParams.get('patientId');

  const [form] = Form.useForm();
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const { data: patientsData } = usePatients({ limit: '200' });
  const { data: doctorsData } = useDoctors({ limit: '100' });
  const { data: servicesData } = useServices({ limit: '200' });
  const { data: availability, isLoading: availLoading } = useDoctorAvailability(
    selectedDoctorId,
    selectedDate
  );
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();

  const patients = (patientsData as { data?: unknown[] })?.data || [];
  const doctors = (doctorsData as { data?: unknown[] })?.data || [];
  const services = (servicesData as { data?: unknown[] })?.data || [];

  useEffect(() => {
    if (prefillPatientId) {
      form.setFieldValue('patientId', prefillPatientId);
    }
    if (editId) {
      setEditLoading(true);
      appointmentService
        .getAppointment(editId)
        .then((appt) => {
          const d = dayjs(appt.scheduledAt);
          form.setFieldsValue({
            patientId: appt.patientId,
            doctorId: appt.doctorId,
            serviceId: appt.serviceId,
            date: d,
            duration: appt.duration,
            notes: appt.notes,
          });
          setSelectedDoctorId(appt.doctorId || '');
          setSelectedDate(d.format('YYYY-MM-DD'));
          setSelectedSlot(d.format('HH:mm'));
        })
        .finally(() => setEditLoading(false));
    }
  }, [editId, prefillPatientId, form]);

  const handleSubmit = async (values: {
    patientId: string;
    doctorId?: string;
    serviceId?: string;
    date: Dayjs;
    duration?: number;
    notes?: string;
  }) => {
    if (!selectedSlot && !editId) {
      return;
    }

    let scheduledAt: string;
    if (selectedSlot) {
      const [h, m] = selectedSlot.split(':');
      scheduledAt = values.date
        .hour(parseInt(h))
        .minute(parseInt(m))
        .second(0)
        .toISOString();
    } else {
      scheduledAt = values.date.toISOString();
    }

    const payload = {
      patientId: values.patientId,
      doctorId: values.doctorId,
      serviceId: values.serviceId,
      scheduledAt,
      duration: values.duration || 30,
      notes: values.notes,
    };

    if (editId) {
      await updateAppointment.mutateAsync({ id: editId, data: payload });
    } else {
      await createAppointment.mutateAsync(payload);
    }
    navigate('/appointments');
  };

  if (editLoading) return <div className="page-container"><Spin /></div>;

  return (
    <div className="page-container">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/appointments')}>
          Back
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          <CalendarOutlined /> {editId ? 'Edit Appointment' : 'Book Appointment'}
        </Title>
      </Space>

      <Card style={{ maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="patientId" label="Patient" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="Search patient..."
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={(patients as Array<{ id: string; firstName: string; lastName: string; patientNo: string }>).map((p) => ({
                    label: `${p.firstName} ${p.lastName} (${p.patientNo})`,
                    value: p.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="doctorId" label="Doctor">
                <Select
                  showSearch
                  placeholder="Select doctor (optional)"
                  allowClear
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={(v) => setSelectedDoctorId(v || '')}
                  options={(doctors as Array<{ id: string; firstName: string; lastName: string; specialization?: string }>).map((d) => ({
                    label: `Dr. ${d.firstName} ${d.lastName}${d.specialization ? ` — ${d.specialization}` : ''}`,
                    value: d.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker
                  style={{ width: '100%' }}
                  disabledDate={(d) => d.isBefore(dayjs().startOf('day'))}
                  onChange={(d) => {
                    setSelectedDate(d ? d.format('YYYY-MM-DD') : '');
                    setSelectedSlot('');
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="duration" label="Duration (minutes)">
                <InputNumber min={15} max={180} step={15} defaultValue={30} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {selectedDoctorId && selectedDate && (
            <Form.Item label="Available Time Slots" required={!editId}>
              {availLoading ? (
                <Spin size="small" />
              ) : availability ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {availability.allSlots.map((slot) => {
                    const isBooked = availability.bookedSlots.includes(slot);
                    const isSelected = selectedSlot === slot;
                    return (
                      <Tag
                        key={slot}
                        color={isSelected ? 'blue' : isBooked ? 'red' : 'green'}
                        style={{
                          cursor: isBooked ? 'not-allowed' : 'pointer',
                          padding: '4px 10px',
                          fontSize: 13,
                          opacity: isBooked ? 0.5 : 1,
                        }}
                        onClick={() => {
                          if (!isBooked) setSelectedSlot(slot);
                        }}
                      >
                        {slot}
                      </Tag>
                    );
                  })}
                </div>
              ) : (
                <Text type="secondary">Select a doctor and date to see slots</Text>
              )}
              {!editId && !selectedSlot && selectedDate && (
                <Alert
                  message="Please select a time slot"
                  type="warning"
                  style={{ marginTop: 8 }}
                  banner
                />
              )}
            </Form.Item>
          )}

          <Form.Item name="serviceId" label="Service / Reason (optional)">
            <Select
              showSearch
              placeholder="Select service (optional)"
              allowClear
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              options={(services as Array<{ id: string; name: string; category?: string }>).map((s) => ({
                label: `${s.name}${s.category ? ` — ${s.category}` : ''}`,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Additional notes..." />
          </Form.Item>

          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={createAppointment.isPending || updateAppointment.isPending}
              disabled={!editId && !!selectedDoctorId && !!selectedDate && !selectedSlot}
            >
              {editId ? 'Update Appointment' : 'Book Appointment'}
            </Button>
            <Button onClick={() => navigate('/appointments')}>Cancel</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default AppointmentFormPage;
