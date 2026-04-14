import React, { useState } from 'react';
import {
  Card, Row, Col, Typography, Statistic, Tabs, Table, Tag, Button, Select,
  Form, Input, Space, Modal, Switch, Alert, Spin,
} from 'antd';
import {
  ShareAltOutlined, PlusOutlined, AuditOutlined, SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePatients } from '../../hooks/usePatients';
import {
  useHieConsent, useHieRequests, useHieReferrals, useHieAuditLog, useFhirBundle,
  useRecordConsent, useRequestRecords, useSendReferral,
} from '../../hooks/useHIE';
import type { HieRequest, HieReferral, AuditEntry } from '../../services/hieService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const urgencyColors: Record<string, string> = {
  ROUTINE: 'blue',
  URGENT: 'orange',
  EMERGENCY: 'red',
};

const requestStatusColors: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  DENIED: 'red',
};

// --- Consent Tab ---
const ConsentTab: React.FC = () => {
  const [patientId, setPatientId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { data: patientsData } = usePatients({ limit: '200' });
  const { data: consent, isLoading } = useHieConsent(patientId);
  const recordConsent = useRecordConsent();
  const patients = (patientsData as { data?: unknown[] })?.data || [];

  const handleToggle = async (type: 'SHARE' | 'RESTRICT') => {
    if (!patientId) return;
    await recordConsent.mutateAsync({ patientId, consentType: type });
  };

  return (
    <Card title="Patient Consent Management">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Select
          showSearch
          placeholder="Search patient..."
          style={{ width: 320 }}
          filterOption={(input, option) =>
            String(option?.label || '').toLowerCase().includes(input.toLowerCase())
          }
          onChange={(v) => setPatientId(v)}
          options={(patients as Array<{ id: string; firstName: string; lastName: string; patientNo: string }>).map((p) => ({
            label: `${p.firstName} ${p.lastName} (${p.patientNo})`,
            value: p.id,
          }))}
          value={patientId || undefined}
        />

        {patientId && (
          <>
            {isLoading ? (
              <Spin />
            ) : consent?.hasConsent ? (
              <Alert
                type={consent.consentType === 'SHARE' ? 'success' : 'warning'}
                message={`Consent Status: ${consent.consentType}`}
                description={
                  <div>
                    {consent.authorizedHospital && (
                      <div>Authorized Hospital: {consent.authorizedHospital}</div>
                    )}
                    {consent.notes && <div>Notes: {consent.notes}</div>}
                    <div style={{ marginTop: 8 }}>
                      Last updated: {consent.updatedAt ? dayjs(consent.updatedAt).format('MMM D, YYYY HH:mm') : '—'}
                    </div>
                  </div>
                }
              />
            ) : (
              <Alert type="info" message="No consent recorded for this patient" />
            )}
            <Space>
              <Button
                type="primary"
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => handleToggle('SHARE')}
                loading={recordConsent.isPending}
              >
                Allow Record Sharing
              </Button>
              <Button
                danger
                onClick={() => handleToggle('RESTRICT')}
                loading={recordConsent.isPending}
              >
                Restrict Record Sharing
              </Button>
            </Space>
          </>
        )}
      </Space>
    </Card>
  );
};

