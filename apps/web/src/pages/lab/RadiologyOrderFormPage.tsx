import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Typography,
  Row,
  Col,
  AutoComplete,
  Tag,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCreateRadiologyOrder } from '../../hooks/useLab';
import { patientService } from '../../services/patientService';

const { Title } = Typography;
const { TextArea } = Input;

interface Patient {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
}

const RadiologyOrderFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string; patient: Patient }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const createOrder = useCreateRadiologyOrder();

  const handlePatientSearch = async (q: string) => {
    if (q.length < 2) return;
    const res = await patientService.search(q);
    const patients: Patient[] = res?.data || [];
    setPatientOptions(
      patients.map((p) => ({
        value: p.id,
        label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
        patient: p,
      }))
    );
  };

  const handlePatientSelect = (value: string, option: { value: string; label: string; patient: Patient }) => {
    setSelectedPatient(option.patient);
    form.setFieldValue('patientId', value);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    await createOrder.mutateAsync(values);
    navigate('/lab/radiology/new');
    form.resetFields();
    setSelectedPatient(null);
  };

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/lab/requisitions')} style={{ marginRight: 12 }}>
          Back
        </Button>
        <Title level={4} style={{ margin: 0 }}>New Radiology Order</Title>
      </Row>

      <Card style={{ maxWidth: 760 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="patientId" label="Patient" rules={[{ required: true, message: 'Please select a patient' }]}>
            <AutoComplete
              options={patientOptions}
              onSearch={handlePatientSearch}
              onSelect={handlePatientSelect}
              placeholder="Search patient by name or patient no..."
              style={{ width: '100%' }}
            />
          </Form.Item>
          {selectedPatient && (
            <div style={{ marginTop: -12, marginBottom: 12 }}>
              <Tag color="blue">
                Selected: {selectedPatient.lastName}, {selectedPatient.firstName} ({selectedPatient.patientNo})
              </Tag>
            </div>
          )}

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="modality" label="Modality" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'X-Ray', label: 'X-Ray' },
                    { value: 'CT', label: 'CT Scan' },
                    { value: 'MRI', label: 'MRI' },
                    { value: 'Ultrasound', label: 'Ultrasound' },
                    { value: 'Others', label: 'Others' },
                  ]}
                  placeholder="Select modality"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bodyPart" label="Body Part / Region">
                <Input placeholder="e.g. Chest, Abdomen, Head" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="clinicalHistory" label="Clinical History / Indication">
            <TextArea
              rows={3}
              placeholder="Relevant clinical findings, reason for exam..."
            />
          </Form.Item>

          <Form.Item name="orderedBy" label="Ordering Doctor">
            <Input placeholder="Doctor's name" />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Button style={{ marginRight: 8 }} onClick={() => navigate('/lab/requisitions')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={createOrder.isPending}>
              Submit Order
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RadiologyOrderFormPage;
