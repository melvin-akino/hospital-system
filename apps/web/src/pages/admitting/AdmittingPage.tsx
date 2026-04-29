import React, { useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, Row, Col, Input,
  Statistic, Drawer, Tabs, Descriptions, Divider, Checkbox, Modal,
  Form, Select, Badge, Tooltip, Alert, InputNumber,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, UserOutlined, SafetyOutlined, HomeOutlined,
  ExclamationCircleOutlined, EditOutlined, CheckOutlined, MedicineBoxOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../lib/api';
import AdmissionWizard from './AdmissionWizard';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_COLOR: Record<string, string> = {
  PROCESSING: 'orange',
  ADMITTED: 'blue',
  DISCHARGED: 'green',
  TRANSFERRED: 'purple',
};

const SERVICE_CLASS_COLOR: Record<string, string> = {
  PRIVATE: 'gold',
  SEMI_PRIVATE: 'blue',
  WARD: 'default',
  CHARITY: 'green',
};

const AdmittingPage: React.FC = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ADMITTED');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [signModal, setSignModal] = useState<any>(null); // { consent }
  const [consentForm] = Form.useForm();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['admitting-stats'],
    queryFn: () => api.get('/admissions/stats').then((r) => r.data?.data || {}),
    refetchInterval: 30000,
  });

  const { data: admissionsData, isLoading } = useQuery({
    queryKey: ['admitting-queue', statusFilter, search],
    queryFn: () =>
      api.get('/admissions', {
        params: { status: statusFilter === 'ALL' ? undefined : statusFilter, search: search || undefined, limit: 100 },
      }).then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 30000,
  });

  const { data: detail, refetch: refetchDetail } = useQuery({
    queryKey: ['admission-detail', selected?.id],
    queryFn: () => api.get(`/admissions/${selected?.id}`).then((r) => r.data?.data),
    enabled: !!selected?.id && drawerOpen,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const markDocMutation = useMutation({
    mutationFn: ({ admissionId, docId, isReceived }: any) =>
      api.put(`/admissions/${admissionId}/documents/${docId}`, { isReceived }),
    onSuccess: () => refetchDetail(),
  });

  const signConsentMutation = useMutation({
    mutationFn: ({ admissionId, consentId, data }: any) =>
      api.put(`/admissions/${admissionId}/consents/${consentId}/sign`, data),
    onSuccess: () => { refetchDetail(); setSignModal(null); consentForm.resetFields(); },
  });

  const unsignConsentMutation = useMutation({
    mutationFn: ({ admissionId, consentId }: any) =>
      api.put(`/admissions/${admissionId}/consents/${consentId}/unsign`, {}),
    onSuccess: () => refetchDetail(),
  });

  // ── Derived stats ────────────────────────────────────────────────────────────
  const admissions = admissionsData || [];

  const columns = [
    {
      title: 'Adm #',
      dataIndex: 'admissionNo',
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
      width: 110,
    },
    {
      title: 'Patient',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.patient?.lastName}, {r.patient?.firstName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    {
      title: 'Class',
      dataIndex: 'serviceClass',
      render: (v: string) => v ? <Tag color={SERVICE_CLASS_COLOR[v] || 'default'}>{v?.replace('_', ' ')}</Tag> : '—',
      width: 110,
    },
    {
      title: 'Room',
      render: (_: any, r: any) => r.room
        ? <Space direction="vertical" size={0}><Text strong>Rm {r.room.roomNumber}</Text><Text type="secondary" style={{ fontSize: 11 }}>{r.room.roomType?.name}</Text></Space>
        : <Tag color="warning">Unassigned</Tag>,
      width: 110,
    },
    {
      title: 'Attending',
      dataIndex: 'attendingDoctor',
      render: (v: string) => v || '—',
    },
    {
      title: 'Coverage',
      render: (_: any, r: any) => (
        <Space wrap size={2}>
          {r.hmoName && <Tag color="blue" style={{ fontSize: 10 }}>HMO: {r.hmoName}</Tag>}
          {r.philhealthNumber && <Tag color="cyan" style={{ fontSize: 10 }}>PhilHealth</Tag>}
          {r.discountType && r.discountType !== 'NONE' && <Tag color="gold" style={{ fontSize: 10 }}>{r.discountType}</Tag>}
          {!r.hmoName && !r.philhealthNumber && <Tag style={{ fontSize: 10 }}>Cash</Tag>}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v] || 'default'}>{v}</Tag>,
      width: 110,
    },
    {
      title: 'Admitted',
      dataIndex: 'admittedAt',
      render: (v: string) => dayjs(v).format('MMM D, h:mm A'),
      width: 130,
    },
    {
      title: '',
      render: (_: any, r: any) => (
        <Button size="small" icon={<FileTextOutlined />} onClick={() => { setSelected(r); setDrawerOpen(true); }}>
          View
        </Button>
      ),
      width: 70,
    },
  ];

  // ── Detail Drawer ────────────────────────────────────────────────────────────
  const docCount = detail?.documents?.length || 0;
  const docReceived = detail?.documents?.filter((d: any) => d.isReceived).length || 0;
  const consentCount = detail?.consents?.filter((c: any) => c.isRequired).length || 0;
  const consentSigned = detail?.consents?.filter((c: any) => c.isRequired && c.isSigned).length || 0;

  const renderDetail = () => {
    if (!detail) return null;
    const p = detail.patient;
    return (
      <Tabs
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <div>
                <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="Admission #" span={2}><Text code>{detail.admissionNo}</Text></Descriptions.Item>
                  <Descriptions.Item label="Patient">{p?.lastName}, {p?.firstName} {p?.middleName}</Descriptions.Item>
                  <Descriptions.Item label="Patient No.">{p?.patientNo}</Descriptions.Item>
                  <Descriptions.Item label="Gender">{p?.gender}</Descriptions.Item>
                  <Descriptions.Item label="Date of Birth">{p?.dateOfBirth ? dayjs(p.dateOfBirth).format('MMM D, YYYY') : '—'}</Descriptions.Item>
                  <Descriptions.Item label="Phone">{p?.phone || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Address" span={2}>{p?.address || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[detail.status]}>{detail.status}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Service Class"><Tag color={SERVICE_CLASS_COLOR[detail.serviceClass] || 'default'}>{detail.serviceClass?.replace('_', ' ') || '—'}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Type">{detail.admissionType}</Descriptions.Item>
                  <Descriptions.Item label="Source">{detail.admissionSource?.replace('_', ' ') || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Room" span={2}>{detail.room ? `Room ${detail.room.roomNumber} — ${detail.room.roomType?.name}` : <Tag color="warning">No room assigned</Tag>}</Descriptions.Item>
                  <Descriptions.Item label="Attending Physician" span={2}>{detail.attendingDoctor || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Chief Complaint" span={2}>{detail.chiefComplaint || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Admitting Diagnosis" span={2}>{detail.diagnosis || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Admitted">{dayjs(detail.admittedAt).format('MMM D, YYYY h:mm A')}</Descriptions.Item>
                  <Descriptions.Item label="Days Stayed">{detail.daysStayed}</Descriptions.Item>
                </Descriptions>

                <Divider orientation="left">Coverage</Divider>
                <Descriptions size="small" bordered column={2}>
                  <Descriptions.Item label="HMO" span={2}>{detail.hmoName ? `${detail.hmoName} — Card: ${detail.hmoCardNumber || '—'}` : '—'}</Descriptions.Item>
                  {detail.hmoLOANumber && <Descriptions.Item label="LOA #">{detail.hmoLOANumber}</Descriptions.Item>}
                  {detail.hmoApprovedAmount && <Descriptions.Item label="HMO Approved">₱{Number(detail.hmoApprovedAmount).toLocaleString()}</Descriptions.Item>}
                  <Descriptions.Item label="PhilHealth">{detail.philhealthNumber || p?.philhealthNo || '—'}</Descriptions.Item>
                  <Descriptions.Item label="PH Member Type">{detail.philhealthMemberType || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Discount">{detail.discountType && detail.discountType !== 'NONE' ? detail.discountType : 'None'}</Descriptions.Item>
                  <Descriptions.Item label="Senior/PWD ID">{detail.seniorPWDId || '—'}</Descriptions.Item>
                </Descriptions>

                <Divider orientation="left">Guarantor</Divider>
                <Descriptions size="small" bordered column={2}>
                  <Descriptions.Item label="Name">{detail.guarantorName || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Relationship">{detail.guarantorRelationship || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Contact">{detail.guarantorContact || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Address">{detail.guarantorAddress || '—'}</Descriptions.Item>
                </Descriptions>

                {(detail.initialDeposit || detail.depositMethod) && (
                  <>
                    <Divider orientation="left">Deposit</Divider>
                    <Descriptions size="small" bordered column={2}>
                      <Descriptions.Item label="Amount">₱{Number(detail.initialDeposit || 0).toLocaleString()}</Descriptions.Item>
                      <Descriptions.Item label="Method">{detail.depositMethod || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Received By">{detail.depositReceivedBy || '—'}</Descriptions.Item>
                    </Descriptions>
                  </>
                )}
              </div>
            ),
          },
          {
            key: 'documents',
            label: (
              <Space>
                Documents
                {docReceived < docCount
                  ? <Badge count={docCount - docReceived} size="small" />
                  : <CheckCircleOutlined style={{ color: '#52c41a' }} />}
              </Space>
            ),
            children: (
              <div>
                <Alert
                  showIcon
                  type={docReceived === docCount ? 'success' : 'warning'}
                  message={`${docReceived} of ${docCount} documents received`}
                  style={{ marginBottom: 16 }}
                />
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  {(detail.documents || []).map((doc: any) => (
                    <Card key={doc.id} size="small" style={{ borderColor: doc.isReceived ? '#b7eb8f' : '#ffccc7' }}>
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Space>
                            {doc.isReceived
                              ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                              : <ClockCircleOutlined style={{ color: '#fa8c16' }} />}
                            <div>
                              <Text strong>{doc.documentName}</Text>
                              {doc.isReceived && doc.receivedAt && (
                                <div><Text type="secondary" style={{ fontSize: 11 }}>Received {dayjs(doc.receivedAt).format('MMM D h:mm A')}{doc.receivedBy ? ` by ${doc.receivedBy}` : ''}</Text></div>
                              )}
                              {doc.notes && <div><Text type="secondary" style={{ fontSize: 11 }}>{doc.notes}</Text></div>}
                            </div>
                          </Space>
                        </Col>
                        <Col>
                          <Checkbox
                            checked={doc.isReceived}
                            onChange={(e) => markDocMutation.mutate({ admissionId: detail.id, docId: doc.id, isReceived: e.target.checked })}
                          >
                            {doc.isReceived ? 'Received' : 'Mark Received'}
                          </Checkbox>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </Space>
              </div>
            ),
          },
          {
            key: 'consents',
            label: (
              <Space>
                Consents
                {consentSigned < consentCount
                  ? <Badge count={consentCount - consentSigned} size="small" />
                  : <CheckCircleOutlined style={{ color: '#52c41a' }} />}
              </Space>
            ),
            children: (
              <div>
                <Alert
                  showIcon
                  type={consentSigned === consentCount ? 'success' : 'warning'}
                  message={`${consentSigned} of ${consentCount} required consents signed`}
                  style={{ marginBottom: 16 }}
                />
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  {(detail.consents || []).map((c: any) => (
                    <Card key={c.id} size="small" style={{ borderColor: c.isSigned ? '#b7eb8f' : c.isRequired ? '#ffccc7' : '#d9d9d9' }}>
                      <Row justify="space-between" align="middle">
                        <Col flex="auto">
                          <Space>
                            {c.isSigned
                              ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                              : c.isRequired
                                ? <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                                : <ClockCircleOutlined style={{ color: '#d9d9d9' }} />}
                            <div>
                              <Space>
                                <Text strong>{c.consentLabel}</Text>
                                {c.isRequired && !c.isSigned && <Tag color="red" style={{ fontSize: 10 }}>Required</Tag>}
                                {!c.isRequired && <Tag color="default" style={{ fontSize: 10 }}>Optional</Tag>}
                              </Space>
                              {c.isSigned && (
                                <div>
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    Signed by: {c.signedByName || '—'} ({c.signerRelationship || '—'})
                                    {c.witnessName ? ` · Witness: ${c.witnessName}` : ''}
                                    {c.signedAt ? ` · ${dayjs(c.signedAt).format('MMM D h:mm A')}` : ''}
                                  </Text>
                                </div>
                              )}
                            </div>
                          </Space>
                        </Col>
                        <Col>
                          {c.isSigned ? (
                            <Button size="small" danger onClick={() => unsignConsentMutation.mutate({ admissionId: detail.id, consentId: c.id })}>
                              Unsign
                            </Button>
                          ) : (
                            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => setSignModal({ consent: c, admissionId: detail.id })}>
                              Sign
                            </Button>
                          )}
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </Space>
              </div>
            ),
          },
        ]}
      />
    );
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <UserOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>Admitting</Title>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setWizardOpen(true)}>
            New Admission
          </Button>
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><Card><Statistic title="Currently Admitted" value={stats?.totalAdmitted || 0} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Processing" value={stats?.processing || 0} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Available Rooms" value={stats?.availableRooms || 0} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Occupancy Rate" value={stats?.occupancyRate || 0} suffix="%" valueStyle={{ color: stats?.occupancyRate > 80 ? '#cf1322' : '#52c41a' }} /></Card></Col>
      </Row>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><Card><Statistic title="Pending Documents" value={stats?.pendingDocs || 0} valueStyle={{ color: stats?.pendingDocs > 0 ? '#fa8c16' : '#52c41a' }} suffix={<FileTextOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Unsigned Consents" value={stats?.pendingConsents || 0} valueStyle={{ color: stats?.pendingConsents > 0 ? '#ff4d4f' : '#52c41a' }} suffix={<SafetyOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Avg Length of Stay" value={stats?.avgLengthOfStay || 0} suffix="days" /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Total Beds" value={stats?.totalRooms || 0} /></Card></Col>
      </Row>

      {/* Table */}
      <Card
        title="Admissions"
        extra={
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
              options={[
                { value: 'ALL',        label: 'All' },
                { value: 'PROCESSING', label: 'Processing' },
                { value: 'ADMITTED',   label: 'Admitted' },
                { value: 'DISCHARGED', label: 'Discharged' },
              ]}
            />
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search patient or adm #"
              size="small"
              style={{ width: 220 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Space>
        }
      >
        <Table
          dataSource={admissions}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 15 }}
          onRow={(r) => ({ style: { cursor: 'pointer' }, onClick: () => { setSelected(r); setDrawerOpen(true); } })}
        />
      </Card>

      {/* Admission Wizard */}
      <AdmissionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => { setWizardOpen(false); qc.invalidateQueries({ queryKey: ['admitting-queue'] }); qc.invalidateQueries({ queryKey: ['admitting-stats'] }); }}
      />

      {/* Detail Drawer */}
      <Drawer
        title={
          detail
            ? <Space>
                <Text strong>{detail.patient?.lastName}, {detail.patient?.firstName}</Text>
                <Text code style={{ fontSize: 11 }}>{detail.admissionNo}</Text>
                <Tag color={STATUS_COLOR[detail?.status]}>{detail?.status}</Tag>
              </Space>
            : 'Admission Detail'
        }
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        width={720}
        extra={
          <Space>
            {detail && detail.status === 'ADMITTED' && (
              <Tooltip title="Edit admission details">
                <Button icon={<EditOutlined />} size="small">Edit</Button>
              </Tooltip>
            )}
            {detail && detail.status === 'DISCHARGED' && (
              <Tooltip title="View discharge summary">
                <Button
                  icon={<MedicineBoxOutlined />}
                  size="small"
                  type="primary"
                  ghost
                  onClick={() => navigate(`/admissions/${detail.id}/discharge-summary`)}
                >
                  Discharge Summary
                </Button>
              </Tooltip>
            )}
          </Space>
        }
      >
        {renderDetail()}
      </Drawer>

      {/* Sign Consent Modal */}
      <Modal
        title={`Sign Consent: ${signModal?.consent?.consentLabel}`}
        open={!!signModal}
        onCancel={() => { setSignModal(null); consentForm.resetFields(); }}
        onOk={() => consentForm.submit()}
        confirmLoading={signConsentMutation.isPending}
      >
        <Form
          form={consentForm}
          layout="vertical"
          onFinish={(v) => signConsentMutation.mutate({ admissionId: signModal?.admissionId, consentId: signModal?.consent?.id, data: v })}
        >
          <Form.Item name="signedByName" label="Signed by (Full Name)" rules={[{ required: true }]}>
            <Input placeholder="Name of patient or authorized representative..." />
          </Form.Item>
          <Form.Item name="signerRelationship" label="Relationship to Patient" rules={[{ required: true }]}>
            <Select options={[
              { value: 'SELF', label: 'Patient (Self)' },
              { value: 'SPOUSE', label: 'Spouse' },
              { value: 'PARENT', label: 'Parent' },
              { value: 'CHILD', label: 'Child' },
              { value: 'SIBLING', label: 'Sibling' },
              { value: 'GUARDIAN', label: 'Legal Guardian' },
              { value: 'RELATIVE', label: 'Relative' },
            ]} />
          </Form.Item>
          <Form.Item name="witnessName" label="Witness Name">
            <Input placeholder="Name of staff witness..." />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdmittingPage;
