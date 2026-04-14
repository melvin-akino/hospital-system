import React, { useState } from 'react';
import {
  Card, Form, Input, Select, Button, Typography, Row, Col, Space, AutoComplete, Spin, DatePicker,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useScheduleSession } from '../../hooks/useDialysis';
import { useDialysisMachines } from '../../hooks/useDialysis';
import type { DialysisMachine } from '../../services/dialysisService';
import api from '../../lib/api';

const { Title } = Typography;

interface PatientOption {
  value: string;
  label: string;
  id: string;
}

const SessionFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const scheduleSession = useScheduleSession();
  const { data: machinesData } = useDialysisMachines();

  const availableMachines: DialysisMachine[] = (machinesData?.data || []).filter(
    (m: DialysisMachine) => m.status === 'AVAILABLE'
  );

  const searchPatients = async (value: string) => {
    if (value.length < 2) return;
    setPatientSearching(true);
    try {
      const res = await api.get('/patients', { params: { search: value, limit: 10 } });
      setPatientOptions(
        (res.data?.data || []).map((p: { id: string; firstName: string; lastName: string; patientNo: string }) => ({
          value: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
          label: `${p.lastName}, ${p.firstName} — ${p.patientNo}`,
          id: p.id,
        }))
      );
    } finally {
      setPatientSearching(false);
    }
  };

  const handleSubmit = async (values: {
    patientDisplay: string;
    machineId?: string;
    scheduledAt: dayjs.Dayjs;
    notes?: string;
  }) => {
    if (!selectedPatientId) {
      form.setFields([{ name: 'patientDisplay', errors: ['Please select a patient'] }]);
      return;
    }
    await scheduleSession.mutateAsync({
      patientId: selectedPatientId,
      machineId: values.machineId,
      scheduledAt: values.scheduledAt.toISOString(),
      notes: values.notes,
    });
    navigate('/dialysis/schedule');
  };

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dialysis/schedule')} style={{ marginRight: 12 }} />
          <Title level={4} style={{ margin: 0, display: 'inline' }}>Schedule Dialysis Session</Title>
        </Col>
      </Row>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Patient"
                name="patientDisplay"
                rules={[{ required: true, message: 'Please select a patient' }]}
              >
                <AutoComplete
                  options={patientOptions}
                  onSearch={searchPatients}
                  onSelect={(_v, opt: PatientOption) => setSelectedPatientId(opt.id)}
                  placeholder="Search patient by name or patient number..."
                  notFoundContent={patientSearching ? <Spin size="small" /> : 'No patients found'}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Machine" name="machineId">
                <Select
                  placeholder="Select available machine..."
                  allowClear
                  options={availableMachines.map((m: DialysisMachine) => ({
                    value: m.id,
                    label: `${m.machineCode}${m.model ? ` — ${m.model}` : ''}`,
                  }))}
                  notFoundContent="No available machines"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Scheduled Date & Time"
                name="scheduledAt"
                rules={[{ required: true, message: 'Please select date and time' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="MMMM D, YYYY h:mm A" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={3} placeholder="Clinical notes, instructions..." />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={scheduleSession.isPending}>
              Schedule Session
            </Button>
            <Button onClick={() => navigate('/dialysis/schedule')}>Cancel</Button>
          </Space>
        </Form>
      </Card>

      {availableMachines.length === 0 && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ textAlign: 'center', color: '#faad14' }}>
            No machines are currently available. Check machine status in the Machines section.
          </div>
        </Card>
      )}
    </div>
  );
};

export default SessionFormPage;
