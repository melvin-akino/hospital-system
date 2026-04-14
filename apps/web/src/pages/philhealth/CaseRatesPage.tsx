import React, { useState } from 'react';
import { Table, Input, Typography, Row, Col, Card, Tag } from 'antd';
import { SearchOutlined, SafetyOutlined } from '@ant-design/icons';
import { usePhilHealthCaseRates } from '../../hooks/usePhilHealth';
import type { PhilHealthCaseRate } from '../../services/philhealthService';

const { Title, Text } = Typography;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const CaseRatesPage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = usePhilHealthCaseRates(search || undefined);

  const columns = [
    {
      title: 'ICD Code',
      dataIndex: 'icdCode',
      width: 130,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Description / Diagnosis',
      dataIndex: 'description',
      render: (v: string) => <Text>{v}</Text>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      width: 160,
      render: (v: string) => v ? <Tag>{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Case Rate',
      dataIndex: 'caseRate',
      width: 160,
      render: (v: number) => (
        <Text strong style={{ color: '#52c41a' }}>{formatPeso(Number(v))}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 100,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <SafetyOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            PhilHealth Case Rates
          </Title>
          <Text type="secondary">
            Reference table of ICD codes and their corresponding case rates
          </Text>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col flex="auto">
            <Input
              placeholder="Search by ICD code or description..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => setSearch(searchInput)}
              allowClear
              onClear={() => { setSearch(''); setSearchInput(''); }}
            />
          </Col>
          <Col>
            <Input.Search
              placeholder=""
              enterButton="Search"
              onSearch={() => setSearch(searchInput)}
            />
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={5}>
              <Text type="secondary">
                Showing {data?.data?.length ?? 0} case rates. This is a read-only reference table managed by PhilHealth.
              </Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  );
};

export default CaseRatesPage;
