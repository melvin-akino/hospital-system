import React, { useState } from 'react';
import {
  Table, Button, Input, Space, Tag, Typography, Row, Col, Card, Avatar, Tooltip, Popconfirm,
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, EyeOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDoctors, useUpdateDoctor } from '../../hooks/useDoctors';
import type { Doctor } from '../../types';

const { Title } = Typography;

const DoctorListPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useDoctors({ page, limit: 20, search: search || undefined });
  const { mutate: updateDoctor } = useUpdateDoctor();

  const columns = [
    {
      title: 'Doctor No.',
      dataIndex: 'doctorNo',
      width: 120,
      render: (v: string) => <Typography.Text strong style={{ color: '#1890ff' }}>{v}</Typography.Text>,
    },
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, row: Doctor) => (
        <Space>
          <Avatar style={{ background: '#52c41a' }} icon={<MedicineBoxOutlined />} />
          <Space direction="vertical" size={0}>
            <Typography.Text strong>Dr. {row.lastName}, {row.firstName}</Typography.Text>
            {row.licenseNo && <Typography.Text type="secondary" style={{ fontSize: 12 }}>PRC: {row.licenseNo}</Typography.Text>}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Specialty',
      key: 'specialty',
      render: (_: unknown, row: Doctor) => (
        <Space direction="vertical" size={0}>
          <Tag color="blue">{row.specialty}</Tag>
          {row.subspecialty && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.subspecialty}</Typography.Text>}
        </Space>
      ),
    },
    {
      title: 'Department',
      key: 'dept',
      render: (_: unknown, row: Doctor) => row.department?.name || '—',
    },
    {
      title: 'Consulting Fee',
      dataIndex: 'consultingFee',
      render: (v: number) => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, row: Doctor) => (
        <Space>
          <Tooltip title="View Profile"><Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/doctors/${row.id}`)} /></Tooltip>
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/doctors/${row.id}/edit`)} /></Tooltip>
          <Tooltip title="Deactivate">
            <Popconfirm title="Deactivate this doctor?" onConfirm={() => updateDoctor({ id: row.id, data: { isActive: false } })} okText="Yes">
              <Button type="text" danger>Off</Button>
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
          <Title level={4} style={{ margin: 0 }}>Doctors
            {data?.total !== undefined && <Typography.Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>({data.total} total)</Typography.Text>}
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/doctors/new')}>Add Doctor</Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col flex="auto">
            <Input placeholder="Search by name, doctor no., license no..." prefix={<SearchOutlined />}
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => { setSearch(searchInput); setPage(1); }} allowClear onClear={() => { setSearch(''); setSearchInput(''); }} />
          </Col>
          <Col>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => { setSearch(searchInput); setPage(1); }}>Search</Button>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={data?.data || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ current: page, pageSize: 20, total: data?.total || 0, onChange: setPage, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        onRow={(row) => ({ onClick: () => navigate(`/doctors/${row.id}`), style: { cursor: 'pointer' } })}
      />
    </div>
  );
};

export default DoctorListPage;
