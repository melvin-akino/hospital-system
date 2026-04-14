import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, InputNumber, Button, Card, Row, Col, Typography,
  Space, Table, Divider, Alert, Tag,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCreateBill } from '../../hooks/useBilling';
import { patientService } from '../../services/patientService';
import { serviceService } from '../../services/serviceService';
import type { Patient, Service } from '../../types';

const { Title, Text } = Typography;

const formatPeso = (v: number) => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

interface LineItem {
  key: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

const BillingFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const { mutate: createBill, isPending } = useCreateBill();

  const [patientOptions, setPatientOptions] = useState<Array<{ value: string; label: string; patient: Patient }>>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [serviceOptions, setServiceOptions] = useState<Array<{ value: string; label: string; service: Service }>>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { key: '1', description: '', quantity: 1, unitPrice: 0, discount: 0 },
  ]);

  useEffect(() => {
    const patientId = searchParams.get('patientId');
    if (patientId) {
      patientService.getById(patientId).then((res) => {
        if (res.data) {
          setSelectedPatient(res.data);
          form.setFieldValue('patientId', patientId);
          // Auto-apply senior/PWD discount
          if (res.data.isSenior) {
            form.setFieldsValue({ discountType: 'SENIOR', discountPercent: 20 });
          } else if (res.data.isPwd) {
            form.setFieldsValue({ discountType: 'PWD', discountPercent: 20 });
          }
        }
      });
    }

    serviceService.getAll({ limit: 200 }).then((res) => {
      setServiceOptions(
        (res.data || []).map((s: Service) => ({
          value: s.id,
          label: `${s.serviceCode} — ${s.serviceName} (₱${Number(s.basePrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })})`,
          service: s,
        }))
      );
    });
  }, [form, searchParams]);

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

  const handlePatientSelect = (value: string, option: { patient: Patient }) => {
    setSelectedPatient(option.patient);
    if (option.patient.isSenior) {
      form.setFieldsValue({ discountType: 'SENIOR', discountPercent: 20 });
    } else if (option.patient.isPwd) {
      form.setFieldsValue({ discountType: 'PWD', discountPercent: 20 });
    }
  };

  const handleServiceSelect = (key: string, serviceId: string, option: { service: Service }) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, serviceId, description: option.service.serviceName, unitPrice: Number(option.service.basePrice) }
          : item
      )
    );
  };

  const updateLineItem = (key: string, field: keyof LineItem, value: unknown) => {
    setLineItems((prev) => prev.map((item) => item.key === key ? { ...item, [field]: value } : item));
  };

  const removeLineItem = (key: string) => {
    setLineItems((prev) => prev.filter((item) => item.key !== key));
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { key: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  };

  const subtotal = lineItems.reduce((s, i) => s + i.unitPrice * i.quantity - i.discount, 0);
  const discountPercent = Form.useWatch('discountPercent', form) || 0;
  const philhealthDeduction = Form.useWatch('philhealthDeduction', form) || 0;
  const hmoDeduction = Form.useWatch('hmoDeduction', form) || 0;
  const discountAmount = (subtotal * discountPercent) / 100;
  const total = Math.max(0, subtotal - discountAmount - philhealthDeduction - hmoDeduction);

  const onFinish = (values: Record<string, unknown>) => {
    if (lineItems.length === 0) return;

    createBill(
      {
        ...values,
        items: lineItems.map((i) => ({
          serviceId: i.serviceId,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
        })),
      } as Parameters<typeof createBill>[0],
      {
        onSuccess: (res) => {
          if (res.data) navigate(`/billing/${(res.data as { id: string }).id}`);
        },
      }
    );
  };

  const lineItemColumns = [
    {
      title: 'Service', key: 'service', width: '35%',
      render: (_: unknown, row: LineItem) => (
        <Select showSearch filterOption={false} placeholder="Select service or type description"
          style={{ width: '100%' }} allowClear
          options={serviceOptions}
          onChange={(v, opt) => handleServiceSelect(row.key, v, opt as { service: Service })}
          onClear={() => updateLineItem(row.key, 'serviceId', undefined)}
        />
      ),
    },
    {
      title: 'Description', key: 'desc', width: '25%',
      render: (_: unknown, row: LineItem) => (
        <Input value={row.description} onChange={(e) => updateLineItem(row.key, 'description', e.target.value)} placeholder="Item description" />
      ),
    },
    {
      title: 'Qty', key: 'qty', width: '8%',
      render: (_: unknown, row: LineItem) => (
        <InputNumber min={1} value={row.quantity} onChange={(v) => updateLineItem(row.key, 'quantity', v || 1)} style={{ width: '100%' }} />
      ),
    },
    {
      title: 'Unit Price', key: 'price', width: '12%',
      render: (_: unknown, row: LineItem) => (
        <InputNumber min={0} value={row.unitPrice} onChange={(v) => updateLineItem(row.key, 'unitPrice', v || 0)} style={{ width: '100%' }} prefix="₱" />
      ),
    },
    {
      title: 'Discount', key: 'disc', width: '10%',
      render: (_: unknown, row: LineItem) => (
        <InputNumber min={0} value={row.discount} onChange={(v) => updateLineItem(row.key, 'discount', v || 0)} style={{ width: '100%' }} prefix="₱" />
      ),
    },
    {
      title: 'Total', key: 'total', width: '10%',
      render: (_: unknown, row: LineItem) => (
        <Text className="currency">{formatPeso(row.unitPrice * row.quantity - row.discount)}</Text>
      ),
    },
    {
      title: '', key: 'del', width: '5%',
      render: (_: unknown, row: LineItem) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeLineItem(row.key)} disabled={lineItems.length === 1} />
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={4} style={{ margin: 0 }}>New Bill</Title></Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ discountPercent: 0, philhealthDeduction: 0, hmoDeduction: 0 }}>
        <Card title="Patient & Bill Info" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="patientId" label="Patient" rules={[{ required: true }]}>
                <Select showSearch filterOption={false} onSearch={searchPatients} options={patientOptions}
                  onSelect={handlePatientSelect} placeholder="Search patient..." notFoundContent="Type to search" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              {selectedPatient && (
                <Space style={{ marginTop: 30 }}>
                  {selectedPatient.isSenior && <Tag color="gold">Senior Citizen — 20% Discount</Tag>}
                  {selectedPatient.isPwd && <Tag color="purple">PWD — 20% Discount</Tag>}
                  {selectedPatient.philhealthNo && <Tag color="green">PhilHealth: {selectedPatient.philhealthNo}</Tag>}
                </Space>
              )}
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title="Bill Items"
          extra={<Button icon={<PlusOutlined />} onClick={addLineItem}>Add Item</Button>}
          style={{ marginBottom: 16 }}
        >
          <Table dataSource={lineItems} columns={lineItemColumns} rowKey="key" pagination={false} size="small" />
        </Card>

        <Card title="Discounts & Totals" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="discountType" label="Discount Type">
                <Select allowClear options={['SENIOR', 'PWD', 'EMPLOYEE', 'HMO', 'PHILHEALTH', 'NONE'].map(v => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="discountPercent" label="Discount (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} suffix="%" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="philhealthDeduction" label="PhilHealth Deduction">
                <InputNumber min={0} style={{ width: '100%' }} prefix="₱" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="hmoDeduction" label="HMO Deduction">
                <InputNumber min={0} style={{ width: '100%' }} prefix="₱" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row justify="end">
            <Col xs={24} sm={10}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row justify="space-between"><Col>Subtotal:</Col><Col><Text className="currency">{formatPeso(subtotal)}</Text></Col></Row>
                {discountAmount > 0 && <Row justify="space-between"><Col>Discount ({discountPercent}%):</Col><Col><Text type="danger" className="currency">- {formatPeso(discountAmount)}</Text></Col></Row>}
                {philhealthDeduction > 0 && <Row justify="space-between"><Col>PhilHealth:</Col><Col><Text type="danger" className="currency">- {formatPeso(Number(philhealthDeduction))}</Text></Col></Row>}
                {hmoDeduction > 0 && <Row justify="space-between"><Col>HMO:</Col><Col><Text type="danger" className="currency">- {formatPeso(Number(hmoDeduction))}</Text></Col></Row>}
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between">
                  <Col><Text strong style={{ fontSize: 16 }}>TOTAL:</Text></Col>
                  <Col><Text strong style={{ fontSize: 18, color: '#1890ff' }}>{formatPeso(total)}</Text></Col>
                </Row>
              </Space>
            </Col>
          </Row>
        </Card>

        {lineItems.some((i) => !i.description) && (
          <Alert message="Please add a description for all bill items." type="warning" showIcon style={{ marginBottom: 16 }} />
        )}

        <Space>
          <Button type="primary" htmlType="submit" loading={isPending} size="large">Create Bill</Button>
          <Button size="large" onClick={() => navigate('/billing')}>Cancel</Button>
        </Space>
      </Form>
    </div>
  );
};

export default BillingFormPage;
