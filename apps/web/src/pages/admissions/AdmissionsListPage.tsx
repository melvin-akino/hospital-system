import React, { useState } from 'react';
import {
  Table, Button, Input, Space, Tag, Typography, Row, Col, Card, Select, Modal, Form, DatePicker, App,
} from 'antd';
import { PlusOutlined, SearchOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAdmissions, useDischargePatient } from '../../hooks/useAdmissions';
import type { Admission } from '../../services/admissionService';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = {
  ADMITTED: 'green',
  DISCHARGED: 'default',
  TRANSFERRED: 'orange',
};

const AdmissionsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ADMITTED');
  const [dischargeModal, setDischargeModal] = useState<{ open: boolean; admission?: Admission }>({ open: false });
  const [dischargeForm] = Form.useForm();

  const { data, isLoading } = useAdmissions({
    page,
    limit: 20,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: search || undefined,
  });

  const discharge = useDischargePatient();

  const handleDischarge = async (values: { dischargeNotes?: string; dischargedAt?: dayjs.Dayjs }) => {
    if (!dischargeModal.admission) return;
    await discharge.mutateAsync({
      id: dischargeModal.admission.id,
      data: {
        dischargeNotes: values.dischargeNotes,
        dischargedAt: values.dischargedAt ? values.dischargedAt.toISOString() : undefined,
      },
    });
    setDischargeModal({ open: false });
    dischargeForm.resetFields();
    message.success('Patient discharged');
  };

  const columns = [
    {
      title: 'Admission #',
      dataIndex: 'admissionNo',
      width: 160,
      render: (v: string) => <Text strong style={{ color: '#1890ff' }}>{v}</Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: Admission) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.patient?.lastName}, {row.patient?.firstName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.patient?.patientNo}</Text>
        </Space>
      ),
    },
    {
      title: 'Room',
      key: 'room',
      render: (_: unknown, row: Admission) => row.room
        ? <span>Room {row.room.roomNumber} <Text type="secondary">({row.room.roomType?.name || 'General'})</Text></span>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Attending Doctor',
      dataIndex: 'attendingDoctor',
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Admitted',
      dataIndex: 'admittedAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY h:mm A'),
    },
    {
      title: 'Days',
      dataIndex: 'daysStayed',
      render: (v: number) => <Tag color={v > 7 ? 'red' : 'blue'}>{v} day{v !== 1 ? 's' : ''}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, row: Admission) => (
        <Space>
          {row.status === 'ADMITTED' && (
            <Button
              size="small"
              danger
              icon={<LogoutOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setDischargeModal({ open: true, admission: row });
              }}
            >
              Discharge
            </Button>
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
            Admissions
            {data?.total !== undefined && (
              <Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>
                ({data.total} total)
              </Text>
            )}
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admissions/new')}>
            Admit Patient
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col flex="auto">
            <Input
              placeholder="Search admission no., patient name..."
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
              value={statusFilter}
              style={{ width: 140 }}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'ADMITTED', label: 'Admitted' },
                { value: 'DISCHARGED', label: 'Discharged' },
                { value: 'TRANSFERRED', label: 'Transferred' },
              ]}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => { setSearch(searchInput); setPage(1); }}
            >
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
          showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`,
        }}
      />

      {/* Discharge Modal */}
      <Modal
        title="Discharge Patient"
        open={dischargeModal.open}
        onCancel={() => { setDischargeModal({ open: false }); dischargeForm.resetFields(); }}
        onOk={() => dischargeForm.submit()}
        okText="Confirm Discharge"
        okButtonProps={{ danger: true, loading: discharge.isPending }}
      >
        {dischargeModal.admission && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <Text strong>
              {dischargeModal.admission.patient?.lastName}, {dischargeModal.admission.patient?.firstName}
            </Text>
            <br />
            <Text type="secondary">
              {dischargeModal.admission.admissionNo} · Room {dischargeModal.admission.room?.roomNumber || '—'}
            </Text>
            <br />
            <Text type="secondary">
              Admitted: {dayjs(dischargeModal.admission.admittedAt).format('MMM D, YYYY')} · {dischargeModal.admission.daysStayed} days
            </Text>
          </div>
        )}
        <Form form={dischargeForm} layout="vertical" onFinish={handleDischarge}>
          <Form.Item label="Discharge Notes" name="dischargeNotes">
            <Input.TextArea rows={3} placeholder="Enter discharge notes..." />
          </Form.Item>
          <Form.Item label="Discharge Date & Time" name="dischargedAt">
            <DatePicker showTime style={{ width: '100%' }} defaultValue={dayjs()} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdmissionsListPage;
