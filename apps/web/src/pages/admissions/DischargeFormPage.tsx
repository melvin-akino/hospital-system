import React from 'react';
import { Card, Form, Input, Button, Typography, Row, Col, Space, DatePicker, Descriptions, Tag } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAdmission, useDischargePatient } from '../../hooks/useAdmissions';
import { exportDischargePDF } from '../../utils/pdfExport';
import { DischargeSummaryPanel } from '../../components/ai';

const { Title, Text } = Typography;

const DischargeFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { data: admissionData, isLoading } = useAdmission(id || '');
  const discharge = useDischargePatient();
  const admission = admissionData?.data;

  const handleSubmit = async (values: { dischargeNotes?: string; dischargedAt?: dayjs.Dayjs }) => {
    if (!id) return;
    await discharge.mutateAsync({
      id,
      data: {
        dischargeNotes: values.dischargeNotes,
        dischargedAt: values.dischargedAt ? values.dischargedAt.toISOString() : undefined,
      },
    });
    navigate(`/admissions/${id}/discharge-summary`);
  };

  if (isLoading) return <div className="page-container"><Text>Loading...</Text></div>;
  if (!admission) return <div className="page-container"><Text type="danger">Admission not found</Text></div>;

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admissions/list')} style={{ marginRight: 12 }} />
          <Title level={4} style={{ margin: 0, display: 'inline' }}>Discharge Patient</Title>
        </Col>
      </Row>

      <Card title="Admission Summary" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Admission No.">{admission.admissionNo}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color="green">{admission.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Patient">
            {admission.patient?.lastName}, {admission.patient?.firstName}
          </Descriptions.Item>
          <Descriptions.Item label="Patient No.">{admission.patient?.patientNo}</Descriptions.Item>
          <Descriptions.Item label="Room">
            {admission.room ? `Room ${admission.room.roomNumber} (${admission.room.roomType?.name || 'General'})` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Attending Doctor">{admission.attendingDoctor || '—'}</Descriptions.Item>
          <Descriptions.Item label="Admitted">
            {dayjs(admission.admittedAt).format('MMM D, YYYY h:mm A')}
          </Descriptions.Item>
          <Descriptions.Item label="Days Stayed">
            <Tag color="blue">{admission.daysStayed} day{admission.daysStayed !== 1 ? 's' : ''}</Tag>
          </Descriptions.Item>
          {admission.diagnosis && (
            <Descriptions.Item label="Diagnosis" span={2}>{admission.diagnosis}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* AI Discharge Summary — shown when patient is admitted or discharged */}
      {admission.patient?.id && (
        <DischargeSummaryPanel
          patientId={admission.patient.id}
          admissionId={admission.id}
          patientName={`${admission.patient.firstName} ${admission.patient.lastName}`}
        />
      )}

      <Card title="Discharge Information" style={{ marginTop: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Discharge Date & Time" name="dischargedAt" initialValue={dayjs()}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Discharge Notes" name="dischargeNotes">
                <Input.TextArea rows={4} placeholder="Enter discharge notes, follow-up instructions..." />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" danger htmlType="submit" loading={discharge.isPending}>
              Confirm Discharge
            </Button>
            {admission.status === 'DISCHARGED' && (
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => exportDischargePDF({
                  admissionNo: admission.admissionNo,
                  patient: admission.patient,
                  room: admission.room,
                  attendingDoctor: admission.attendingDoctor,
                  admittedAt: admission.admittedAt,
                  dischargedAt: admission.dischargedAt || new Date().toISOString(),
                  diagnosis: admission.diagnosis,
                  notes: admission.notes,
                  dischargeNotes: admission.dischargeNotes,
                })}
              >
                Download Discharge Summary PDF
              </Button>
            )}
            <Button onClick={() => navigate('/admissions/list')}>Cancel</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default DischargeFormPage;
