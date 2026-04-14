import React, { useState, useRef } from 'react';
import { Form, Button, Typography, Row, Col, Card, AutoComplete, Space, Input } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { useCarePlan, useSaveCarePlan } from '../../hooks/useNurse';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface PatientSearchOption {
  id: string;
  firstName: string;
  lastName: string;
  patientNo: string;
}

const CarePlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { mutateAsync: saveCarePlan, isPending } = useSaveCarePlan();

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string; patientId: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: existingPlan } = useCarePlan(selectedPatientId);

  // Populate form when existing plan loads
  React.useEffect(() => {
    if (existingPlan) {
      form.setFieldsValue({
        goals: existingPlan.goals,
        interventions: existingPlan.interventions || existingPlan.nursingInterventions,
        evaluation: existingPlan.evaluation,
        nurseNotes: existingPlan.nurseNotes || existingPlan.notes,
      });
    } else {
      form.resetFields();
    }
  }, [existingPlan, form]);

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
          patientId: p.id,
        })));
      } catch {
        setPatientOptions([]);
      }
    }, 300);
  };

  const handlePatientSelect = (_: string, opt: { patientId: string }) => {
    setSelectedPatientId(opt.patientId);
  };

  const handleSubmit = async (values: {
    goals: string;
    interventions: string;
    evaluation: string;
    nurseNotes: string;
  }) => {
    await saveCarePlan({
      patientId: selectedPatientId,
      goals: values.goals,
      nursingInterventions: values.interventions,
      evaluation: values.evaluation,
      nurseNotes: values.nurseNotes,
    });
  };

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/nurses')} />
            <Title level={4} style={{ margin: 0 }}>Care Plan</Title>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Text strong>Select Patient</Text>
        <AutoComplete
          options={patientOptions}
          onSearch={handlePatientSearch}
          onSelect={handlePatientSelect}
          placeholder="Search patient by name or patient number..."
          style={{ width: '100%', marginTop: 8 }}
          allowClear
          onClear={() => { setSelectedPatientId(''); form.resetFields(); }}
        />
      </Card>

      {existingPlan?.updatedAt && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Last updated: {dayjs(existingPlan.updatedAt).format('MMM D, YYYY h:mm A')}
        </Text>
      )}

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Goals"
                name="goals"
                rules={[{ required: true, message: 'Please enter care goals' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="e.g. Patient will ambulate independently within 48 hours. Patient will maintain O2 saturation above 95%."
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Nursing Interventions"
                name="interventions"
                rules={[{ required: true, message: 'Please enter nursing interventions' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="e.g. Monitor vitals every 4 hours. Assist with ambulation twice daily. Administer prescribed medications on schedule."
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Evaluation" name="evaluation">
                <TextArea rows={3} placeholder="Clinical evaluation notes..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Nurse Notes" name="nurseNotes">
                <TextArea rows={3} placeholder="Additional nursing notes..." />
              </Form.Item>
            </Col>
          </Row>

          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={isPending}
            disabled={!selectedPatientId}
          >
            Save Care Plan
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default CarePlanPage;
