import React, { useState } from 'react';
import {
  Form, Button, Typography, Row, Col, Card, Select, Space, Input,
  Table, Alert, Divider,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAssignedPatients, useLatestHandover, useSaveHandover } from '../../hooks/useNurse';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AssignedPatient {
  id: string;
  firstName: string;
  lastName: string;
  roomNo?: string;
}

interface PatientNote {
  patientId: string;
  note: string;
}

const ShiftHandoverPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { mutateAsync: saveHandover, isPending } = useSaveHandover();

  const { data: patientsData } = useAssignedPatients();
  const { data: latestHandover } = useLatestHandover();

  const patients: AssignedPatient[] = Array.isArray(patientsData) ? patientsData : (patientsData?.data || []);

  const [patientNotes, setPatientNotes] = useState<Record<string, string>>({});

  const updatePatientNote = (patientId: string, note: string) => {
    setPatientNotes(prev => ({ ...prev, [patientId]: note }));
  };

  const handleSubmit = async (values: {
    outgoingNurse: string;
    incomingNurse: string;
    shift: string;
    generalNotes: string;
  }) => {
    const patientUpdates: PatientNote[] = patients.map(p => ({
      patientId: p.id,
      note: patientNotes[p.id] || '',
    })).filter(p => p.note);

    await saveHandover({
      outgoingNurse: values.outgoingNurse,
      incomingNurse: values.incomingNurse,
      shift: values.shift,
      generalNotes: values.generalNotes,
      patientUpdates,
    });

    form.resetFields();
    setPatientNotes({});
  };

  const patientColumns = [
    {
      title: 'Patient',
      key: 'name',
      render: (_: unknown, row: AssignedPatient) => (
        <Text>{row.lastName}, {row.firstName} {row.roomNo ? `(Room ${row.roomNo})` : ''}</Text>
      ),
    },
    {
      title: 'Handover Notes',
      key: 'notes',
      render: (_: unknown, row: AssignedPatient) => (
        <Input
          value={patientNotes[row.id] || ''}
          onChange={e => updatePatientNote(row.id, e.target.value)}
          placeholder="Enter update for this patient..."
          size="small"
        />
      ),
    },
  ];

  const previousPatientUpdates: Array<{ patientId: string; patientName?: string; note: string }> =
    latestHandover?.patientUpdates || [];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/nurses')} />
            <Title level={4} style={{ margin: 0 }}>Shift Handover</Title>
          </Space>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Left: Handover Form */}
        <Col span={14}>
          <Card title="Create Handover Report">
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Outgoing Nurse"
                    name="outgoingNurse"
                    rules={[{ required: true, message: 'Please enter outgoing nurse name' }]}
                  >
                    <Input placeholder="Nurse name..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Incoming Nurse"
                    name="incomingNurse"
                    rules={[{ required: true, message: 'Please enter incoming nurse name' }]}
                  >
                    <Input placeholder="Nurse name..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Shift"
                    name="shift"
                    rules={[{ required: true, message: 'Please select a shift' }]}
                  >
                    <Select
                      placeholder="Select shift"
                      options={[
                        { value: 'MORNING', label: 'Morning (6:00 AM – 2:00 PM)' },
                        { value: 'AFTERNOON', label: 'Afternoon (2:00 PM – 10:00 PM)' },
                        { value: 'NIGHT', label: 'Night (10:00 PM – 6:00 AM)' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="General Notes" name="generalNotes">
                    <TextArea rows={3} placeholder="General shift notes, ward updates, etc." />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Patient Updates</Divider>
              <Table
                dataSource={patients}
                columns={patientColumns}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: 'No admitted patients' }}
              />

              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={isPending}
                style={{ marginTop: 16 }}
              >
                Save Handover
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Right: Previous Handover */}
        <Col span={10}>
          <Card title="Previous Handover">
            {!latestHandover ? (
              <Alert
                type="info"
                message="No previous handover on record"
                description="The previous shift handover report will appear here."
                showIcon
              />
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">Date &amp; Time</Text>
                  <div>
                    <Text strong>
                      {dayjs(latestHandover.createdAt || latestHandover.date).format('MMM D, YYYY h:mm A')}
                    </Text>
                  </div>
                </div>

                <div>
                  <Text type="secondary">Shift</Text>
                  <div>
                    <Text strong>{latestHandover.shift}</Text>
                  </div>
                </div>

                <div>
                  <Text type="secondary">Nurses</Text>
                  <div>
                    <Text>
                      {latestHandover.outgoingNurse} <Text type="secondary">→</Text> {latestHandover.incomingNurse}
                    </Text>
                  </div>
                </div>

                {latestHandover.generalNotes && (
                  <div>
                    <Text type="secondary">General Notes</Text>
                    <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #eee', marginTop: 4 }}>
                      <Text>{latestHandover.generalNotes}</Text>
                    </div>
                  </div>
                )}

                {previousPatientUpdates.length > 0 && (
                  <div>
                    <Text type="secondary">Patient Updates</Text>
                    <div style={{ marginTop: 8 }}>
                      {previousPatientUpdates.map((u, i) => (
                        <div key={i} style={{ marginBottom: 8, padding: '6px 10px', background: '#f5f5f5', borderRadius: 4 }}>
                          {u.patientName && <Text strong style={{ display: 'block' }}>{u.patientName}</Text>}
                          <Text style={{ fontSize: 13 }}>{u.note}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ShiftHandoverPage;
