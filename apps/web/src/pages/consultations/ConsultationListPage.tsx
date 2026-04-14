import React, { useState } from 'react';
import { Table, Button, Input, Space, Tag, Typography, Row, Col, Card, Select, DatePicker } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useConsultations } from '../../hooks/useConsultations';
import type { Consultation } from '../../types';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const statusColor: Record<string, string> = {
  SCHEDULED: 'blue', IN_PROGRESS: 'orange', COMPLETED: 'green', CANCELLED: 'red', NO_SHOW: 'default',
};

const ConsultationListPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | undefined>();

  const { data, isLoading } = useConsultations({
    page, limit: 20,
    status,
    from: dateRange?.[0],
    to: dateRange?.[1],
  });

  const columns = [
    { title: 'No.', dataIndex: 'consultationNo', width: 160, render: (v: string) => <Typography.Text strong style={{ color: '#1890ff' }}>{v}</Typography.Text> },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: Consultation) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.patient?.lastName}, {row.patient?.firstName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.patient?.patientNo}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Doctor', key: 'doctor', render: (_: unknown, row: Consultation) => row.doctor ? `Dr. ${row.doctor.lastName}` : '—' },
    { title: 'Type', dataIndex: 'consultationType', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Scheduled', dataIndex: 'scheduledAt', render: (v: string) => dayjs(v).format('MMM D, YYYY h:mm A') },
    {
      title: 'Status', dataIndex: 'status',
      render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Bill',
      key: 'bill',
      render: (_: unknown, row: Consultation) =>
        row.bill ? <Tag color={{ PAID: 'green', PARTIAL: 'orange', DRAFT: 'blue' }[row.bill.status || ''] || 'default'}>{row.bill.status}</Tag> : <Tag>No Bill</Tag>,
    },
    {
      title: '', key: 'actions',
      render: (_: unknown, row: Consultation) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/consultations/${row.id}`)} />
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Consultations
            {data?.total !== undefined && <Typography.Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>({data.total} total)</Typography.Text>}
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/consultations/new')}>New Consultation</Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col>
            <Select placeholder="Status" style={{ width: 150 }} allowClear onChange={(v) => { setStatus(v); setPage(1); }}
              options={['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map(v => ({ value: v, label: v.replace('_', ' ') }))} />
          </Col>
          <Col>
            <RangePicker onChange={(_, s) => { setDateRange(s[0] && s[1] ? [s[0], s[1]] : undefined); setPage(1); }} />
          </Col>
          <Col>
            <Button icon={<SearchOutlined />} onClick={() => setPage(1)}>Filter</Button>
          </Col>
        </Row>
      </Card>

      <Table dataSource={data?.data || []} columns={columns} rowKey="id" loading={isLoading}
        pagination={{ current: page, pageSize: 20, total: data?.total || 0, onChange: setPage, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        onRow={(row) => ({ onClick: () => navigate(`/consultations/${row.id}`), style: { cursor: 'pointer' } })} />
    </div>
  );
};

export default ConsultationListPage;
