import React, { useState } from 'react';
import {
  Card,
  Typography,
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Alert,
  Descriptions,
  AutoComplete,
  Divider,
  Timeline,
  Modal,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  AuditOutlined,
  SendOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useHmoCompanies, useHmoClaims } from '../../hooks/useHMO';
import { hmoApiService, HmoEligibilityResult, HmoClaimStatusResult } from '../../services/hmoApiService';
import { patientService } from '../../services/patientService';

const { Title, Text } = Typography;
const { Option } = Select;

interface Patient {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
}

interface HmoClaim {
  id: string;
  claimNo: string;
  status: string;
  amount: number;
  hmoCompanyId: string;
  hmoCompany?: { name: string; code: string };
}

const HMODirectBillingPage: React.FC = () => {
  const [eligForm] = Form.useForm();
  const [authForm] = Form.useForm();

  const [eligResult, setEligResult] = useState<HmoEligibilityResult | null>(null);
  const [eligLoading, setEligLoading] = useState(false);

  const [authResult, setAuthResult] = useState<Record<string, unknown> | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [submittedRefs, setSubmittedRefs] = useState<Record<string, string>>({});
  const [statusModal, setStatusModal] = useState<{ visible: boolean; data: HmoClaimStatusResult | null }>({
    visible: false,
    data: null,
  });

  // Patient autocomplete
  const [patientOptionsElig, setPatientOptionsElig] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedPatientIdElig, setSelectedPatientIdElig] = useState('');
  const [selectedHmoIdElig, setSelectedHmoIdElig] = useState('');

  const [patientOptionsAuth, setPatientOptionsAuth] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedPatientIdAuth, setSelectedPatientIdAuth] = useState('');
  const [selectedHmoIdAuth, setSelectedHmoIdAuth] = useState('');

  const { data: companiesData } = useHmoCompanies();
  const { data: claimsData } = useHmoClaims({ status: 'PENDING' });

  const companies: { id: string; name: string; code: string }[] = companiesData?.data || [];
  const pendingClaims: HmoClaim[] = claimsData?.data || [];

  const handlePatientSearchElig = async (q: string) => {
    if (q.length < 2) return;
    const res = await patientService.search(q);
    const patients: Patient[] = res?.data || [];
    setPatientOptionsElig(
      patients.map((p) => ({
        value: p.id,
        label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
      }))
    );
  };

  const handlePatientSearchAuth = async (q: string) => {
    if (q.length < 2) return;
    const res = await patientService.search(q);
    const patients: Patient[] = res?.data || [];
    setPatientOptionsAuth(
      patients.map((p) => ({
        value: p.id,
        label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
      }))
    );
  };

  const handleCheckEligibility = async () => {
    if (!selectedHmoIdElig) {
      message.warning('Please select an HMO company');
      return;
    }
    if (!selectedPatientIdElig) {
      message.warning('Please select a patient');
      return;
    }
    setEligLoading(true);
    try {
      const res = await hmoApiService.verifyEligibility(selectedHmoIdElig, selectedPatientIdElig);
      setEligResult(res.data ?? null);
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Eligibility check failed';
      message.error(errMsg);
    } finally {
      setEligLoading(false);
    }
  };

  const handleRequestAuth = async (values: {
    procedureCodes: string;
    estimatedAmount: number;
    diagnosis?: string;
  }) => {
    if (!selectedHmoIdAuth || !selectedPatientIdAuth) {
      message.warning('Please select HMO and patient');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await hmoApiService.requestAuthorization(selectedHmoIdAuth, {
        patientId: selectedPatientIdAuth,
        procedureCodes: values.procedureCodes
          ? values.procedureCodes.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        estimatedAmount: values.estimatedAmount,
        diagnosis: values.diagnosis,
      });
      setAuthResult(res.data as Record<string, unknown> ?? null);
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Authorization request failed';
      message.error(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmitClaim = async (claim: HmoClaim) => {
    try {
      const res = await hmoApiService.submitClaim(claim.hmoCompanyId, claim.id);
      if (res.data?.referenceNo) {
        setSubmittedRefs((prev) => ({ ...prev, [claim.id]: res.data!.referenceNo }));
        message.success(`Submitted. Reference: ${res.data.referenceNo}`);
      }
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Submission failed';
      message.error(errMsg);
    }
  };

  const handleViewStatus = async (claim: HmoClaim) => {
    try {
      const res = await hmoApiService.getClaimStatus(claim.hmoCompanyId, claim.id);
      setStatusModal({ visible: true, data: res.data ?? null });
    } catch {
      message.error('Failed to fetch claim status');
    }
  };

  const pendingColumns = [
    { title: 'Claim No.', dataIndex: 'claimNo', key: 'claimNo' },
    {
      title: 'HMO',
      key: 'hmo',
      render: (_: unknown, row: HmoClaim) =>
        row.hmoCompany ? (
          <Space>
            <Text strong>{row.hmoCompany.name}</Text>
            <Tag>{row.hmoCompany.code}</Tag>
          </Space>
        ) : '—',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color="orange">{v}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, row: HmoClaim) => (
        <Space>
          {submittedRefs[row.id] ? (
            <Tag color="blue">Ref: {submittedRefs[row.id]}</Tag>
          ) : (
            <Button
              type="primary"
              size="small"
              icon={<SendOutlined />}
              onClick={() => handleSubmitClaim(row)}
            >
              Submit to HMO
            </Button>
          )}
          <Button size="small" onClick={() => handleViewStatus(row)}>
            Track
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 16 }}>
        <SafetyOutlined style={{ marginRight: 8 }} />
        HMO Direct Billing API
      </Title>

      {/* SECTION 1: Real-time Eligibility Check */}
      <Card
        title="Real-time Eligibility Check"
        style={{ marginBottom: 16 }}
        extra={<Tag color="blue">SIMULATED API</Tag>}
      >
        <Row gutter={16} align="bottom" style={{ marginBottom: 16 }}>
          <Col span={6}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">HMO Company</Text>
            </div>
            <Select
              placeholder="Select HMO"
              style={{ width: '100%' }}
              onChange={setSelectedHmoIdElig}
              allowClear
            >
              {companies.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={10}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Patient</Text>
            </div>
            <AutoComplete
              options={patientOptionsElig}
              onSearch={handlePatientSearchElig}
              onSelect={(value) => setSelectedPatientIdElig(value)}
              placeholder="Search patient..."
              style={{ width: '100%' }}
              allowClear
              onClear={() => setSelectedPatientIdElig('')}
            />
          </Col>
          <Col span={4}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              loading={eligLoading}
              onClick={handleCheckEligibility}
              block
              disabled={!selectedHmoIdElig || !selectedPatientIdElig}
            >
              Check Eligibility
            </Button>
          </Col>
        </Row>

        {eligResult && (
          <Card
            size="small"
            style={{
              borderColor: eligResult.eligible ? '#16a34a' : '#dc2626',
              background: eligResult.eligible ? '#f0fdf4' : '#fef2f2',
            }}
          >
            <Row align="middle" gutter={16}>
              <Col>
                {eligResult.eligible ? (
                  <CheckCircleOutlined style={{ fontSize: 36, color: '#16a34a' }} />
                ) : (
                  <CloseCircleOutlined style={{ fontSize: 36, color: '#dc2626' }} />
                )}
              </Col>
              <Col flex="auto">
                <Descriptions column={3} size="small">
                  <Descriptions.Item label="Patient">
                    <Text strong>{eligResult.patientName}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="HMO">
                    <Text strong>{eligResult.hmoName}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={eligResult.eligible ? 'green' : 'red'} style={{ fontSize: 13 }}>
                      {eligResult.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Member No.">
                    {eligResult.memberNo || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Plan">
                    {eligResult.plan || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Valid Until">
                    {eligResult.validUntil
                      ? dayjs(eligResult.validUntil).format('MMM D, YYYY')
                      : '—'}
                  </Descriptions.Item>
                </Descriptions>
                <Divider style={{ margin: '8px 0' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Raw API Response:{' '}
                  <code style={{ fontSize: 11 }}>
                    {JSON.stringify(eligResult.coverageDetails).slice(0, 120)}...
                  </code>
                </Text>
              </Col>
            </Row>
          </Card>
        )}
      </Card>

      {/* SECTION 2: Authorization Requests */}
      <Card title="Authorization Requests" style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={12}>
            <Form form={authForm} layout="vertical" onFinish={handleRequestAuth}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="HMO Company">
                    <Select
                      placeholder="Select HMO"
                      onChange={setSelectedHmoIdAuth}
                      allowClear
                      style={{ width: '100%' }}
                    >
                      {companies.map((c) => (
                        <Option key={c.id} value={c.id}>
                          {c.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Patient">
                    <AutoComplete
                      options={patientOptionsAuth}
                      onSearch={handlePatientSearchAuth}
                      onSelect={(value) => setSelectedPatientIdAuth(value)}
                      placeholder="Search patient..."
                      allowClear
                      onClear={() => setSelectedPatientIdAuth('')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="procedureCodes" label="Procedure Codes (comma-separated)">
                <Input placeholder="e.g. 99213, 93000, 85025" />
              </Form.Item>

              <Form.Item
                name="estimatedAmount"
                label="Estimated Amount"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber
                  prefix="₱"
                  style={{ width: '100%' }}
                  min={0}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  placeholder="0.00"
                />
              </Form.Item>

              <Form.Item name="diagnosis" label="Diagnosis">
                <Input placeholder="Primary diagnosis" />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                icon={<AuditOutlined />}
                loading={authLoading}
                block
              >
                Request Authorization
              </Button>
            </Form>
          </Col>

          <Col span={12}>
            {authResult ? (
              <Card size="small" title="Authorization Approved" style={{ background: '#f0f9ff' }}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Authorization No.">
                    <Text strong style={{ color: '#0369a1', fontSize: 14 }}>
                      {String(authResult['authorizationNo'] ?? '')}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="HMO">
                    {String(authResult['hmoName'] ?? '')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Estimated Amount">
                    ₱{Number(authResult['estimatedAmount'] ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </Descriptions.Item>
                  <Descriptions.Item label="Approved Amount">
                    <Text strong style={{ color: '#16a34a' }}>
                      ₱{Number(authResult['approvedAmount'] ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Valid Until">
                    {String(authResult['validUntil'] ?? '')}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ) : (
              <div
                style={{
                  height: '100%',
                  minHeight: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  border: '1px dashed #d9d9d9',
                  borderRadius: 8,
                }}
              >
                Authorization result will appear here
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {/* SECTION 3: Pending HMO Claims */}
      <Card
        title="Pending HMO Claims"
        extra={<Tag color="orange">{pendingClaims.length} Pending</Tag>}
      >
        {pendingClaims.length === 0 ? (
          <Alert type="info" message="No pending HMO claims to submit." showIcon />
        ) : (
          <Table
            dataSource={pendingClaims}
            columns={pendingColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* Status Modal */}
      <Modal
        title="Claim Status Tracking"
        open={statusModal.visible}
        onCancel={() => setStatusModal({ visible: false, data: null })}
        footer={null}
        width={500}
      >
        {statusModal.data && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Claim No.">{statusModal.data.claimNo}</Descriptions.Item>
              <Descriptions.Item label="HMO">{statusModal.data.hmoName}</Descriptions.Item>
              <Descriptions.Item label="Amount">
                ₱{Number(statusModal.data.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusModal.data.status === 'APPROVED' ? 'green' : statusModal.data.status === 'SUBMITTED' ? 'blue' : 'orange'}>
                  {statusModal.data.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            <Divider orientation="left">Timeline</Divider>
            <Timeline
              items={statusModal.data.timeline.map((t) => ({
                color: t.done ? 'green' : 'gray',
                children: (
                  <div>
                    <Text strong={t.done}>{t.step}</Text>
                    {t.date && (
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {dayjs(t.date).format('MMM D, YYYY h:mm A')}
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default HMODirectBillingPage;
