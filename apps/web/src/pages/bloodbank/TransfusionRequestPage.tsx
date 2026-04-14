import React, { useState } from 'react';
import {
  Table, Button, Input, Space, Tag, Typography, Row, Col, Card, Modal, Form, Select,
  InputNumber, AutoComplete, Spin, Popconfirm,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTransfusions, useRequestTransfusion, useTransfusePatient } from '../../hooks/useBloodBank';
import type { Transfusion } from '../../services/bloodbankService';
import api from '../../lib/api';

const { Title, Text } = Typography;

const BLOOD_TYPES = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'];

const formatBloodType = (bt: string) =>
  bt.replace('_POSITIVE', '+').replace('_NEGATIVE', '-').replace('_', ' ');

const statusColors: Record<string, string> = {
  REQUESTED: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'default',
};

interface PatientOption {
  value: string;
  label: string;
  id: string;
}

const TransfusionRequestPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [requestModal, setRequestModal] = useState(false);
  const [transfuseModal, setTransfuseModal] = useState<{ open: boolean; transfusion?: Transfusion }>({ open: false });
  const [requestForm] = Form.useForm();
  const [transfuseForm] = Form.useForm();
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [bloodUnitOptions, setBloodUnitOptions] = useState<{ value: string; label: string; id: string }[]>([]);

  const { data, isLoading } = useTransfusions({
    page,
    limit: 20,
    status: statusFilter,
  });

  const requestTransfusion = useRequestTransfusion();
  const transfusePatient = useTransfusePatient();

  const searchPatients = async (value: string) => {
    if (value.length < 2) return;
    setPatientSearching(true);
    try {
      const res = await api.get('/patients', { params: { search: value, limit: 10 } });
      setPatientOptions(
        (res.data?.data || []).map((p: { id: string; firstName: string; lastName: string; patientNo: string }) => ({
          value: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
          label: `${p.lastName}, ${p.firstName} — ${p.patientNo}`,
          id: p.id,
        }))
      );
    } finally {
      setPatientSearching(false);
    }
  };

  const loadBloodUnits = async (bloodType: string) => {
    try {
      const res = await api.get('/blood-units', { params: { bloodType, status: 'AVAILABLE', limit: 50 } });
      setBloodUnitOptions(
        (res.data?.data || []).map((u: { id: string; unitCode: string; expiryDate: string }) => ({
          value: u.unitCode,
          label: `${u.unitCode} — Expires ${dayjs(u.expiryDate).format('MMM D, YYYY')}`,
          id: u.id,
        }))
      );
    } catch {
      setBloodUnitOptions([]);
    }
  };

  const handleRequest = async (values: {
    patientDisplay: string;
    bloodType: string;
    units: number;
    notes?: string;
  }) => {
    if (!selectedPatientId) {
      requestForm.setFields([{ name: 'patientDisplay', errors: ['Please select a patient'] }]);
      return;
    }
    await requestTransfusion.mutateAsync({
      patientId: selectedPatientId,
      bloodType: values.bloodType,
      units: values.units,
      notes: values.notes,
    });
    setRequestModal(false);
    requestForm.resetFields();
    setSelectedPatientId('');
  };

  const handleTransfuse = async (values: { bloodUnitCode: string }) => {
    if (!transfuseModal.transfusion) return;
    const unit = bloodUnitOptions.find(u => u.value === values.bloodUnitCode);
    await transfusePatient.mutateAsync({
      id: transfuseModal.transfusion.id,
      data: { bloodUnitId: unit?.id },
    });
    setTransfuseModal({ open: false });
    transfuseForm.resetFields();
  };

  const columns = [
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: Transfusion) => row.patient
        ? <span><Text strong>{row.patient.lastName}, {row.patient.firstName}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{row.patient.patientNo}</Text></span>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Blood Type Needed',
      dataIndex: 'bloodType',
      render: (v: string) => <Tag color="red" style={{ fontWeight: 700 }}>{formatBloodType(v)}</Tag>,
    },
    {
      title: 'Units',
      dataIndex: 'units',
      render: (v: number) => <Tag>{v} unit{v !== 1 ? 's' : ''}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Requested',
      dataIndex: 'requestedAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY h:mm A'),
    },
    {
      title: 'Transfused',
      dataIndex: 'transfusedAt',
      render: (v: string) => v ? dayjs(v).format('MMM D, YYYY h:mm A') : <Text type="secondary">—</Text>,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, row: Transfusion) => (
        <Space>
          {row.status === 'REQUESTED' && (
            <Popconfirm
              title="Mark this transfusion as completed?"
              description="Select the blood unit used."
              onConfirm={() => {
                loadBloodUnits(row.bloodType);
                setTransfuseModal({ open: true, transfusion: row });
              }}
              showCancel={false}
              okText="Select Unit"
            >
              <Button size="small" type="primary">Mark Transfused</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Transfusion Requests
            {data?.total !== undefined && (
              <Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>
                ({data.total} total)
              </Text>
            )}
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setRequestModal(true)}>
            New Request
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col flex="auto">
            <Input
              placeholder="Search patient..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => { setSearch(searchInput); setPage(1); }}
              allowClear
              onClear={() => { setSearch(''); setSearchInput(''); }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 140 }}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={['REQUESTED', 'COMPLETED', 'CANCELLED'].map(v => ({ value: v, label: v }))}
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
        }}
      />

      {/* Request Modal */}
      <Modal
        title="New Transfusion Request"
        open={requestModal}
        onCancel={() => { setRequestModal(false); requestForm.resetFields(); setSelectedPatientId(''); }}
        onOk={() => requestForm.submit()}
        okText="Submit Request"
        confirmLoading={requestTransfusion.isPending}
      >
        <Form form={requestForm} layout="vertical" onFinish={handleRequest}>
          <Form.Item
            label="Patient"
            name="patientDisplay"
            rules={[{ required: true, message: 'Please select a patient' }]}
          >
            <AutoComplete
              options={patientOptions}
              onSearch={searchPatients}
              onSelect={(_v, opt: PatientOption) => setSelectedPatientId(opt.id)}
              placeholder="Search patient..."
              notFoundContent={patientSearching ? <Spin size="small" /> : 'No patients found'}
            />
          </Form.Item>
          <Form.Item
            label="Blood Type Needed"
            name="bloodType"
            rules={[{ required: true, message: 'Please select blood type' }]}
          >
            <Select options={BLOOD_TYPES.map(bt => ({ value: bt, label: formatBloodType(bt) }))} />
          </Form.Item>
          <Form.Item
            label="Units Needed"
            name="units"
            initialValue={1}
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Clinical notes, urgency..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Transfuse Modal */}
      <Modal
        title="Complete Transfusion"
        open={transfuseModal.open}
        onCancel={() => { setTransfuseModal({ open: false }); transfuseForm.resetFields(); }}
        onOk={() => transfuseForm.submit()}
        okText="Mark as Transfused"
        confirmLoading={transfusePatient.isPending}
      >
        <Form form={transfuseForm} layout="vertical" onFinish={handleTransfuse}>
          <Form.Item label="Blood Unit Used (optional)" name="bloodUnitCode">
            <Select
              allowClear
              placeholder="Select blood unit..."
              options={bloodUnitOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TransfusionRequestPage;
