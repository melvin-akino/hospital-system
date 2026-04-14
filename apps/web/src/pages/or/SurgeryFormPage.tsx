import React, { useState } from 'react';
import {
  Card, Form, Input, Select, Button, Typography, Row, Col, Space, AutoComplete, Spin, DatePicker,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useScheduleSurgery } from '../../hooks/useOR';
import api from '../../lib/api';

const { Title } = Typography;

interface PatientOption {
  value: string;
  label: string;
  id: string;
}

interface DoctorOption {
  value: string;
  label: string;
  id: string;
}

const OR_ROOMS = ['OR-1', 'OR-2', 'OR-3', 'OR-4'];

const SurgeryFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [doctorSearching, setDoctorSearching] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  const scheduleSurgery = useScheduleSurgery();

  const searchPatients = async (value: string) => {
    if (value.length < 2) return;
    setPatientSearching(true);
    try {
      const res = await api.get('/patients', { params: { search: value, limit: 10 } });
      setPatientOptions(
        (res.data?.data || []).map((p: { id: string; firstName: string; lastName: string; patientNo: string }) => ({
          value: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
          label: `${p.lastName}, ${p.firstName} — ${p.patientNo}`,
          id: p.id,
        }))
      );
    } finally {
      setPatientSearching(false);
    }
  };

  const searchDoctors = async (value: string) => {
    if (value.length < 2) return;
    setDoctorSearching(true);
    try {
      const res = await api.get('/doctors', { params: { search: value, limit: 10 } });
      setDoctorOptions(
        (res.data?.data || []).map((d: { id: string; firstName: string; lastName: string; specialty: string }) => ({
          value: `Dr. ${d.lastName}, ${d.firstName} (${d.specialty})`,
          label: `Dr. ${d.lastName}, ${d.firstName} — ${d.specialty}`,
          id: d.id,
        }))
      );
    } finally {
      setDoctorSearching(false);
    }
  };

  const handleSubmit = async (values: {
    patientDisplay: string;
    surgeonDisplay: string;
    procedure: string;
    scheduledAt: dayjs.Dayjs;
    duration?: number;
    orRoom?: string;
    notes?: string;
  }) => {
    if (!selectedPatientId) {
      form.setFields([{ name: 'patientDisplay', errors: ['Please select a patient'] }]);
      return;
    }
    await scheduleSurgery.mutateAsync({
      patientId: selectedPatientId,
      surgeonId: selectedDoctorId || undefined,
      procedure: values.procedure,
      scheduledAt: values.scheduledAt.toISOString(),
      duration: values.duration,
      orRoom: values.orRoom,
      notes: values.notes,
    });
    navigate('/or/schedule');
  };

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/or/schedule')} style={{ marginRight: 12 }} />
          <Title level={4} style={{ margin: 0, display: 'inline' }}>Schedule Surgery</Title>
        </Col>
      </Row>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Patient"
                name="patientDisplay"
                rules={[{ required: true, message: 'Please select a patient' }]}
              >
                <AutoComplete
                  options={patientOptions}
                  onSearch={searchPatients}
                  onSelect={(_v, opt: PatientOption) => setSelectedPatientId(opt.id)}
                  placeholder="Search patient..."
                  notFoundContent={patientSearching ? <Spin size="small" /> : 'No patients found'}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Surgeon" name="surgeonDisplay">
                <AutoComplete
                  options={doctorOptions}
                  onSearch={searchDoctors}
                  onSelect={(_v, opt: DoctorOption) => setSelectedDoctorId(opt.id)}
                  placeholder="Search surgeon..."
                  notFoundContent={doctorSearching ? <Spin size="small" /> : 'No doctors found'}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Procedure"
                name="procedure"
                rules={[{ required: true, message: 'Please enter the procedure' }]}
              >
                <Input placeholder="e.g., Appendectomy, Cholecystectomy..." />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Scheduled Date & Time"
                name="scheduledAt"
                rules={[{ required: true, message: 'Please select date and time' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="MMMM D, YYYY h:mm A" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Duration (minutes)" name="duration">
                <Input type="number" min={15} placeholder="e.g., 120" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="OR Room" name="orRoom">
                <Select
                  placeholder="Select OR Room"
                  allowClear
                  options={OR_ROOMS.map(r => ({ value: r, label: r }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={3} placeholder="Pre-operative notes, special requirements..." />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={scheduleSurgery.isPending}>
              Schedule Surgery
            </Button>
            <Button onClick={() => navigate('/or/schedule')}>Cancel</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default SurgeryFormPage;