// --- Requests Tab ---
const RequestsTab: React.FC = () => {
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();
  const { data: requests = [], isLoading } = useHieRequests();
  const { data: patientsData } = usePatients({ limit: '200' });
  const requestRecords = useRequestRecords();
  const patients = (patientsData as { data?: unknown[] })?.data || [];

  const cols = [
    { title: 'Request #', dataIndex: 'requestNo', width: 160 },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: HieRequest) =>
        row.patient ? `${row.patient.firstName} ${row.patient.lastName}` : row.patientId,
    },
    { title: 'Requesting', dataIndex: 'requestingFacility' },
    { title: 'Requested From', dataIndex: 'requestedFacility' },
    { title: 'Reason', dataIndex: 'reason' },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => <Tag color={requestStatusColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      width: 130,
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
  ];

  return (
    <Card
      title="Record Requests"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>
          New Request
        </Button>
      }
    >
      <Table dataSource={requests} columns={cols} rowKey="id" loading={isLoading} size="small" />
      <Modal
        title="Request Patient Records"
        open={modal}
        onCancel={() => { setModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={requestRecords.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            await requestRecords.mutateAsync(values);
            setModal(false);
            form.resetFields();
          }}
        >
          <Form.Item name="patientId" label="Patient" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select patient"
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              options={(patients as Array<{ id: string; firstName: string; lastName: string; patientNo: string }>).map((p) => ({
                label: `${p.firstName} ${p.lastName} (${p.patientNo})`,
                value: p.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="requestingFacility" label="Requesting Facility" rules={[{ required: true }]}>
            <Input defaultValue="PIBS Hospital" />
          </Form.Item>
          <Form.Item name="requestedFacility" label="Requested Facility" rules={[{ required: true }]}>
            <Input placeholder="e.g. National Kidney Transplant Institute" />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

// --- Referrals Tab ---
const ReferralsTab: React.FC = () => {
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();
  const { data: referrals = [], isLoading } = useHieReferrals();
  const { data: patientsData } = usePatients({ limit: '200' });
  const sendReferral = useSendReferral();
  const patients = (patientsData as { data?: unknown[] })?.data || [];

  const cols = [
    { title: 'Referral #', dataIndex: 'referralNo', width: 160 },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: HieReferral) =>
        row.patient ? `${row.patient.firstName} ${row.patient.lastName}` : row.patientId,
    },
    { title: 'Referring Doctor', dataIndex: 'referringDoctor' },
    { title: 'Receiving Facility', dataIndex: 'receivingFacility' },
    {
      title: 'Urgency',
      dataIndex: 'urgency',
      width: 110,
      render: (v: string) => <Tag color={urgencyColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => <Tag color={{ SENT: 'blue', RECEIVED: 'orange', COMPLETED: 'green' }[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      width: 130,
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
  ];

  return (
    <Card
      title="Patient Referrals"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>
          Send Referral
        </Button>
      }
    >
      <Table dataSource={referrals} columns={cols} rowKey="id" loading={isLoading} size="small" />
      <Modal
        title="Send Patient Referral"
        open={modal}
        onCancel={() => { setModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={sendReferral.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            await sendReferral.mutateAsync(values);
            setModal(false);
            form.resetFields();
          }}
        >
          <Form.Item name="patientId" label="Patient" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select patient"
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              options={(patients as Array<{ id: string; firstName: string; lastName: string; patientNo: string }>).map((p) => ({
                label: `${p.firstName} ${p.lastName} (${p.patientNo})`,
                value: p.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="referringDoctor" label="Referring Doctor" rules={[{ required: true }]}>
            <Input placeholder="e.g. Dr. Juan Dela Cruz" />
          </Form.Item>
          <Form.Item name="receivingFacility" label="Receiving Facility" rules={[{ required: true }]}>
            <Input placeholder="e.g. Philippine General Hospital" />
          </Form.Item>
          <Form.Item name="urgency" label="Urgency" initialValue="ROUTINE">
            <Select
              options={[
                { label: 'Routine', value: 'ROUTINE' },
                { label: 'Urgent', value: 'URGENT' },
                { label: 'Emergency', value: 'EMERGENCY' },
              ]}
            />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

// --- FHIR Bundle Tab ---
const FhirBundleTab: React.FC = () => {
  const [patientId, setPatientId] = useState('');
  const { data: patientsData } = usePatients({ limit: '200' });
  const { data: bundle, isLoading, refetch } = useFhirBundle(patientId);
  const patients = (patientsData as { data?: unknown[] })?.data || [];

  return (
    <Card title="FHIR R4 Patient Bundle Viewer">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Select
            showSearch
            placeholder="Select patient"
            style={{ width: 320 }}
            filterOption={(input, option) =>
              String(option?.label || '').toLowerCase().includes(input.toLowerCase())
            }
            onChange={(v) => setPatientId(v)}
            options={(patients as Array<{ id: string; firstName: string; lastName: string; patientNo: string }>).map((p) => ({
              label: `${p.firstName} ${p.lastName} (${p.patientNo})`,
              value: p.id,
            }))}
          />
          {patientId && (
            <Button icon={<SearchOutlined />} onClick={() => refetch()}>
              Refresh Bundle
            </Button>
          )}
        </Space>
        {isLoading && <Spin />}
        {bundle && (
          <pre
            style={{
              background: '#f5f5f5',
              padding: 16,
              overflow: 'auto',
              fontSize: 12,
              borderRadius: 4,
              maxHeight: 600,
            }}
          >
            {JSON.stringify(bundle, null, 2)}
          </pre>
        )}
        {patientId && !isLoading && !bundle && (
          <Text type="secondary">No FHIR bundle available</Text>
        )}
      </Space>
    </Card>
  );
};

// --- Audit Log Tab ---
const AuditLogTab: React.FC = () => {
  const { data: log = [], isLoading } = useHieAuditLog();

  const cols = [
    {
      title: 'Time',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => dayjs(v).format('MMM D, YYYY HH:mm'),
    },
    { title: 'Action', dataIndex: 'action', width: 180 },
    { title: 'Performed By', dataIndex: 'performedBy', width: 140 },
    { title: 'Facility', dataIndex: 'facility', width: 160 },
    { title: 'Details', dataIndex: 'details' },
  ];

  return (
    <Card title={<><AuditOutlined /> HIE Access Audit Log</>}>
      <Table
        dataSource={log as AuditEntry[]}
        columns={cols}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 20 }}
      />
    </Card>
  );
};

// --- Main ---
const HIEDashboardPage: React.FC = () => {
  const { data: requests = [] } = useHieRequests();
  const { data: referrals = [] } = useHieReferrals();
  const { data: auditLog = [] } = useHieAuditLog();

  const stats = [
    { title: 'Pending Requests', value: (requests as HieRequest[]).filter((r) => r.status === 'PENDING').length, color: '#faad14' },
    { title: 'Referrals Sent', value: (referrals as HieReferral[]).length, color: '#1890ff' },
    { title: 'Audit Entries', value: (auditLog as AuditEntry[]).length, color: '#722ed1' },
    { title: 'Total Requests', value: (requests as HieRequest[]).length, color: '#52c41a' },
  ];

  const tabItems = [
    { key: 'consent', label: 'Patient Consent', children: <ConsentTab /> },
    { key: 'requests', label: 'Record Requests', children: <RequestsTab /> },
    { key: 'referrals', label: 'Referrals', children: <ReferralsTab /> },
    { key: 'fhir', label: 'FHIR Bundle Viewer', children: <FhirBundleTab /> },
    { key: 'audit', label: 'Audit Log', children: <AuditLogTab /> },
  ];

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 16 }}>
        <ShareAltOutlined /> HIE / Health Information Exchange
      </Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {stats.map((s) => (
          <Col key={s.title} xs={12} sm={6}>
            <Card>
              <Statistic title={s.title} value={s.value} valueStyle={{ color: s.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Tabs items={tabItems} />
    </div>
  );
};

export default HIEDashboardPage;
