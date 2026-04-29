import React, { useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, Statistic, Row, Col,
  Input, Select, Modal, Form, InputNumber, Alert,
} from 'antd';
import { MedicineBoxOutlined, CheckOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';

const { Title, Text } = Typography;

const PharmacyQueuePage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('PENDING');

  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ['pharmacy-prescriptions', filter],
    queryFn: () =>
      api.get('/prescriptions', { params: { limit: 100 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 30000,
  });

  // Also fetch ordered services directed at pharmacy
  const { data: orderedServices } = useQuery({
    queryKey: ['pharmacy-ordered-services'],
    queryFn: () =>
      api.get('/ordered-services', { params: { status: 'PENDING', limit: 100 } })
        .then((r) => r.data?.data || []),
    refetchInterval: 30000,
  });

  const dispenseMutation = useMutation({
    mutationFn: (id: string) =>
      api.put(`/ordered-services/${id}/status`, { status: 'COMPLETED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-ordered-services'] }),
  });

  const rxList = (prescriptions || []).filter((p: any) => {
    if (!search) return true;
    const name = `${p.patient?.firstName || ''} ${p.patient?.lastName || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const prescriptionColumns = [
    {
      title: 'Patient',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.patient?.firstName} {r.patient?.lastName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    {
      title: 'Medications',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          {(r.items || []).map((item: any) => (
            <Text key={item.id} style={{ fontSize: 12 }}>
              • {item.drugName} {item.dosage} {item.frequency} × {item.duration}
            </Text>
          ))}
        </Space>
      ),
    },
    {
      title: 'Prescribed',
      dataIndex: 'createdAt',
      render: (v: string) => dayjs(v).format('MMM D, h:mm A'),
    },
    {
      title: 'By',
      dataIndex: 'prescribedBy',
      render: (v: string) => v || '—',
    },
    {
      title: 'Actions',
      render: (_: any, r: any) => (
        <Button size="small" icon={<CheckOutlined />} type="primary">
          Dispense
        </Button>
      ),
    },
  ];

  const orderedColumns = [
    {
      title: 'Patient',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.patient?.firstName} {r.patient?.lastName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    { title: 'Item', dataIndex: 'description' },
    { title: 'Qty', dataIndex: 'quantity', width: 60 },
    {
      title: 'Price',
      dataIndex: 'unitPrice',
      render: (v: number) => `₱${Number(v).toLocaleString()}`,
    },
    {
      title: 'Ordered by',
      dataIndex: 'orderedByName',
      render: (v: string) => v || '—',
    },
    {
      title: 'Time',
      dataIndex: 'orderedAt',
      render: (v: string) => dayjs(v).format('h:mm A'),
    },
    {
      title: '',
      render: (_: any, r: any) => (
        <Button
          size="small"
          type="primary"
          icon={<CheckOutlined />}
          loading={dispenseMutation.isPending}
          onClick={() => dispenseMutation.mutate(r.id)}
        >
          Dispense
        </Button>
      ),
    },
  ];

  const pending = (orderedServices || []).filter((o: any) => o.status === 'PENDING');

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <MedicineBoxOutlined style={{ fontSize: 24, color: '#722ed1' }} />
            <Title level={3} style={{ margin: 0 }}>Pharmacy Queue</Title>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card><Statistic title="Pending Prescriptions" value={rxList.length} valueStyle={{ color: '#fa8c16' }} /></Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card><Statistic title="Pending Medication Orders" value={pending.length} valueStyle={{ color: '#722ed1' }} /></Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card><Statistic title="Dispensed Today" value={0} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
      </Row>

      {pending.length > 0 && (
        <Card title="Medication Orders (from departments)" style={{ marginBottom: 16 }}>
          <Table
            dataSource={pending}
            columns={orderedColumns}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </Card>
      )}

      <Card
        title="Prescriptions Queue"
        extra={
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search patient..."
            size="small"
            style={{ width: 200 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        <Table
          dataSource={rxList}
          columns={prescriptionColumns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 15 }}
        />
      </Card>
    </div>
  );
};

export default PharmacyQueuePage;
