import React, { useEffect, useState } from 'react';
import {
  Typography,
  Collapse,
  Tag,
  Spin,
  Empty,
  Card,
  Table,
  Button,
  Space,
  Badge,
} from 'antd';
import { ExperimentOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../lib/api';

const { Title, Text } = Typography;

interface LabResultItem {
  id: string;
  testName?: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  status?: string;
  resultDate?: string;
  resultValue?: string;
  normalRange?: string;
  flag?: string;
  requisition?: {
    requisitionNo: string;
    testName?: string;
    requestedAt?: string;
  };
}

interface GroupedResults {
  [date: string]: LabResultItem[];
}

const getStatusColor = (status?: string, flag?: string): string => {
  const s = (status || flag || '').toUpperCase();
  if (s === 'NORMAL' || s === 'WITHIN_NORMAL' || s === 'N') return 'success';
  if (s === 'ABNORMAL' || s === 'HIGH' || s === 'LOW' || s === 'H' || s === 'L') return 'error';
  if (s === 'CRITICAL') return 'error';
  return 'default';
};

const getStatusLabel = (status?: string, flag?: string): string => {
  const s = (status || flag || '').toUpperCase();
  if (s === 'NORMAL' || s === 'N' || s === 'WITHIN_NORMAL') return 'Normal';
  if (s === 'HIGH' || s === 'H') return 'High';
  if (s === 'LOW' || s === 'L') return 'Low';
  if (s === 'ABNORMAL') return 'Abnormal';
  if (s === 'CRITICAL') return 'Critical';
  return status || flag || 'Pending';
};

const columns = [
  {
    title: 'Test Name',
    dataIndex: 'name',
    key: 'name',
    render: (text: string) => <Text strong style={{ fontSize: 13 }}>{text}</Text>,
  },
  {
    title: 'Result',
    dataIndex: 'result',
    key: 'result',
    render: (text: string, record: { unit?: string }) => (
      <Text style={{ fontSize: 13 }}>
        {text || '—'}
        {record.unit && <Text style={{ color: '#94a3b8', marginLeft: 4, fontSize: 12 }}>{record.unit}</Text>}
      </Text>
    ),
  },
  {
    title: 'Reference Range',
    dataIndex: 'referenceRange',
    key: 'referenceRange',
    render: (text: string) => (
      <Text style={{ color: '#64748b', fontSize: 12 }}>{text || '—'}</Text>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'statusLabel',
    key: 'statusLabel',
    render: (text: string, record: { statusColor: string }) => (
      <Badge
        status={record.statusColor as 'success' | 'error' | 'default' | 'processing' | 'warning'}
        text={<Text style={{ fontSize: 12 }}>{text}</Text>}
      />
    ),
  },
];

const LabResultsPage: React.FC = () => {
  const [results, setResults] = useState<LabResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/lab-results')
      .then((res) => setResults(res.data.data || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Group results by date
  const grouped: GroupedResults = results.reduce((acc: GroupedResults, r) => {
    const dateKey = r.resultDate
      ? dayjs(r.resultDate).format('YYYY-MM-DD')
      : 'Unknown Date';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) =>
    dayjs(b).valueOf() - dayjs(a).valueOf()
  );

  const handlePrint = (date: string) => {
    window.print();
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          My Lab Results
        </Title>
        <Text style={{ color: '#64748b' }}>View your laboratory test results</Text>
      </div>

      {results.length === 0 ? (
        <Card style={{ borderRadius: 10 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No lab results found"
          />
        </Card>
      ) : (
        <Collapse
          defaultActiveKey={sortedDates.slice(0, 1)}
          style={{ borderRadius: 10, overflow: 'hidden' }}
          items={sortedDates.map((date) => {
            const dateResults = grouped[date];
            const tableData = dateResults.map((r) => ({
              key: r.id,
              name:
                r.requisition?.testName ||
                r.testName ||
                'Unknown Test',
              result: r.resultValue || r.result || '—',
              unit: r.unit,
              referenceRange: r.referenceRange || r.normalRange,
              statusLabel: getStatusLabel(r.status, r.flag),
              statusColor: getStatusColor(r.status, r.flag),
            }));

            const abnormalCount = dateResults.filter((r) => {
              const s = (r.status || r.flag || '').toUpperCase();
              return s === 'ABNORMAL' || s === 'HIGH' || s === 'LOW' || s === 'H' || s === 'L' || s === 'CRITICAL';
            }).length;

            return {
              key: date,
              label: (
                <Space>
                  <ExperimentOutlined style={{ color: '#0891b2' }} />
                  <Text strong style={{ fontSize: 14 }}>
                    {date === 'Unknown Date' ? date : dayjs(date).format('MMMM DD, YYYY')}
                  </Text>
                  <Tag color="blue" style={{ fontSize: 11 }}>
                    {dateResults.length} test{dateResults.length !== 1 ? 's' : ''}
                  </Tag>
                  {abnormalCount > 0 && (
                    <Tag color="red" style={{ fontSize: 11 }}>
                      {abnormalCount} abnormal
                    </Tag>
                  )}
                </Space>
              ),
              extra: (
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint(date);
                  }}
                  style={{ fontSize: 12 }}
                >
                  Print
                </Button>
              ),
              children: (
                <Table
                  columns={columns}
                  dataSource={tableData}
                  pagination={false}
                  size="small"
                  style={{ marginTop: 8 }}
                />
              ),
            };
          })}
        />
      )}
    </div>
  );
};

export default LabResultsPage;
