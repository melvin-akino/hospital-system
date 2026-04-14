import React, { useState } from 'react';
import {
  Card,
  Typography,
  Form,
  Input,
  DatePicker,
  Button,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Alert,
  Descriptions,
  Divider,
  InputNumber,
  AutoComplete,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyOutlined,
  SendOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useVerifyEligibility,
  useSubmitClaim,
  useRequestAuth,
  useEligibilityLog,
} from '../../hooks/usePhilHealth';
import { usePhilHealthClaims, usePhilHealthCaseRates } from '../../hooks/usePhilHealth';
import { patientService } from '../../services/patientService';
import type { EligibilityResult, EligibilityLogEntry } from '../../services/eClaimsService';

const { Title, Text } = Typography;

interface Patient {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  philhealthNo?: string;
}

interface PhilHealthClaim {
  id: string;
  claimNo: string;
  status: string;
  claimAmount: number;
  patient?: { firstName: string; lastName: string; philhealthNo?: string };
}

const EClaimsPage: React.FC = () => {
  const [eligForm] = Form.useForm();
  const [authForm] = Form.useForm();
  const [eligResult, setEligResult] = useState<EligibilityResult | null>(null);
  const [authResult, setAuthResult] = useState<Record<string, unknown> | null>(null);
  const [submittedClaims, setSubmittedClaims] = useState<Record<string, string>>({});

  // Patient search state for auth form
  const [patientOptions, setPatientOptions] = useState<
    { value: string; label: string; patient: Patient }[]
  >([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Case rate search state
  const [caseRateQuery, setCaseRateQuery] = useState('');
  const [selectedCaseRateId, setSelectedCaseRateId] = useState('');

  const verifyMutation = useVerifyEligibility();
  const submitMutation = useSubmitClaim();
  const authMutation = useRequestAuth();

  const { data: eligibilityLogData, isLoading: logLoading } = useEligibilityLog();
  const { data: pendingClaimsData } = usePhilHealthClaims({ status: 'PENDING' });
  const { data: caseRatesData } = usePhilHealthCaseRates(caseRateQuery);

  const handleVerify = async (values: { philhealthNo: string; lastName: string; dateOfBirth: dayjs.Dayjs }) => {
    const result = await verifyMutation.mutateAsync({
      philhealthNo: values.philhealthNo,
      lastName: values.lastName,
      dateOfBirth: values.dateOfBirth.format('YYYY-MM-DD'),
    });
    setEligResult(result.data ?? null);
  };

  const handleSubmitClaim = async (claimId: string) => {
    const result = await submitMutation.mutateAsync(claimId);
    if (result.data?.transmittalNo) {
      setSubmittedClaims((prev) => ({ ...prev, [claimId]: result.data!.transmittalNo }));
    }
  };

  const handleRequestAuth = async (values: {
    estimatedAmount: number;
    admissionDate?: dayjs.Dayjs;
  }) => {
    if (!selectedPatientId) {
      message.warning('Please select a patient');
      return;
    }
    const result = await authMutation.mutateAsync({
      patientId: selectedPatientId,
      caseRateId: selectedCaseRateId || undefined,
      estimatedAmount: values.estimatedAmount,
      admissionDate: values.admissionDate?.format('YYYY-MM-DD'),
    });
    setAuthResult(result.data as Record<string, unknown> ?? null);
  };

  const handlePatientSearch = async (q: string) => {
    if (q.length < 2) return;
    const res = await patientService.search(q);
    const patients: Patient[] = res?.data || [];
    setPatientOptions(
      patients.map((p) => ({
        value: p.id,
        label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
        patient: p,
      }))
    );
  };

  const caseRateOptions = (caseRatesData?.data || []).map((r) => ({
    value: r.id,
    label: `${r.icdCode} — ${r.description}`,
  }));

  const pendingClaims: PhilHealthClaim[] = pendingClaimsData?.data || [];
  const eligibilityLog: EligibilityLogEntry[] = eligibilityLogData?.data || [];

  const logColumns = [
    {
      title: 'PhilHealth No.',
      dataIndex: 'philhealthNo',
      key: 'philhealthNo',
    },
    {
      title: 'Last Name',
      dataIndex: 'lastName',
      key: 'lastName',
    },
    {
      title: 'Result',
      key: 'eligible',
      render: (_: unknown, row: EligibilityLogEntry) =>
        row.eligible ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>ELIGIBLE</Tag>
        ) : (
          <Tag color="red" icon={<CloseCircleOutlined />}>NOT ELIGIBLE</Tag>
        ),
    },
    {
      title: 'Member',
      dataIndex: 'memberName',
      key: 'memberName',
      render: (v?: string) => v || '—',
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Checked',
      dataIndex: 'checkedAt',
      key: 'checkedAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY h:mm A'),
    },
  ];

  const pendingColumns = [
    { title: 'Claim No.', dataIndex: 'claimNo', key: 'claimNo' },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: PhilHealthClaim) =>
        row.patient ? `${row.patient.lastName}, ${row.patient.firstName}` : '—',
    },
    {
      title: 'PhilHealth No.',
      key: 'philhealthNo',
      render: (_: unknown, row: PhilHealthClaim) => row.patient?.philhealthNo || '—',
    },
    {
      title: 'Amount',
      dataIndex: 'claimAmount',
      key: 'claimAmount',
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
      render: (_: unknown, row: PhilHealthClaim) => {
        if (submittedClaims[row.id]) {
          return (
            <Tag color="blue">
              Transmittal: {submittedClaims[row.id]}
            </Tag>
          );
        }
        return (
          <Button
            type="primary"
            size="small"
            icon={<SendOutlined />}
            loading={submitMutation.isPending}
            onClick={() => handleSubmitClaim(row.id)}
          >
            Submit to PhilHealth
          </Button>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 16 }}>
        <SafetyOutlined style={{ marginRight: 8 }} />
        PhilHealth eClaims API Integration
      </Title>

      {/* SECTION 1: Eligibility Verification */}
      <Card
        title="Eligibility Verification"
        style={{ marginBottom: 16 }}
        extra={<Tag color="blue">SIMULATED API</Tag>}
      >
        <Form form={eligForm} layout="inline" onFinish={handleVerify} style={{ marginBottom: 16 }}>
          <Form.Item
            name="philhealthNo"
            rules={[{ required: true, message: 'Required' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="PhilHealth Number (e.g. 01-234567890-0)" />
          </Form.Item>
          <Form.Item
            name="lastName"
            rules={[{ required: true, message: 'Required' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Last Name" />
          </Form.Item>
          <Form.Item
            name="dateOfBirth"
            rules={[{ required: true, message: 'Required' }]}
          >
            <DatePicker placeholder="Date of Birth" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={verifyMutation.isPending}
              icon={<SafetyOutlined />}
            >
              Verify
            </Button>
          </Form.Item>
        </Form>

        {eligResult && (
          <Card
            size="small"
            style={{
              marginBottom: 16,
              borderColor: eligResult.eligible ? '#16a34a' : '#dc2626',
              background: eligResult.eligible ? '#f0fdf4' : '#fef2f2',
            }}
          >
            <Row align="middle" gutter={16}>
              <Col>
                {eligResult.eligible ? (
                  <CheckCircleOutlined style={{ fontSize: 40, color: '#16a34a' }} />
                ) : (
                  <CloseCircleOutlined style={{ fontSize: 40, color: '#dc2626' }} />
                )}
              </Col>
              <Col flex="auto">
                <Descriptions column={3} size="small">
                  <Descriptions.Item label="Status">
                    <Tag color={eligResult.eligible ? 'green' : 'red'} style={{ fontSize: 13 }}>
                      {eligResult.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Member Name">
                    <Text strong>{eligResult.memberName || '—'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Member Type">
                    {eligResult.memberType || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Coverage Start">
                    {eligResult.coverageStart || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Coverage End">
                    {eligResult.coverageEnd || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Message" span={3}>
                    <Text type={eligResult.eligible ? undefined : 'danger'}>
                      {eligResult.message}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </Card>
        )}

        <Divider orientation="left" style={{ fontSize: 13 }}>Recent Verifications (Last 10)</Divider>
        <Table
          dataSource={eligibilityLog.slice(0, 10)}
          columns={logColumns}
          rowKey="id"
          size="small"
          loading={logLoading}
          pagination={false}
        />
      </Card>

      {/* SECTION 2: Claim Submission */}
      <Card
        title="Claim Submission"
        style={{ marginBottom: 16 }}
        extra={<Tag color="orange">{pendingClaims.length} Pending</Tag>}
      >
        {pendingClaims.length === 0 ? (
          <Alert type="info" message="No pending PhilHealth claims to submit." showIcon />
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

      {/* SECTION 3: Authorization Request */}
      <Card
        title={
          <Space>
            <AuditOutlined />
            Authorization Request
          </Space>
        }
        extra={<Tag color="purple">Pre-Authorization</Tag>}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Form form={authForm} layout="vertical" onFinish={handleRequestAuth}>
              <Form.Item label="Patient Search">
                <AutoComplete
                  options={patientOptions}
                  onSearch={handlePatientSearch}
                  onSelect={(value) => setSelectedPatientId(value)}
                  placeholder="Type patient name or number..."
                  style={{ width: '100%' }}
                  allowClear
                  onClear={() => setSelectedPatientId('')}
                />
              </Form.Item>

              <Form.Item label="Case Rate (optional)">
                <AutoComplete
                  options={caseRateOptions}
                  onSearch={setCaseRateQuery}
                  onSelect={(value) => setSelectedCaseRateId(value)}
                  placeholder="Search ICD code or diagnosis..."
                  style={{ width: '100%' }}
                  allowClear
                  onClear={() => setSelectedCaseRateId('')}
                />
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

              <Form.Item name="admissionDate" label="Admission Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<AuditOutlined />}
                  loading={authMutation.isPending}
                  block
                >
                  Request Authorization
                </Button>
              </Form.Item>
            </Form>
          </Col>

          <Col span={12}>
            {authResult ? (
              <Card
                size="small"
                title="Authorization Issued"
                style={{ background: '#f0f9ff', borderColor: '#0ea5e9' }}
              >
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Authorization No.">
                    <Text strong style={{ color: '#0369a1', fontSize: 15 }}>
                      {String(authResult['authorizationNo'] ?? '')}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Patient">
                    {String(authResult['patientName'] ?? '')}
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
                  <Descriptions.Item label="Conditions">
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                      {(authResult['conditions'] as string[] || []).map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  border: '1px dashed #d9d9d9',
                  borderRadius: 8,
                  minHeight: 200,
                }}
              >
                Authorization result will appear here
              </div>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default EClaimsPage;
