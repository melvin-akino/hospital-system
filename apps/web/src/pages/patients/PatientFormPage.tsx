import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  Space,
  Spin,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { usePatient, useCreatePatient, useUpdatePatient } from '../../hooks/usePatients';

const { Title } = Typography;

const PatientFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [form] = Form.useForm();

  const { data: patientData, isLoading } = usePatient(id || '');
  const { mutate: createPatient, isPending: creating } = useCreatePatient();
  const { mutate: updatePatient, isPending: updating } = useUpdatePatient();

  useEffect(() => {
    if (patientData?.data) {
      const p = patientData.data;
      form.setFieldsValue({
        ...p,
        dateOfBirth: dayjs(p.dateOfBirth),
      });
    }
  }, [patientData, form]);

  const onFinish = (values: Record<string, unknown>) => {
    const data = {
      ...values,
      dateOfBirth: (values['dateOfBirth'] as dayjs.Dayjs).format('YYYY-MM-DD'),
    };

    if (isEdit) {
      updatePatient(
        { id: id!, data },
        { onSuccess: () => navigate(`/patients/${id}`) }
      );
    } else {
      createPatient(data, {
        onSuccess: (res) => {
          if (res.data) navigate(`/patients/${(res.data as { id: string }).id}`);
        },
      });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="page-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {isEdit ? 'Edit Patient' : 'New Patient'}
          </Title>
        </Col>
      </Row>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ nationality: 'Filipino', isSenior: false, isPwd: false }}
      >
        <Card title="Personal Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                <Input placeholder="Juan" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="middleName" label="Middle Name">
                <Input placeholder="Dela" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                <Input placeholder="Cruz" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'MALE', label: 'Male' },
                    { value: 'FEMALE', label: 'Female' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="bloodType" label="Blood Type">
                <Select
                  allowClear
                  options={[
                    'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
                    'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE',
                  ].map((v) => ({ value: v, label: v.replace('_', ' ').replace('POSITIVE', '+').replace('NEGATIVE', '-') }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="civilStatus" label="Civil Status">
                <Select
                  allowClear
                  options={['Single', 'Married', 'Widowed', 'Separated', 'Annulled'].map((v) => ({
                    value: v,
                    label: v,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="nationality" label="Nationality">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="religion" label="Religion">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Contact Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="09XX-XXX-XXXX" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Invalid email' }]}
              >
                <Input placeholder="email@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="address" label="Address">
                <Input placeholder="Street address" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="city" label="City / Municipality">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="province" label="Province">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="zipCode" label="ZIP Code">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Emergency Contact" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="emergencyContact" label="Emergency Contact Name">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="emergencyPhone" label="Emergency Contact Phone">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Discount & Benefits" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item name="isSenior" label="Senior Citizen (RA 9994)" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="isPwd" label="PWD (RA 10754)" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="seniorIdNo" label="Senior Citizen ID No.">
                <Input placeholder="SC-YYYY-XXXXXXX" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="pwdIdNo" label="PWD ID No.">
                <Input placeholder="PWD-YYYY-XXXXXXX" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="philhealthNo" label="PhilHealth No.">
                <Input placeholder="PH-XX-XXXXXXXXX-X" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Notes" style={{ marginBottom: 24 }}>
          <Form.Item name="notes">
            <Input.TextArea rows={3} placeholder="Additional notes..." />
          </Form.Item>
        </Card>

        <Divider />

        <Space>
          <Button type="primary" htmlType="submit" loading={creating || updating} size="large">
            {isEdit ? 'Update Patient' : 'Create Patient'}
          </Button>
          <Button size="large" onClick={() => navigate('/patients')}>
            Cancel
          </Button>
        </Space>
      </Form>
    </div>
  );
};

export default PatientFormPage;
