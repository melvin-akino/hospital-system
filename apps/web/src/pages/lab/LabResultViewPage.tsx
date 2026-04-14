import React, { useState } from 'react';
import {
  Table,
  Typography,
  Row,
  Col,
  Card,
  Tag,
  Select,
  Input,
  Space,
  Button,
  AutoComplete,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useLabResults } from '../../hooks/useLab';
import { patientService } from '../../services/patientService';
import { useSearchParams } from 'react-router-dom';

const { Title, Text } = Typography;

interface LabResult {
  id: string;
  resultNo: string;
  testName: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  status: string;
  performedAt?: string;
  createdAt: string;
  notes?: string;
  patient?: { firstName: string; lastName: string; patientNo: string };
  requisition?: { requisitionNo: string; priority: string; orderedAt: string };
}

const LabResultViewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || '';

  const [page, setPage] = useState(1);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string }[]>([]);

  const params: Record<string, unknown> = { page, limit: 50 };
  if (selectedPatientId) params['patientId'] = selectedPatientId;

  const { data, isLoading } = useLabResults(params);

  const handlePatientSearch = async (q: string) => {
    if (q.length < 2) return;
    const res = await patientService.search(q);
    const patients = res?.data || [];
    setPatientOptions(
      patients.map((p: { id: string; lastName: string; firstName: string; patientNo: string }) => ({
        value: p.id,
        label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
      }))
    );
  };

  // Group results by date
  const results: LabResult[] = data?.data || [];
  const groupedByDate = results.reduce<Record<string, LabResult[]>>((acc, r) => {
    const date = dayjs(r.createdAt).format('MMMM D, YYYY');
    if (!acc[date]) acc[date] = [];
    acc[date].push(r);
    return acc;
  }, {});

  const columns = [
    {
      title: 'Result No.',
      dataIndex: 'resultNo',
      width: 130,
      render: (v: string) => <Text style={{ color: '#1890ff' }}>{v}</Text>,
    },
    { title: 'Test Name', dataIndex: 'testName', width: 200 },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: LabResult) =>
        row.patient ? `${row.patient.lastName}, ${row.patient.firstName}` : '—',
    },
    {
      title: 'Result',
      key: 'result',
      render: (_: unknown, row: LabResult) => (
        <span
          style={{
            color: row.isAbnormal ? '#dc2626' : undefined,
            fontWeight: row.isAbnormal ? 700 : 400,
          }}
        >
          {row.result || '—'}
          {row.unit ? ` ${row.unit}` : ''}
          {row.isAbnormal && <Tag color="red" style={{ marginLeft: 4 }}>ABNORMAL</Tag>}
        </span>
      ),
    },
    {
      title: 'Reference Range',
      dataIndex: 'referenceRange',
      render: (v?: string) => v || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => (
        <Tag color={v === 'COMPLETED' ? 'green' : 'orange'}>{v}</Tag>
      ),
    },
    {
      title: 'Priority',
      key: 'priority',
      render: (_: unknown, row: LabResult) => {
        const p = row.requisition?.priority;
        if (!p) return '—';
        return <Tag color={p === 'STAT' ? 'red' : p === 'URGENT' ? 'orange' : 'default'}>{p}</Tag>;
      },
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      render: (v?: string) => v || '—',
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Lab Results
            {data?.total !== undefined && (
              <Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>
                ({data.total} total)
              </Text>
            )}
          </Title>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8} align="middle">
          <Col span={12}>
            <AutoComplete
              options={patientOptions}
              onSearch={handlePatientSearch}
              onSelect={(value) => { setSelectedPatientId(value); setPage(1); }}
              placeholder="Filter by patient..."
              style={{ width: '100%' }}
              allowClear
              onClear={() => { setSelectedPatientId(''); setPage(1); }}
            />
          </Col>
          <Col>
            <Button
              icon={<SearchOutlined />}
              onClick={() => setPage(1)}
            >
              Search
            </Button>
          </Col>
        </Row>
      </Card>

      {selectedPatientId ? (
        // Grouped by date view for a specific patient
        Object.entries(groupedByDate).map(([date, dateResults]) => (
          <Card
            key={date}
            title={date}
            style={{ marginBottom: 16 }}
            size="small"
          >
            <Table
              dataSource={dateResults}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="small"
              rowClassName={(row) => row.isAbnormal ? 'abnormal-row' : ''}
            />
          </Card>
        ))
      ) : (
        <Table
          dataSource={results}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 50,
            total: data?.total || 0,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
          }}
          size="small"
          rowClassName={(row) => row.isAbnormal ? 'abnormal-row' : ''}
        />
      )}
    </div>
  );
};

export default LabResultViewPage;
