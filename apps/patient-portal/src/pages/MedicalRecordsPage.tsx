import React, { useEffect, useState } from 'react';
import { Typography, Timeline, Tag, Spin, Empty, Card, Space } from 'antd';
import {
  FileTextOutlined,
  UserOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../lib/api';

const { Title, Text } = Typography;

interface Doctor {
  firstName: string;
  lastName: string;
  specialization?: string;
}

interface Consultation {
  id: string;
  scheduledAt: string;
  chiefComplaint?: string;
  assessment?: string;
  treatmentPlan?: string;
  icdCodes?: string[];
  status?: string;
  doctor?: Doctor;
  subjective?: string;
  objective?: string;
  plan?: string;
}

const MedicalRecordsPage: React.FC = () => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/medical-records')
      .then((res) => setConsultations(res.data.data || []))
      .catch(() => setConsultations([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          My Medical Records
        </Title>
        <Text style={{ color: '#64748b' }}>Your complete consultation history</Text>
      </div>

      {consultations.length === 0 ? (
        <Card style={{ borderRadius: 10 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No medical records found"
          />
        </Card>
      ) : (
        <Card style={{ borderRadius: 10 }} bodyStyle={{ padding: '24px 32px' }}>
          <Timeline
            mode="left"
            items={consultations.map((c) => ({
              color: '#0891b2',
              dot: (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0891b2',
                  }}
                >
                  <FileTextOutlined />
                </div>
              ),
              label: (
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: 500 }}>
                  {dayjs(c.scheduledAt).format('MMM DD, YYYY')}
                  <br />
                  <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                    {dayjs(c.scheduledAt).format('h:mm A')}
                  </Text>
                </Text>
              ),
              children: (
                <Card
                  size="small"
                  style={{
                    borderRadius: 8,
                    marginBottom: 8,
                    border: '1px solid #e2e8f0',
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  {/* Doctor */}
                  {c.doctor && (
                    <Space style={{ marginBottom: 10 }}>
                      <UserOutlined style={{ color: '#0891b2' }} />
                      <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                        Dr. {c.doctor.firstName} {c.doctor.lastName}
                      </Text>
                      {c.doctor.specialization && (
                        <Tag color="cyan" style={{ fontSize: 11 }}>
                          {c.doctor.specialization}
                        </Tag>
                      )}
                    </Space>
                  )}

                  {/* Chief Complaint */}
                  {c.chiefComplaint && (
                    <div style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        Chief Complaint
                      </Text>
                      <br />
                      <Text style={{ fontSize: 13 }}>{c.chiefComplaint}</Text>
                    </div>
                  )}

                  {/* Assessment / Diagnosis */}
                  {c.assessment && (
                    <div style={{ marginBottom: 8 }}>
                      <Space>
                        <MedicineBoxOutlined style={{ color: '#16a34a' }} />
                        <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                          Assessment / Diagnosis
                        </Text>
                      </Space>
                      <br />
                      <Text style={{ fontSize: 13 }}>{c.assessment}</Text>
                    </div>
                  )}

                  {/* Treatment Plan */}
                  {c.treatmentPlan && (
                    <div style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        Treatment Plan
                      </Text>
                      <br />
                      <Text style={{ fontSize: 13 }}>{c.treatmentPlan}</Text>
                    </div>
                  )}

                  {/* Plan (SOAP) */}
                  {c.plan && !c.treatmentPlan && (
                    <div style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        Plan
                      </Text>
                      <br />
                      <Text style={{ fontSize: 13 }}>{c.plan}</Text>
                    </div>
                  )}

                  {/* ICD Codes */}
                  {c.icdCodes && c.icdCodes.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: '#94a3b8', marginRight: 6 }}>
                        ICD Codes:
                      </Text>
                      {c.icdCodes.map((code) => (
                        <Tag key={code} color="geekblue" style={{ fontSize: 11 }}>
                          {code}
                        </Tag>
                      ))}
                    </div>
                  )}

                  {/* Status */}
                  {c.status && (
                    <div style={{ marginTop: 8 }}>
                      <Tag
                        color={
                          c.status === 'COMPLETED'
                            ? 'green'
                            : c.status === 'CANCELLED'
                            ? 'red'
                            : 'blue'
                        }
                        style={{ fontSize: 11 }}
                      >
                        {c.status}
                      </Tag>
                    </div>
                  )}
                </Card>
              ),
            }))}
          />
        </Card>
      )}
    </div>
  );
};

export default MedicalRecordsPage;
