import React, { useState } from 'react';
import {
  Card,
  Form,
  Select,
  Input,
  Button,
  Checkbox,
  Typography,
  Row,
  Col,
  Space,
  Divider,
  AutoComplete,
  Radio,
  Tag,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useLabTestTemplates, useCreateRequisition } from '../../hooks/useLab';
import { patientService } from '../../services/patientService';

const { Title } = Typography;
const { TextArea } = Input;

interface TestTemplate {
  code: string;
  name: string;
  category: string;
}

interface Patient {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
}

const LabOrderFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [customTests, setCustomTests] = useState<string[]>([]);
  const [customTestInput, setCustomTestInput] = useState('');
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string; patient: Patient }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { data: templatesData } = useLabTestTemplates();
  const createRequisition = useCreateRequisition();

  const templates: TestTemplate[] = templatesData?.data || [];

  const categorized = templates.reduce<Record<string, TestTemplate[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

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

  const toggleTest = (code: string) => {
    setSelectedTests((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const addCustomTest = () => {
    if (customTestInput.trim()) {
      setCustomTests((prev) => [...prev, customTestInput.trim()]);
      setCustomTestInput('');
    }
  };

  const removeCustomTest = (idx: number) => {
    setCustomTests((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const items: Array<{ testName: string; testCode?: string }> = [];

    selectedTests.forEach((code) => {
      const t = templates.find((t) => t.code === code);
      if (t) items.push({ testName: t.name, testCode: t.code });
    });

    customTests.forEach((name) => {
      items.push({ testName: name });
    });

    if (items.length === 0) {
      form.setFields([{ name: 'tests', errors: ['Please select at least one test'] }]);
      return;
    }

    await createRequisition.mutateAsync({ ...values, items });
    navigate('/lab/requisitions');
  };

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/lab/requisitions')} style={{ marginRight: 12 }}>
          Back
        </Button>
        <Title level={4} style={{ margin: 0 }}>New Lab Requisition</Title>
      </Row>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={16}>
            <Card title="Order Details" style={{ marginBottom: 16 }}>
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
                  <Tag color="blue">Selected: {selectedPatient.lastName}, {selectedPatient.firstName} ({selectedPatient.patientNo})</Tag>
                </div>
              )}
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="priority" label="Priority" initialValue="ROUTINE">
                    <Radio.Group>
                      <Radio.Button value="ROUTINE">Routine</Radio.Button>
                      <Radio.Button value="URGENT">Urgent</Radio.Button>
                      <Radio.Button value="STAT">STAT</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="orderedBy" label="Ordered By">
                    <Input placeholder="Doctor name" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={2} placeholder="Additional instructions..." />
              </Form.Item>
            </Card>

            <Card title="Select Tests">
              {Object.entries(categorized).map(([category, tests]) => (
                <div key={category} style={{ marginBottom: 16 }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8, color: '#1890ff' }}>
                    {category}
                  </Typography.Text>
                  <Row gutter={[8, 8]}>
                    {tests.map((t) => (
                      <Col key={t.code} span={12}>
                        <Checkbox
                          checked={selectedTests.includes(t.code)}
                          onChange={() => toggleTest(t.code)}
                        >
                          {t.name}
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                  <Divider style={{ margin: '12px 0' }} />
                </div>
              ))}

              <div>
                <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Custom Tests
                </Typography.Text>
                <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
                  <Input
                    value={customTestInput}
                    onChange={(e) => setCustomTestInput(e.target.value)}
                    placeholder="Enter custom test name"
                    onPressEnter={addCustomTest}
                  />
                  <Button icon={<PlusOutlined />} onClick={addCustomTest}>Add</Button>
                </Space.Compact>
                {customTests.map((t, i) => (
                  <Tag
                    key={i}
                    closable
                    onClose={() => removeCustomTest(i)}
                    style={{ marginBottom: 4 }}
                  >
                    {t}
                  </Tag>
                ))}
              </div>
            </Card>
          </Col>

          <Col span={8}>
            <Card title="Order Summary" style={{ position: 'sticky', top: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <Typography.Text strong>Selected Tests ({selectedTests.length + customTests.length})</Typography.Text>
                {selectedTests.length === 0 && customTests.length === 0 ? (
                  <div style={{ color: '#999', marginTop: 8 }}>No tests selected</div>
                ) : (
                  <ul style={{ paddingLeft: 16, marginTop: 8 }}>
                    {selectedTests.map((code) => {
                      const t = templates.find((t) => t.code === code);
                      return <li key={code}>{t?.name || code}</li>;
                    })}
                    {customTests.map((t, i) => (
                      <li key={`custom-${i}`}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
              <Button
                type="primary"
                block
                htmlType="submit"
                loading={createRequisition.isPending}
                disabled={selectedTests.length === 0 && customTests.length === 0}
              >
                Submit Requisition
              </Button>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default LabOrderFormPage;
