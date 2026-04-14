import React, { useState, useRef } from 'react';
import {
  Form, Button, Typography, Row, Col, Card, Input, Select, DatePicker, Modal, Space, AutoComplete,
} from 'antd';
import { ArrowLeftOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { useBookSession } from '../../hooks/useTelemedicine';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface DoctorOption {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
}

interface PatientOption {
  id: string;
  firstName: string;
  lastName: string;
  patientNo: string;
}

const TelemedicineBookingPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { mutateAsync: bookSession, isPending } = useBookSession();

  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string; patientId: string }[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [successModal, setSuccessModal] = useState(false);
  const [bookedRoomCode, setBookedRoomCode] = useState('');
  const [bookedSessionId, setBookedSessionId] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    api.get('/doctors').then(r => {
      const list: DoctorOption[] = r.data?.data || r.data || [];
      setDoctorOptions(list);
    }).catch(() => {});
  }, []);

  const handlePatientSearch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!value || value.length < 2) { setPatientOptions([]); return; }
      try {
        const res = await api.get('/patients/search', { params: { q: value } });
        const list: PatientOption[] = res.data?.data || res.data || [];
        setPatientOptions(list.map(p => ({
          value: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
          label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
          patientId: p.id,
        })));
      } catch {
        setPatientOptions([]);
      }
    }, 300);
  };

  const handlePatientSelect = (_: string, option: { patientId: string }) => {
    setSelectedPatientId(option.patientId);
  };

  const handleSubmit = async (values: {
    doctorId: string;
    scheduledAt: dayjs.Dayjs;
    notes?: string;
  }) => {
    const result = await bookSession({
      patientId: selectedPatientId,
      doctorId: values.doctorId,
      scheduledAt: values.scheduledAt.toISOString(),
      notes: values.notes,
    });
    setBookedRoomCode(result?.roomCode || '');
    setBookedSessionId(result?.id || '');
    setSuccessModal(true);
  };

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/telemedicine')} />
            <Title level={4} style={{ margin: 0 }}>Book Telemedicine Session</Title>
          </Space>
        </Col>
      </Row>

      <Card style={{ maxWidth: 640 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Patient" name="patientSearch" rules={[{ required: true, message: 'Please select a patient' }]}>
            <AutoComplete
              options={patientOptions}
              onSearch={handlePatientSearch}
              onSelect={handlePatientSelect}
              placeholder="Search patient by name or patient number..."
              allowClear
            />
          </Form.Item>

          <Form.Item label="Doctor" name="doctorId" rules={[{ required: true, message: 'Please select a doctor' }]}>
            <Select
              placeholder="Select doctor"
              showSearch
              optionFilterProp="label"
              options={doctorOptions.map(d => ({
                value: d.id,
                label: `Dr. ${d.lastName}, ${d.firstName} — ${d.specialty}`,
              }))}
            />
          </Form.Item>

          <Form.Item label="Date & Time" name="scheduledAt" rules={[{ required: true, message: 'Please select date and time' }]}>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              disabledDate={d => d && d.isBefore(dayjs().startOf('day'))}
            />
          </Form.Item>

          <Form.Item label="Notes (Optional)" name="notes">
            <TextArea rows={3} placeholder="Chief complaint or consultation notes..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<VideoCameraOutlined />} loading={isPending}>
                Book Session
              </Button>
              <Button onClick={() => navigate('/telemedicine')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        open={successModal}
        title="Session Booked Successfully"
        onOk={() => { setSuccessModal(false); navigate('/telemedicine'); }}
        onCancel={() => { setSuccessModal(false); navigate('/telemedicine'); }}
        okText="Go to Schedule"
        cancelText="Stay Here"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text>Your telemedicine session has been booked. Share the room code with the other party.</Text>
          <div style={{ textAlign: 'center', padding: '16px', background: '#f5f5f5', borderRadius: 8 }}>
            <Text type="secondary">Room Code</Text>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 4, marginTop: 4 }}>
              {bookedRoomCode}
            </div>
          </div>
          {bookedSessionId && (
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              block
              onClick={() => navigate(`/telemedicine/call/${bookedRoomCode}?sessionId=${bookedSessionId}`)}
            >
              Join Call Now
            </Button>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default TelemedicineBookingPage;
