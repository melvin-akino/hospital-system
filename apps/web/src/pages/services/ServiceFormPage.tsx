import React, { useEffect } from 'react';
import { Form, Input, Select, InputNumber, Switch, Button, Card, Row, Col, Typography, Space, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useService, useCreateService, useUpdateService, useServiceCategories } from '../../hooks/useServices';

const { Title } = Typography;

const ServiceFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [form] = Form.useForm();

  const { data: serviceData, isLoading } = useService(id || '');
  const { mutate: createService, isPending: creating } = useCreateService();
  const { mutate: updateService, isPending: updating } = useUpdateService();
  const { data: categories } = useServiceCategories();

  useEffect(() => {
    if (serviceData?.data) form.setFieldsValue(serviceData.data);
  }, [serviceData, form]);

  const onFinish = (values: Record<string, unknown>) => {
    if (isEdit) {
      updateService({ id: id!, data: values }, { onSuccess: () => navigate('/services') });
    } else {
      createService(values, { onSuccess: () => navigate('/services') });
    }
  };

  if (isEdit && isLoading) return <div className="page-container"><Spin /></div>;

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={4} style={{ margin: 0 }}>{isEdit ? 'Edit Service' : 'Add Service'}</Title></Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isDiscountable: true, isActive: true }}>
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="serviceCode" label="Service Code" rules={[{ required: true }]}><Input placeholder="e.g. LAB-CBC" /></Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item name="serviceName" label="Service Name" rules={[{ required: true }]}><Input placeholder="e.g. Complete Blood Count (CBC)" /></Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="categoryId" label="Category">
                <Select allowClear options={(categories?.data || []).map((c: { id: string; name: string }) => ({ value: c.id, label: c.name }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="basePrice" label="Base Price (₱)" rules={[{ required: true }]}>
                <InputNumber min={0} step={50} style={{ width: '100%' }} prefix="₱" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="durationMinutes" label="Duration (minutes)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="isDiscountable" label="Discountable?" valuePropName="checked"><Switch /></Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="isActive" label="Active?" valuePropName="checked"><Switch /></Form.Item>
            </Col>
          </Row>
        </Card>

        <Space>
          <Button type="primary" htmlType="submit" loading={creating || updating} size="large">{isEdit ? 'Update' : 'Create'} Service</Button>
          <Button size="large" onClick={() => navigate('/services')}>Cancel</Button>
        </Space>
      </Form>
    </div>
  );
};

export default ServiceFormPage;
