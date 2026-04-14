import React, { useEffect } from 'react';
import { Form, Input, Select, InputNumber, Button, Card, Row, Col, Typography, Space, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useDoctor, useCreateDoctor, useUpdateDoctor } from '../../hooks/useDoctors';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { Department } from '../../types';

const { Title } = Typography;

const DoctorFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [form] = Form.useForm();

  const { data: doctorData, isLoading } = useDoctor(id || '');
  const { mutate: createDoctor, isPending: creating } = useCreateDoctor();
  const { mutate: updateDoctor, isPending: updating } = useUpdateDoctor();

  const { data: depts } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get<{ data: Department[] }>('/departments');
      return res.data;
    },
  });

  useEffect(() => {
    if (doctorData?.data) form.setFieldsValue(doctorData.data);
  }, [doctorData, form]);

  const onFinish = (values: Record<string, unknown>) => {
    if (isEdit) {
      updateDoctor({ id: id!, data: values }, { onSuccess: () => navigate(`/doctors/${id}`) });
    } else {
      createDoctor(values, {
        onSuccess: (res) => {
          if (res.data) navigate(`/doctors/${(res.data as { id: string }).id}`);
        },
      });
    }
  };

  if (isEdit && isLoading) return <div className="page-container"><Spin /></div>;

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={4} style={{ margin: 0 }}>{isEdit ? 'Edit Doctor' : 'Add Doctor'}</Title></Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Card title="Personal Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="middleName" label="Middle Name"><Input /></Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Phone"><Input /></Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Professional Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="licenseNo" label="PRC License No." rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="prcExpiryDate" label="PRC Expiry Date"><Input type="date" /></Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="specialty" label="Specialty" rules={[{ required: true }]}>
                <Select showSearch options={['Internal Medicine','Pediatrics','Surgery','OB-GYN','Cardiology','Neurology','Orthopedics','Dermatology','Psychiatry','Radiology','Anesthesiology','Emergency Medicine','Family Medicine','Ophthalmology','ENT','Urology','Pulmonology','Nephrology','Endocrinology','Oncology'].map(v => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="subspecialty" label="Subspecialty"><Input /></Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="departmentId" label="Department">
                <Select allowClear options={(depts?.data || []).map((d: Department) => ({ value: d.id, label: d.name }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="consultingFee" label="Consulting Fee (₱)" rules={[{ required: true }]}>
                <InputNumber min={0} step={100} style={{ width: '100%' }} prefix="₱" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="bio" label="Bio / Notes"><Input.TextArea rows={3} /></Form.Item>
            </Col>
          </Row>
        </Card>

        <Space>
          <Button type="primary" htmlType="submit" loading={creating || updating} size="large">{isEdit ? 'Update Doctor' : 'Add Doctor'}</Button>
          <Button size="large" onClick={() => navigate('/doctors')}>Cancel</Button>
        </Space>
      </Form>
    </div>
  );
};

export default DoctorFormPage;
