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
  InputNumber,
  Alert,
  Space,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useCreateHmoClaim, usePatientHmo } from '../../hooks/useHMO';
import { patientService } from '../../services/patientService';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface HmoRegistration {
  id: string;
  memberNo: string;
  plan?: string;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  hmoCompany?: { id: string; name: string; code: string };
}

interface Patient {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
}

const HMOClaimFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string; patient: Patient }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedRegId, setSelectedRegId] = useState('');

  const createClaim = useCreateHmoClaim();
  const { data: hmoData } = usePatientHmo(selectedPatientId);

  const registrations: HmoRegistration[] = hmoData?.data || [];
  const activeRegistrations = registrations.filter((r) => r.isActive && (!r.validUntil || dayjs(r.validUntil).isAfter(dayjs())));

  const selectedReg = registrations.find((r) => r.id === selectedRegId);

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
    setSelectedPatientId(value);
    setSelectedRegId('');
    form.setFieldValue('patientId', value);
    form.setFieldValue('hmoRegistrationId', undefined);
    form.setFieldValue('hmoCompanyId', undefined);
  };

  const handleRegSelect = (value: string) => {
    setSelectedRegId(value);
    const reg = registrations.find((r) => r.id === value);
    if (reg?.hmoCompany) {
      form.setFieldValue('hmoCompanyId', reg.hmoCompany.id);
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    await createClaim.mutateAsync({
      patientId: selectedPatientId,
      hmoCompanyId: values['hmoCompanyId'],
      billId: values['billId'] || undefined,
      amount: values['amount'],
      notes: values['notes'] || undefined,
    });
    navigate('/hmo/claims');
  };

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hmo/claims')} style={{ marginRight: 12 }}>
          Back
        </Button>
        <Title level={4} style={{ margin: 0 }}>Create HMO Claim</Title>
      </Row>

      <Card style={{ maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="patientId" label="Patient" rules={[{ required: true, message: 'Please select a patient' }]}>
            <AutoComplete
              options={patientOptions}
              onSearch={handlePatientSearch}
              onSelect={handlePatientSelect}
              placeholder="Search patient..."
              style={{ width: '100%' }}
            />
          </Form.Item>
          {selectedPatient && (
            <div style={{ marginTop: -12, marginBottom: 12 }}>
              <Tag color="blue">{selectedPatient.lastName}, {selectedPatient.firstName} ({selectedPatient.patientNo})</Tag>
            </div>
          )}

          {selectedPatientId && activeRegistrations.length === 0 && (
            <Alert
              type="warning"
              message="This patient has no active HMO registrations"
              style={{ marginBottom: 12 }}
            />
          )}

          {selectedPatientId && activeRegistrations.length > 0 && (
            <Form.Item name="hmoRegistrationId" label="HMO Registration">
              <Select
                placeholder="Select HMO registration"
                onChange={handleRegSelect}
                options={activeRegistrations.map((r) => ({
                  value: r.id,
                  label: `${r.hmoCompany?.name} — Member: ${r.memberNo}${r.plan ? ` (${r.plan})` : ''}`,
                }))}
              />
            </Form.Item>
          )}

          {selectedReg && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">Company: <Text strong>{selectedReg.hmoCompany?.name}</Text></Text>
                <Text type="secondary">Member No: <Text strong>{selectedReg.memberNo}</Text></Text>
                {selectedReg.validUntil && (
                  <Text type="secondary">Valid Until: <Text strong>{dayjs(selectedReg.validUntil).format('MMM D, YYYY')}</Text></Text>
                )}
              </Space>
            </div>
          )}

          {/* Hidden field for hmoCompanyId */}
          <Form.Item name="hmoCompanyId" hidden>
            <Input />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="billId" label="Bill Number (optional)">
                <Input placeholder="Search or enter bill #" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="amount" label="Claim Amount (₱)" rules={[{ required: true }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  formatter={(v) => `₱ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/₱\s?|(,*)/g, '') as unknown as number}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Claim details, supporting information..." />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Button style={{ marginRight: 8 }} onClick={() => navigate('/hmo/claims')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={createClaim.isPending}>
              Submit Claim
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default HMOClaimFormPage;
