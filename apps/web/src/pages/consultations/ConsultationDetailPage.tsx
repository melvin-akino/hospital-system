import React from 'react';
import { Card, Row, Col, Typography, Tag, Descriptions, Button, Space, Spin, Alert, Popconfirm } from 'antd';
import { EditOutlined, ArrowLeftOutlined, CheckCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useConsultation, useCompleteConsultation } from '../../hooks/useConsultations';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = {
  SCHEDULED: 'blue', IN_PROGRESS: 'orange', COMPLETED: 'green', CANCELLED: 'red', NO_SHOW: 'default',
};

const ConsultationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useConsultation(id || '');
  const { mutate: complete, isPending: completing } = useCompleteConsultation();

  if (isLoading) return <div className="page-container"><Spin size="large" /></div>;
  if (error || !data?.data) return <div className="page-container"><Alert type="error" message="Consultation not found" /></div>;

  const c = data.data;

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/consultations')}>Back</Button>
            <Title level={4} style={{ margin: 0 }}>{c.consultationNo}</Title>
            <Tag color={statusColor[c.status] || 'default'} style={{ fontSize: 13 }}>{c.status.replace('_', ' ')}</Tag>
          </Space>
        </Col>
        <Col>
          <Space>
            {c.status === 'SCHEDULED' && (
              <Popconfirm title="Mark this consultation as completed? A bill will be auto-generated."
                onConfirm={() => complete({ id: c.id, data: {} })} okText="Complete">
                <Button type="primary" icon={<CheckCircleOutlined />} loading={completing}>Complete</Button>
              </Popconfirm>
            )}
            {c.bill && (
              <Button icon={<DollarOutlined />} onClick={() => navigate(`/billing/${c.bill!.id}`)}>View Bill</Button>
            )}
            {c.status !== 'COMPLETED' && c.status !== 'CANCELLED' && (
              <Button icon={<EditOutlined />} onClick={() => navigate(`/consultations/${c.id}/edit`)}>Edit</Button>
            )}
          </Space>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card title="Consultation Info" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Type"><Tag>{c.consultationType}</Tag></Descriptions.Item>
              <Descriptions.Item label="Scheduled">{dayjs(c.scheduledAt).format('MMMM D, YYYY h:mm A')}</Descriptions.Item>
              {c.completedAt && <Descriptions.Item label="Completed">{dayjs(c.completedAt).format('MMMM D, YYYY h:mm A')}</Descriptions.Item>}
              <Descriptions.Item label="Patient">
                <Space direction="vertical" size={0}>
                  <Text strong>{c.patient?.lastName}, {c.patient?.firstName}</Text>
                  <Text type="secondary">{c.patient?.patientNo}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Doctor">
                Dr. {c.doctor?.lastName}, {c.doctor?.firstName}<br />
                <Text type="secondary">{c.doctor?.specialty}</Text>
              </Descriptions.Item>
              {c.bill && (
                <Descriptions.Item label="Bill">
                  <Space>
                    <Text>{c.bill.billNo}</Text>
                    <Tag color={{ PAID: 'green', PARTIAL: 'orange', DRAFT: 'blue' }[c.bill.status || ''] || 'default'}>
                      {c.bill.status}
                    </Tag>
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {(c.icdCodes?.length ?? 0) > 0 && (
            <Card title="ICD-10 Codes" style={{ marginBottom: 16 }}>
              <Space wrap>
                {(c.icdCodes || []).map((code: string) => <Tag key={code} color="blue">{code}</Tag>)}
              </Space>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={16}>
          <Card title="Clinical Notes">
            {c.chiefComplaint && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Chief Complaint</Text>
                <Text>{c.chiefComplaint}</Text>
              </div>
            )}
            {c.findings && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Findings</Text>
                <Text>{c.findings}</Text>
              </div>
            )}
            {c.assessment && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Assessment</Text>
                <Text>{c.assessment}</Text>
              </div>
            )}
            {c.treatmentPlan && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Treatment Plan</Text>
                <Text>{c.treatmentPlan}</Text>
              </div>
            )}
            {!c.chiefComplaint && !c.findings && !c.assessment && !c.treatmentPlan && (
              <Text type="secondary">No clinical notes recorded.</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ConsultationDetailPage;
