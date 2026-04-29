import React, { useState } from 'react';
import {
  Card, Form, Input, Select, Button, Typography, Row, Col, Space, AutoComplete, Spin, DatePicker, Divider, Alert,
} from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useScheduleSurgery } from '../../hooks/useOR';
import api from '../../lib/api';

const { Title, Text } = Typography;

const OR_ROOMS = ['OR-1', 'OR-2', 'OR-3', 'OR-4', 'OR-5', 'Minor-OR', 'Emergency-OR'];

const SurgeryFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillAdmissionId = searchParams.get('admissionId');

  const [form] = Form.useForm();
  const [patientOptions, setPatientOptions] = useState<any[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [doctorOptions, setDoctorOptions] = useState<any[]>([]);
  const [doctorSearching, setDoctorSearching] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>(prefillAdmissionId || '');
  const [admissionSearch, setAdmissionSearch] = useState('');

  const scheduleSurgery = useScheduleSurgery();

  // Pre-fill from admission if provided
  const { data: prefillAdmission } = useQuery({
    queryKey: ['admission-prefill', prefillAdmissionId],
    queryFn: () => api.get(`/admissions/${prefillAdmissionId}`).then((r) => r.data?.data),
    enabled: !!prefillAdmissionId,
    onSuccess: (data: any) => {
      if (data) {
        setSelectedPatientId(data.patientId);
        setSelectedAdmissionId(data.id);
        form.setFieldsValue({
          patientDisplay: `${data.patient?.lastName}, ${data.patient?.firstName} (${data.patient?.patientNo})`,
          admissionDisplay: `${data.admissionNo} — ${data.patient?.lastName}, ${data.patient?.firstName}`,
        });
        if (data.attendingDoctor) {
          form.setFieldsValue({ surgeon: data.attendingDoctor });
        }
      }
    },
  } as any);

  // Admitted patients search for admission linking
  const { data: admissionsData, isLoading: admissionsLoading } = useQuery({
    queryKey: ['admissions-search-or', admissionSearch],
    queryFn: () =>
      api.get('/admissions', { params: { status: 'ADMITTED', search: admissionSearch || undefined, limit: 10 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    enabled: admissionSearch.length >= 2,
  });

  const admissionOptions = (admissionsData || []).map((a: any) => ({
    value: `${a.admissionNo} — ${a.patient?.lastName}, ${a.patient?.firstName}`,
    label: (
      <Space direction="vertical" size={0}>
        <Text strong>{a.patient?.lastName}, {a.patient?.firstName}</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>{a.admissionNo} · {a.diagnosis || a.chiefComplaint || 'No diagnosis'}</Text>
      </Space>
    ),
    admissionId: a.id,
    patientId: a.patientId,
    patient: a.patient,
    attendingDoctor: a.attendingDoctor,
  }));

  const searchPatients = async (value: string) => {
    if (value.length < 2) return;
    setPatientSearching(true);
    try {
      const res = await api.get('/patients', { params: { search: value, limit: 10 } });
      setPatientOptions(
        (res.data?.data || []).map((p: any) => ({
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
        (res.data?.data || []).map((d: any) => ({
          value: `Dr. ${d.lastName}, ${d.firstName}`,
          label: `Dr. ${d.lastName}, ${d.firstName} — ${d.specialty}`,
          id: d.id,
        }))
      );
    } finally {
      setDoctorSearching(false);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!selectedPatientId) {
      form.setFields([{ name: 'patientDisplay', errors: ['Please select a patient'] }]);
      return;
    }
    await scheduleSurgery.mutateAsync({
      patientId: selectedPatientId,
      admissionId: selectedAdmissionId || undefined,
      surgeonId: selectedDoctorId || undefined,
      procedure: values.procedure,
      scheduledAt: values.scheduledAt.toISOString(),
      duration: values.duration ? Number(values.duration) : undefined,
      orRoom: values.orRoom,
      anesthesiaType: values.anesthesiaType,
      anesthesiologist: values.anesthesiologist,
      scrubNurse: values.scrubNurse,
      circulatingNurse: values.circulatingNurse,
      preOpNotes: values.preOpNotes,
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

          {/* ── Admission Linking ───────────────────────────── */}
          <Divider orientation="left">Link to Admission (optional but recommended)</Divider>
          <Alert
            showIcon
            type="info"
            message="Linking to an admission automatically pulls the patient and will associate this surgery with the patient's hospital stay and bill."
            style={{ marginBottom: 16 }}
          />
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Search by Admission # or Patient Name" name="admissionDisplay">
                <AutoComplete
                  options={admissionOptions}
                  onSearch={(v) => setAdmissionSearch(v)}
                  onSelect={(_v: string, opt: any) => {
                    setSelectedAdmissionId(opt.admissionId);
                    setSelectedPatientId(opt.patientId);
                    form.setFieldsValue({
                      patientDisplay: `${opt.patient?.lastName}, ${opt.patient?.firstName} (${opt.patient?.patientNo})`,
                    });
                    if (opt.attendingDoctor) {
                      form.setFieldsValue({ surgeonName: opt.attendingDoctor });
                    }
                  }}
                  placeholder="Type admission # or patient name..."
                  notFoundContent={admissionsLoading ? <Spin size="small" /> : admissionSearch.length >= 2 ? 'No admitted patients found' : 'Type at least 2 characters'}
                />
              </Form.Item>
            </Col>
            {selectedAdmissionId && (
              <Col xs={24} md={12}>
                <Form.Item label="Linked Admission">
                  <Text type="success" strong>✓ Linked to admission</Text>
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => {
                      setSelectedAdmissionId('');
                      form.setFieldValue('admissionDisplay', '');
                    }}
                  >
                    Remove link
                  </Button>
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* ── Patient ─────────────────────────────────────── */}
          <Divider orientation="left">Patient</Divider>
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
                  onSelect={(_v: string, opt: any) => setSelectedPatientId(opt.id)}
                  placeholder="Search patient name or number..."
                  notFoundContent={patientSearching ? <Spin size="small" /> : 'No patients found'}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Procedure ───────────────────────────────────── */}
          <Divider orientation="left">Procedure Details</Divider>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Surgical Procedure"
                name="procedure"
                rules={[{ required: true, message: 'Please enter the procedure' }]}
              >
                <Input placeholder="e.g., Appendectomy, Cholecystectomy, ORIF Femur..." />
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
          </Row>

          {/* ── Surgical Team ───────────────────────────────── */}
          <Divider orientation="left">Surgical Team</Divider>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Surgeon" name="surgeonDisplay">
                <AutoComplete
                  options={doctorOptions}
                  onSearch={searchDoctors}
                  onSelect={(_v: string, opt: any) => setSelectedDoctorId(opt.id)}
                  placeholder="Search surgeon..."
                  notFoundContent={doctorSearching ? <Spin size="small" /> : 'No doctors found'}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Anesthesiologist" name="anesthesiologist">
                <Input placeholder="Name of anesthesiologist..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Anesthesia Type" name="anesthesiaType">
                <Select
                  allowClear
                  placeholder="Select anesthesia type"
                  options={[
                    { value: 'GENERAL', label: 'General Anesthesia' },
                    { value: 'SPINAL', label: 'Spinal Anesthesia' },
                    { value: 'EPIDURAL', label: 'Epidural Anesthesia' },
                    { value: 'REGIONAL', label: 'Regional Block' },
                    { value: 'LOCAL', label: 'Local Anesthesia' },
                    { value: 'MAC', label: 'MAC — Monitored Anesthesia Care' },
                    { value: 'SEDATION', label: 'IV Sedation' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Scrub Nurse" name="scrubNurse">
                <Input placeholder="Scrub nurse name..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Circulating Nurse" name="circulatingNurse">
                <Input placeholder="Circulating nurse name..." />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Notes ───────────────────────────────────────── */}
          <Divider orientation="left">Notes</Divider>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Pre-Operative Notes" name="preOpNotes">
                <Input.TextArea rows={3} placeholder="Pre-op instructions, patient prep, allergies, risk factors..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Additional Notes" name="notes">
                <Input.TextArea rows={3} placeholder="Special equipment needed, implants, blood products..." />
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
