import React, { useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Typography,
  Row,
  Col,
  Card,
  Select,
  Space,
  DatePicker,
  Input,
  Tooltip,
} from 'antd';
import { PlusOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useLabRequisitions } from '../../hooks/useLab';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const statusColors: Record<string, string> = {
  PENDING: 'orange',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

const priorityColors: Record<string, string> = {
  ROUTINE: 'default',
  URGENT: 'orange',
  STAT: 'red',
};

interface RequisitionItem {
  id: string;
  testName: string;
  testCode?: string;
}

interface Requisition {
  id: string;
  requisitionNo: string;
  status: string;
  priority: string;
  orderedAt: string;
  orderedBy?: string;
  patient?: { firstName: string; lastName: string; patientNo: string };
  items: RequisitionItem[];
}

const LabRequisitionListPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | undefined>();
  const [searchPatient, setSearchPatient] = useState('');

  const params: Record<string, unknown> = { page, limit: 20 };
  if (status) params['status'] = status;
  if (dateRange) {
    params['dateFrom'] = dateRange[0];
    params['dateTo'] = dateRange[1];
  }

  const { data, isLoading } = useLabRequisitions(params);

  const columns = [
    {
      title: 'Requisition No.',
      dataIndex: 'requisitionNo',
      render: (v: string) => <Typography.Text strong style={{ color: '#1890ff' }}>{v}</Typography.Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: Requisition) =>
        row.patient ? `${row.patient.lastName}, ${row.patient.firstName} (${row.patient.patientNo})` : '—',
    },
    {
      title: 'Tests',
      key: 'tests',
      render: (_: unknown, row: Requisition) => (
        <Space wrap>
          {row.items.slice(0, 3).map((item) => (
            <Tag key={item.id}>{item.testCode || item.testName}</Tag>
          ))}
          {row.items.length > 3 && <Tag>+{row.items.length - 3} more</Tag>}
        </Space>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      render: (v: string) => <Tag color={priorityColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Ordered At',
      dataIndex: 'orderedAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY HH:mm'),
    },
    { title: 'Ordered By', dataIndex: 'orderedBy', render: (v?: string) => v || '—' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, row: Requisition) => (
        <Space>
          <Tooltip title="View">
            <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/lab/results/entry/${row.id}`)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Lab Requisitions
            {data?.total !== undefined && (
              <Typography.Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>
                ({data.total} total)
              </Typography.Text>
            )}
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/lab/requisitions/new')}>
            New Requisition
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8} align="middle">
          <Col span={6}>
            <Select
              placeholder="Filter by Status"
              style={{ width: '100%' }}
              allowClear
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </Col>
          <Col span={10}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(_, dates) => {
                if (dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                } else {
                  setDateRange(undefined);
                }
                setPage(1);
              }}
            />
          </Col>
          <Col span={8}>
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined />}
              value={searchPatient}
              onChange={(e) => setSearchPatient(e.target.value)}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={data?.data || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total || 0,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        }}
      />
    </div>
  );
};

export default LabRequisitionListPage;
