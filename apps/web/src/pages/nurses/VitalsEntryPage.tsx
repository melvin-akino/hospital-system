import React, { useState, useEffect, useRef } from 'react';
import {
  Form, InputNumber, Button, Typography, Row, Col, Card, AutoComplete,
  Alert, Space, Tag, Input,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { useRecordVitals } from '../../hooks/useNurse';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  roomNo?: string;
  allergies?: string[];
}

interface PatientSearchOption {
  id: string;
  firstName: string;
  lastName: string;
  patientNo: string;
}

interface VitalsValues {
  temperature?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  o2Saturation?: number;
  weight?: number;
  height?: number;
  notes?: string;
}

interface AbnormalEntry {
  label: string;
  value: number;
  hint: string;
}

const isAbnormal = (key: keyof VitalsValues, val: number): boolean => {
  if (key === 'temperature') return val < 36 || val > 38.5;
  if (key === 'bpSystolic') return val > 140 || val < 90;
  if (key === 'bpDiastolic') return val > 90 || val < 60;
  if (key === 'heartRate') return val > 100 || val < 60;
  if (key === 'respiratoryRate') return val > 25 || val < 10;
  if (key === 'o2Saturation') return val < 95;
  return false;
};

const VitalsEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId') || '';

  const [form] = Form.useForm();
  const { mutateAsync: recordVitals, isPending } = useRecordVitals();

  const [selectedPatient, setSelectedPatient] = useState<PatientInfo | null>(null);
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string; patient: PatientInfo }[]>([]);
  const [submitResult, setSubmitResult] = useState<{ abnormals: AbnormalEntry[]; allNormal: boolean } | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-load patient if patientId in URL
  useEffect(() => {
    if (preselectedPatientId) {
      api.get(`/patients/${preselectedPatientId}`).then(r => {
        const p = r.data?.data || r.data;
        if (p) setSelectedPatient(p);
      }).catch(() => {});
    }
  }, [preselectedPatientId]);

  const handlePatientSearch = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!q || q.length < 2) { setPatientOptions([]); return; }
      try {
        const res = await api.get('/patients/search', { params: { q } });
        const list: PatientSearchOption[] = res.data?.data || res.data || [];
        setPatientOptions(list.map(p => ({
          value: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
          label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
          patient: p as unknown as PatientInfo,
        })));
      } catch {
        setPatientOptions([]);
      }
    }, 300);
  };

  const handlePatientSelect = (_: string, opt: { patient: PatientInfo }) => {
    setSelectedPatient(opt.patient);
  };

  const recalcBmi = () => {
    const w = form.getFieldValue('weight');
    const h = form.getFieldValue('height');
    if (w && h && h > 0) {
      const heightM = h / 100;
      setBmi(Math.round((w / (heightM * heightM)) * 10) / 10);
    } else {
      setBmi(null);
    }
  };

  const getFieldStyle = (key: keyof VitalsValues) => {
    const val = form.getFieldValue(key);
    if (val != null && isAbnormal(key, val)) {
      return { border: '1px solid #ff4d4f', borderRadius: 6 };
    }
    return {};
  };

  const handleSubmit = async (values: VitalsValues) => {
    const patientId = selectedPatient?.id || preselectedPatientId;
    if (!patientId) return;

    await recordVitals({ ...values, patientId });

    const abnormals: AbnormalEntry[] = [];
    const checks: Array<{ key: keyof VitalsValues; label: string; hint: string }> = [
      { key: 'temperature', label: 'Temperature', hint: 'Normal: 36.5–37.5°C' },
      { key: 'bpSystolic', label: 'BP Systolic', hint: 'Normal: 90–120 mmHg' },
      { key: 'bpDiastolic', label: 'BP Diastolic', hint: 'Normal: 60–80 mmHg' },
      { key: 'heartRate', label: 'Heart Rate', hint: 'Normal: 60–100 bpm' },
      { key: 'respiratoryRate', label: 'Respiratory Rate', hint: 'Normal: 12–20 breaths/min' },
      { key: 'o2Saturation', label: 'O2 Saturation', hint: 'Normal: 95–100%' },
    ];
    for (const c of checks) {
      const val = values[c.key] as number | undefined;
      if (val != null && isAbnormal(c.key, val)) {
        abnormals.push({ label: c.label, value: val, hint: c.hint });
      }
    }
    setSubmitResult({ abnormals, allNormal: abnormals.length === 0 });
    form.resetFields();
  };

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/nurses')} />
            <Title level={4} style={{ margin: 0 }}>Record Vital Signs</Title>
          </Space>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          {!preselectedPatientId && (
            <Card style={{ marginBottom: 16 }}>
              <Text strong>Select Patient</Text>
              <AutoComplete
                options={patientOptions}
                onSearch={handlePatientSearch}
                onSelect={handlePatientSelect}
                placeholder="Search patient by name or patient number..."
                style={{ width: '100%', marginTop: 8 }}
              />
            </Card>
          )}

          {selectedPatient && (
            <Alert
              type="info"
              style={{ marginBottom: 16 }}
              message={
                <Space>
                  <Text strong>{selectedPatient.lastName}, {selectedPatient.firstName}</Text>
                  {selectedPatient.roomNo && <Tag>Room {selectedPatient.roomNo}</Tag>}
                  {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                    <Tag color="red">⚠️ ALLERGY: {selectedPatient.allergies.join(', ')}</Tag>
                  )}
                </Space>
              }
            />
          )}

          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onValuesChange={recalcBmi}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={<>Temperature (°C) <Text type="secondary" style={{ fontSize: 11 }}>Normal: 36.5–37.5°C</Text></>}
                    name="temperature"
                  >
                    <InputNumber
                      min={30} max={45} step={0.1}
                      style={{ width: '100%', ...getFieldStyle('temperature') }}
                      placeholder="36.5"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<>BP Systolic (mmHg) <Text type="secondary" style={{ fontSize: 11 }}>Normal: 90–120</Text></>}
                    name="bpSystolic"
                  >
                    <InputNumber
                      min={60} max={250}
                      style={{ width: '100%', ...getFieldStyle('bpSystolic') }}
                      placeholder="120"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<>BP Diastolic (mmHg) <Text type="secondary" style={{ fontSize: 11 }}>Normal: 60–80</Text></>}
                    name="bpDiastolic"
                  >
                    <InputNumber
                      min={40} max={160}
                      style={{ width: '100%', ...getFieldStyle('bpDiastolic') }}
                      placeholder="80"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<>Heart Rate (bpm) <Text type="secondary" style={{ fontSize: 11 }}>Normal: 60–100</Text></>}
                    name="heartRate"
                  >
                    <InputNumber
                      min={20} max={250}
                      style={{ width: '100%', ...getFieldStyle('heartRate') }}
                      placeholder="72"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<>Respiratory Rate (breaths/min) <Text type="secondary" style={{ fontSize: 11 }}>Normal: 12–20</Text></>}
                    name="respiratoryRate"
                  >
                    <InputNumber
                      min={5} max={60}
                      style={{ width: '100%', ...getFieldStyle('respiratoryRate') }}
                      placeholder="16"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<>O2 Saturation (%) <Text type="secondary" style={{ fontSize: 11 }}>Normal: 95–100%</Text></>}
                    name="o2Saturation"
                  >
                    <InputNumber
                      min={70} max={100}
                      style={{ width: '100%', ...getFieldStyle('o2Saturation') }}
                      placeholder="98"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Weight (kg)" name="weight">
                    <InputNumber min={1} max={500} style={{ width: '100%' }} placeholder="60" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Height (cm)" name="height">
                    <InputNumber min={30} max={300} style={{ width: '100%' }} placeholder="170" />
                  </Form.Item>
                </Col>
                {bmi !== null && (
                  <Col span={24}>
                    <Alert
                      message={`Calculated BMI: ${bmi} kg/m² — ${bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'}`}
                      type={bmi >= 18.5 && bmi < 25 ? 'success' : 'warning'}
                      showIcon
                      style={{ marginBottom: 12 }}
                    />
                  </Col>
                )}
                <Col span={24}>
                  <Form.Item label="Notes" name="notes">
                    <TextArea rows={3} placeholder="Any clinical observations..." />
                  </Form.Item>
                </Col>
              </Row>

              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={isPending}
                disabled={!selectedPatient?.id && !preselectedPatientId}
              >
                Save Vitals
              </Button>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          {submitResult && (
            <Card title="Quick Assessment">
              {submitResult.allNormal ? (
                <Alert type="success" message="All vitals normal" showIcon />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert
                    type="warning"
                    message={`${submitResult.abnormals.length} abnormal value(s) detected`}
                    showIcon
                  />
                  {submitResult.abnormals.map((a, i) => (
                    <div key={i}>
                      <Tag color="red">{a.label}: {a.value}</Tag>
                      <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>{a.hint}</Text>
                    </div>
                  ))}
                </Space>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default VitalsEntryPage;
