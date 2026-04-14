import React from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Descriptions,
  Tabs,
  Table,
  Button,
  Space,
  Spin,
  Alert,
} from 'antd';
import { EditOutlined, ArrowLeftOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { usePatient, usePatientHistory } from '../../hooks/usePatients';
import type { Consultation, Bill } from '../../types';

const { Title, Text } = Typography;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePatient(id || '');
  const { data: historyData } = usePatientHistory(id || '');

  if (isLoading) return <div className="page-container"><Spin size="large" /></div>;
  if (error || !data?.data) return (
    <div className="page-container">
      <Alert type="error" message="Patient not found" />
    </div>
  );

  const p = data.data;
  const age = dayjs().diff(dayjs(p.dateOfBirth), 'year');
  const history = historyData?.data as {
    consultations: Consultation[];
    bills: Bill[];
    admissions: unknown[];
    labResults: unknown[];
  } | undefined;

  const consultationCols = [
    { title: 'No.', dataIndex: 'consultationNo', width: 140 },
    {
      title: 'Date',
      dataIndex: 'scheduledAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY h:mm A'),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: unknown, row: Consultation) =>
        row.doctor ? `Dr. ${row.doctor.lastName}` : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => (
        <Tag
          color={{ COMPLETED: 'green', CANCELLED: 'red', SCHEDULED: 'blue', IN_PROGRESS: 'orange' }[v] || 'default'}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'action',
      render: (_: unknown, row: Consultation) => (
        <Button type="link" size="small" onClick={() => navigate(`/consultations/${row.id}`)}>
          View
        </Button>
      ),
    },
  ];

  const billCols = [
    { title: 'Bill No.', dataIndex: 'billNo' },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      render: (v: number) => <Text className="currency">{formatPeso(v)}</Text>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      render: (v: number) => <Text className="currency" type={v > 0 ? 'danger' : 'success'}>{formatPeso(v)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => (
        <Tag color={{ PAID: 'green', PARTIAL: 'orange', DRAFT: 'blue', CANCELLED: 'red' }[v] || 'default'}>
          {v}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'action',
      render: (_: unknown, row: Bill) => (
        <Button type="link" size="small" onClick={() => navigate(`/billing/${row.id}`)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/patients')}>
              Back
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {p.lastName}, {p.firstName} {p.middleName || ''}
            </Title>
            <Text type="secondary">{p.patientNo}</Text>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => navigate(`/consultations/new?patientId=${p.id}`)}
            >
              New Consultation
            </Button>
            <Button
              icon={<DollarOutlined />}
              onClick={() => navigate(`/billing/new?patientId=${p.id}`)}
            >
              New Bill
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/patients/${p.id}/edit`)}
            >
              Edit
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Summary card */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: p.gender === 'MALE' ? '#e6f7ff' : '#fff0f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}
            >
              {p.gender === 'MALE' ? '👨' : p.gender === 'FEMALE' ? '👩' : '👤'}
            </div>
          </Col>
          <Col flex="auto">
            <Title level={5} style={{ margin: 0 }}>
              {p.firstName} {p.middleName || ''} {p.lastName}
            </Title>
            <Space style={{ marginTop: 4 }}>
              <Text type="secondary">{age} years old</Text>
              <Tag color={p.gender === 'MALE' ? 'blue' : 'pink'}>{p.gender}</Tag>
              {p.bloodType && <Tag>{p.bloodType.replace('_', ' ').replace('POSITIVE', '+').replace('NEGATIVE', '-')}</Tag>}
              {p.isSenior && <Tag color="gold">Senior Citizen</Tag>}
              {p.isPwd && <Tag color="purple">PWD</Tag>}
              {p.philhealthNo && <Tag color="green">PhilHealth</Tag>}
            </Space>
          </Col>
        </Row>
      </Card>

      <Tabs
        defaultActiveKey="info"
        items={[
          {
            key: 'info',
            label: 'Patient Info',
            children: (
              <Card>
                <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
                  <Descriptions.Item label="Patient No.">{p.patientNo}</Descriptions.Item>
                  <Descriptions.Item label="Date of Birth">
                    {dayjs(p.dateOfBirth).format('MMMM D, YYYY')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Civil Status">{p.civilStatus || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Nationality">{p.nationality}</Descriptions.Item>
                  <Descriptions.Item label="Religion">{p.religion || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Phone">{p.phone || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Email">{p.email || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Address" span={2}>
                    {[p.address, p.city, p.province, p.zipCode].filter(Boolean).join(', ') || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Emergency Contact">
                    {p.emergencyContact || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Emergency Phone">
                    {p.emergencyPhone || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="PhilHealth No.">{p.philhealthNo || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Senior ID">{p.seniorIdNo || '—'}</Descriptions.Item>
                  <Descriptions.Item label="PWD ID">{p.pwdIdNo || '—'}</Descriptions.Item>
                  {p.notes && (
                    <Descriptions.Item label="Notes" span={3}>{p.notes}</Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'consultations',
            label: `Consultations (${history?.consultations?.length || 0})`,
            children: (
              <Table
                dataSource={history?.consultations || []}
                columns={consultationCols}
                rowKey="id"
                size="small"
                pagination={false}
              />
            ),
          },
          {
            key: 'bills',
            label: `Bills (${history?.bills?.length || 0})`,
            children: (
              <Table
                dataSource={history?.bills || []}
                columns={billCols}
                rowKey="id"
                size="small"
                pagination={false}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

export default PatientDetailPage;
