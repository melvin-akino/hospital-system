import React, { useState } from 'react';
import {
  Card,
  Form,
  Button,
  Typography,
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Divider,
  Spin,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCreatePhilHealthClaim, usePhilHealthCaseRates } from '../../hooks/usePhilHealth';
import api from '../../lib/api';
import type { PhilHealthCaseRate } from '../../services/philhealthService';

const { Title, Text } = Typography;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

interface PatientOption {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  philhealthNo?: string;
}

interface BillOption {
  id: string;
  billNo: string;
  totalAmount: number;
  status: string;
}

const PhilHealthClaimFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const createClaim = useCreatePhilHealthClaim();

  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [searchingPatient, setSearchingPatient] = useState(false);

  const [billSearch, setBillSearch] = useState('');
  const [billOptions, setBillOptions] = useState<BillOption[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillOption | null>(null);

  const [caseRateQuery, setCaseRateQuery] = useState('');
  const [selectedCaseRate, setSelectedCaseRate] = useState<PhilHealthCaseRate | null>(null);

  const { data: caseRatesData, isLoading: loadingRates } = usePhilHealthCaseRates(
    caseRateQuery.length >= 2 ? caseRateQuery : undefined
  );

  const caseRates = caseRatesData?.data ?? [];

  const searchPatients = async (q: string) => {
    if (!q || q.length < 2) return;
    setSearchingPatient(true);
    try {
      const res = await api.get('/patients/search', { params: { q } });
      setPatientOptions(res.data?.data ?? []);
    } catch {
      // ignore
    } finally {
      setSearchingPatient(false);
    }
  };

  const searchBills = async (q: string) => {
    if (!q || q.length < 2) return;
    try {
      const res = await api.get('/billing', { params: { search: q, limit: 10 } });
      setBillOptions(res.data?.data ?? []);
    } catch {
      // ignore
    }
  };

  const handleSelectCaseRate = (rate: PhilHealthCaseRate) => {
    setSelectedCaseRate(rate);
    form.setFieldsValue({ caseRateId: rate.id, claimAmount: Number(rate.caseRate) });
  };

  const handleSubmit = async (values: {
    patientId: string;
    billId?: string;
    caseRateId?: string;
    claimAmount: number;
    notes?: string;
  }) => {
    await createClaim.mutateAsync(values);
    navigate('/philhealth/claims');
  };

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/philhealth/claims')} style={{ marginRight: 12 }}>
            Back
          </Button>
        </Col>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Create PhilHealth Claim</Title>
        </Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={24}>
          <Col xs={24} lg={14}>
            <Card title="Claim Information" style={{ marginBottom: 16 }}>
              {/* Patient Search */}
              <Form.Item
                name="patientId"
                label="Patient"
                rules={[{ required: true, message: 'Please select a patient' }]}
              >
                <Select
                  showSearch
                  placeholder="Search patient by name or patient number..."
                  filterOption={false}
                  onSearch={(v) => { setPatientSearch(v); searchPatients(v); }}
                  onChange={(id) => {
                    const p = patientOptions.find((o) => o.id === id);
                    setSelectedPatient(p ?? null);
                  }}
                  notFoundContent={searchingPatient ? <Spin size="small" /> : patientSearch.length < 2 ? 'Type to search...' : 'No patients found'}
                  suffixIcon={<SearchOutlined />}
                >
                  {patientOptions.map((p) => (
                    <Select.Option key={p.id} value={p.id}>
                      <Space>
                        <Text strong>{p.lastName}, {p.firstName}</Text>
                        <Text type="secondary">({p.patientNo})</Text>
                        {p.philhealthNo && <Tag color="blue">{p.philhealthNo}</Tag>}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedPatient && (
                <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary">Patient:</Text>{' '}
                      <Text strong>{selectedPatient.lastName}, {selectedPatient.firstName}</Text>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">PhilHealth #:</Text>{' '}
                      <Text strong>{selectedPatient.philhealthNo ?? 'Not registered'}</Text>
                    </Col>
                  </Row>
                </Card>
              )}

              {/* Bill Link */}
              <Form.Item name="billId" label="Link to Bill (Optional)">
                <Select
                  showSearch
                  placeholder="Search bill number..."
                  filterOption={false}
                  onSearch={(v) => { setBillSearch(v); searchBills(v); }}
                  allowClear
                  onChange={(id) => {
                    const b = billOptions.find((o) => o.id === id);
                    setSelectedBill(b ?? null);
                  }}
                  notFoundContent={billSearch.length < 2 ? 'Type to search...' : 'No bills found'}
                >
                  {billOptions.map((b) => (
                    <Select.Option key={b.id} value={b.id}>
                      <Space>
                        <Text strong>{b.billNo}</Text>
                        <Text type="secondary">{formatPeso(b.totalAmount)}</Text>
                        <Tag>{b.status}</Tag>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedBill && (
                <Card size="small" style={{ marginBottom: 16, background: '#f6ffed' }}>
                  <Text type="secondary">Bill Total:</Text>{' '}
                  <Text strong style={{ color: '#52c41a' }}>{formatPeso(selectedBill.totalAmount)}</Text>
                  <Tag style={{ marginLeft: 8 }}>{selectedBill.status}</Tag>
                </Card>
              )}

              <Divider />

              {/* Case Rate Search */}
              <Form.Item name="caseRateId" label="Case Rate / ICD Code">
                <Input.Search
                  placeholder="Search by ICD code or diagnosis description..."
                  value={caseRateQuery}
                  onChange={(e) => setCaseRateQuery(e.target.value)}
                  onSearch={() => {}}
                  loading={loadingRates}
                />
              </Form.Item>

              {caseRates.length > 0 && !selectedCaseRate && (
                <div
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    maxHeight: 200,
                    overflowY: 'auto',
                    marginBottom: 16,
                  }}
                >
                  {caseRates.map((r) => (
                    <div
                      key={r.id}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f0f5ff')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '')}
                      onClick={() => handleSelectCaseRate(r)}
                    >
                      <Space>
                        <Tag color="blue">{r.icdCode}</Tag>
                        <Text>{r.description}</Text>
                        <Text strong style={{ color: '#52c41a' }}>{formatPeso(Number(r.caseRate))}</Text>
                        {r.category && <Tag>{r.category}</Tag>}
                      </Space>
                    </div>
                  ))}
                </div>
              )}

              {selectedCaseRate && (
                <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff' }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Tag color="blue">{selectedCaseRate.icdCode}</Tag>
                      <Text>{selectedCaseRate.description}</Text>
                    </Col>
                    <Col>
                      <Text strong>{formatPeso(Number(selectedCaseRate.caseRate))}</Text>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => { setSelectedCaseRate(null); form.setFieldsValue({ caseRateId: undefined }); }}
                      >
                        Change
                      </Button>
                    </Col>
                  </Row>
                </Card>
              )}

              {/* Claim Amount */}
              <Form.Item
                name="claimAmount"
                label="Claim Amount (₱)"
                rules={[{ required: true, message: 'Please enter claim amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  formatter={(v) => `₱ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => parseFloat((v ?? '0').replace(/₱\s?|(,*)/g, '')) as unknown as string}
                  placeholder="0.00"
                />
              </Form.Item>

              {/* Notes */}
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={3} placeholder="Additional notes..." />
              </Form.Item>
            </Card>

            <Row justify="end">
              <Space>
                <Button onClick={() => navigate('/philhealth/claims')}>Cancel</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={createClaim.isPending}
                >
                  Create Claim
                </Button>
              </Space>
            </Row>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="How PhilHealth Claims Work">
              <Space direction="vertical">
                <Text>1. Select the patient with a valid PhilHealth number.</Text>
                <Text>2. Optionally link to an existing bill.</Text>
                <Text>3. Search for the applicable ICD case rate.</Text>
                <Text>4. The claim amount auto-fills from the case rate (adjustable).</Text>
                <Text>5. Once created, generate the CF4 XML for eClaims submission.</Text>
                <Divider />
                <Text type="secondary">
                  If linked to a bill, the bill's PhilHealth deduction will be automatically updated and the balance recalculated.
                </Text>
              </Space>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default PhilHealthClaimFormPage;
