import React, { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Card,
  Tooltip,
  Popconfirm,
  Select,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { usePatients, useDeletePatient } from '../../hooks/usePatients';
import type { Patient } from '../../types';

const { Title } = Typography;

const PatientListPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState<string | undefined>();
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = usePatients({
    page,
    limit: 20,
    search: search || undefined,
    gender,
  });

  const { mutate: deletePatient } = useDeletePatient();

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const columns = [
    {
      title: 'Patient No.',
      dataIndex: 'patientNo',
      width: 120,
      render: (v: string) => (
        <Typography.Text strong style={{ color: '#1890ff' }}>
          {v}
        </Typography.Text>
      ),
    },
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, row: Patient) => (
        <Space>
          <UserOutlined style={{ color: '#999' }} />
          <span>
            {row.lastName}, {row.firstName}
            {row.middleName ? ` ${row.middleName.charAt(0)}.` : ''}
          </span>
        </Space>
      ),
    },
    {
      title: 'Age / Gender',
      key: 'age',
      width: 120,
      render: (_: unknown, row: Patient) => {
        const age = dayjs().diff(dayjs(row.dateOfBirth), 'year');
        return (
          <Space>
            <span>{age}y</span>
            <Tag color={row.gender === 'MALE' ? 'blue' : row.gender === 'FEMALE' ? 'pink' : 'default'}>
              {row.gender}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      render: (v: string) => v || '—',
    },
    {
      title: 'Discounts',
      key: 'discounts',
      width: 140,
      render: (_: unknown, row: Patient) => (
        <Space>
          {row.isSenior && <Tag color="gold">Senior</Tag>}
          {row.isPwd && <Tag color="purple">PWD</Tag>}
          {row.philhealthNo && <Tag color="green">PhilHealth</Tag>}
        </Space>
      ),
    },
    {
      title: 'Registered',
      dataIndex: 'createdAt',
      width: 120,
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, row: Patient) => (
        <Space>
          <Tooltip title="View">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/patients/${row.id}`)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/patients/${row.id}/edit`)}
            />
          </Tooltip>
          <Tooltip title="Deactivate">
            <Popconfirm
              title="Deactivate this patient?"
              onConfirm={() => deletePatient(row.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
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
            Patients
            {data?.total !== undefined && (
              <Typography.Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>
                ({data.total} total)
              </Typography.Text>
            )}
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/patients/new')}
          >
            New Patient
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Search by name, patient no., phone, PhilHealth no..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
              onClear={() => { setSearch(''); setSearchInput(''); }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Gender"
              style={{ width: 120 }}
              allowClear
              onChange={(v) => { setGender(v); setPage(1); }}
              options={[
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </Col>
          <Col>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              Search
            </Button>
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
        onRow={(row) => ({
          onClick: () => navigate(`/patients/${row.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );
};

export default PatientListPage;
