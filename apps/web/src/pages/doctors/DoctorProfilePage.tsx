import React from 'react';
import { Card, Row, Col, Typography, Tag, Descriptions, Button, Space, Spin, Alert, Table } from 'antd';
import { EditOutlined, ArrowLeftOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useDoctor } from '../../hooks/useDoctors';

const { Title, Text } = Typography;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DoctorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useDoctor(id || '');

  if (isLoading) return <div className="page-container"><Spin size="large" /></div>;
  if (error || !data?.data) return <div className="page-container"><Alert type="error" message="Doctor not found" /></div>;

  const doc = data.data;

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/doctors')}>Back</Button>
            <Title level={4} style={{ margin: 0 }}>Dr. {doc.firstName} {doc.lastName}</Title>
            <Text type="secondary">{doc.doctorNo}</Text>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/doctors/${doc.id}/edit`)}>Edit</Button>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 12px' }}>
                <MedicineBoxOutlined style={{ color: '#1890ff' }} />
              </div>
              <Title level={5} style={{ margin: 0 }}>Dr. {doc.firstName} {doc.middleName || ''} {doc.lastName}</Title>
              <Tag color="blue" style={{ marginTop: 4 }}>{doc.specialty}</Tag>
              {doc.subspecialty && <Tag color="cyan" style={{ marginTop: 4 }}>{doc.subspecialty}</Tag>}
            </div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Doctor No.">{doc.doctorNo}</Descriptions.Item>
              <Descriptions.Item label="PRC License">{doc.licenseNo}</Descriptions.Item>
              <Descriptions.Item label="Department">{doc.department?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Consulting Fee">₱{Number(doc.consultingFee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Descriptions.Item>
              <Descriptions.Item label="Phone">{doc.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{doc.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={doc.isActive ? 'green' : 'red'}>{doc.isActive ? 'Active' : 'Inactive'}</Tag></Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="Schedule">
            <Table
              dataSource={doc.schedules || []}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: 'Day', dataIndex: 'dayOfWeek', render: (v: number) => DAYS[v] },
                { title: 'Start', dataIndex: 'startTime' },
                { title: 'End', dataIndex: 'endTime' },
                { title: 'Slot (min)', dataIndex: 'slotDuration' },
                { title: 'Active', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag> },
              ]}
              locale={{ emptyText: 'No schedules defined' }}
            />
          </Card>

          {doc.bio && (
            <Card title="Biography" style={{ marginTop: 16 }}>
              <Text>{doc.bio}</Text>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default DoctorProfilePage;
