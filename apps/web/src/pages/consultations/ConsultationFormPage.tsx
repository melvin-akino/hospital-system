import React, { useEffect, useState } from 'react';
import { Form, Input, Select, DatePicker, Button, Card, Row, Col, Typography, Space, Spin, AutoComplete } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useConsultation, useCreateConsultation, useUpdateConsultation } from '../../hooks/useConsultations';
import { patientService } from '../../services/patientService';
import { doctorService } from '../../services/doctorService';
import type { Patient, Doctor } from '../../types';

const { Title } = Typography;

const ConsultationFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const [form] = Form.useForm();

  const { data: consultationData, isLoading } = useConsultation(id || '');
  const { mutate: create, isPending: creating } = useCreateConsultation();
  const { mutate: update, isPending: updating } = useUpdateConsultation();

  const [patientOptions, setPatientOptions] = useState<Array<{ value: string; label: string; patient: Patient }>>([]);
  const [doctorOptions, setDoctorOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    // Pre-fill from query param
    const patientId = searchParams.get('patientId');
    if (patientId) {
      form.setFieldValue('patientId', patientId);
    }

    // Load doctors
    doctorService.getAll({ limit: 100 }).then((res) => {
      setDoctorOptions(
        (res.data || []).map((d: Doctor) => ({
          value: d.id,
          label: `Dr. ${d.lastName}, ${d.firstName} — ${d.specialty}`,
        }))
      );
    });
  }, [form, searchParams]);

  useEffect(() => {
    if (consultationData?.data) {
      const c = consultationData.data;
      form.setFieldsValue({
        ...c,
        scheduledAt: dayjs(c.scheduledAt),
      });
    }
  }, [consultationData, form]);

  const searchPatients = async (q: string) => {
    if (q.length < 2) return;
    const res = await patientService.search(q);
    setPatientOptions(
      (res.data || []).map((p: Patient) => ({
        value: p.id,
        label: `${p.patientNo} — ${p.lastName}, ${p.firstName}`,
        patient: p,
      }))
    );
  };

  const onFinish = (values: Record<string, unknown>) => {
    const data = {
      ...values,
      scheduledAt: (values['scheduledAt'] as dayjs.Dayjs).toISOString(),
    };

    if (isEdit) {
      update({ id: id!, data }, { onSuccess: () => navigate(`/consultations/${id}`) });
    } else {
      create(data, {
        onSuccess: (res) => {
          if (res.data) navigate(`/consultations/${(res.data as { id: string }).id}`);
        },
      });
    }
  };

  if (isEdit && isLoading) return <div className="page-container"><Spin /></div>;

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={4} style={{ margin: 0 }}>{isEdit ? 'Edit Consultation' : 'New Consultation'}</Title></Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ consultationType: 'OPD', icdCodes: [] }}>
        <Card title="Consultation Details" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="patientId" label="Patient" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="Search patient..."
                  filterOption={false}
                  onSearch={searchPatients}
                  options={patientOptions}
                  notFoundContent="Type to search patients"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="doctorId" label="Doctor" rules={[{ required: true }]}>
                <Select showSearch filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())} options={doctorOptions} placeholder="Select doctor" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="consultationType" label="Type" rules={[{ required: true }]}>
                <Select options={['OPD', 'ER', 'IPD', 'TELE'].map(v => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item name="scheduledAt" label="Schedule Date & Time" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Clinical Notes" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item name="chiefComplaint" label="Chief Complaint">
                <Input.TextArea rows={2} placeholder="Patient's chief complaint..." />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="findings" label="Physical Examination Findings">
                <Input.TextArea rows={3} placeholder="Findings on physical examination..." />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="assessment" label="Assessment / Diagnosis">
                <Input.TextArea rows={2} placeholder="Clinical assessment and diagnosis..." />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="treatmentPlan" label="Treatment Plan / Management">
                <Input.TextArea rows={3} placeholder="Treatment plan, orders, recommendations..." />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="icdCodes" label="ICD-10 Codes">
                <Select mode="tags" placeholder="Enter ICD-10 codes e.g. J18.0" tokenSeparators={[',']} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Space>
          <Button type="primary" htmlType="submit" loading={creating || updating} size="large">
            {isEdit ? 'Update' : 'Schedule'} Consultation
          </Button>
          <Button size="large" onClick={() => navigate('/consultations')}>Cancel</Button>
        </Space>
      </Form>
    </div>
  );
};

export default ConsultationFormPage;
