import React, { useState, useEffect, useRef } from 'react';
import {
  Tabs, Select, InputNumber, Radio, Button, Typography, Row, Col, Card,
  Alert, Table, Tag, Progress, List, Spin, AutoComplete, Space, Divider,
} from 'antd';
import {
  RobotOutlined, WarningOutlined, CheckCircleOutlined, SearchOutlined,
} from '@ant-design/icons';
import api from '../../lib/api';
import {
  useDiagnose, useCheckInteractions, usePredictReadmission,
  useCheckAllergies, useAnalyzeVitals,
} from '../../hooks/useAI';

const { Title, Text } = Typography;

interface MedicationOption {
  id: string;
  name: string;
  genericName?: string;
}

interface PatientResult {
  id: string;
  firstName: string;
  lastName: string;
  patientNo: string;
}

const usePatientSearch = () => {
  const [options, setOptions] = useState<{ value: string; label: string; patientId: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!q || q.length < 2) { setOptions([]); return; }
      try {
        const res = await api.get('/patients/search', { params: { q } });
        const list: PatientResult[] = res.data?.data || res.data || [];
        setOptions(list.map(p => ({
          value: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
          label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
          patientId: p.id,
        })));
      } catch {
        setOptions([]);
      }
    }, 300);
  };

  return { options, search };
};

// ── Tab 1: Symptom Checker ──────────────────────────────────────────────────
const SymptomCheckerTab: React.FC = () => {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [age, setAge] = useState<number>(30);
  const [gender, setGender] = useState<string>('MALE');
  const { mutateAsync: diagnose, isPending, data: results } = useDiagnose();

  const handleAnalyze = async () => {
    if (!symptoms.length) return;
    await diagnose({ symptoms, age, gender });
  };

  const diagnoses: Array<{ icdCode: string; diagnosis: string; probability: number; reasoning: string }> =
    results?.suggestions || [];

  const aiEngine: string | undefined = (results as any)?.aiEngine;

  const getColor = (p: number) => p > 0.7 ? '#52c41a' : p >= 0.5 ? '#fa8c16' : '#ff4d4f';

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="Enter Patient Symptoms">
        <Row gutter={16}>
          <Col span={24} style={{ marginBottom: 12 }}>
            <Text strong>Symptoms</Text>
            <Select
              mode="tags"
              style={{ width: '100%', marginTop: 4 }}
              placeholder='Type and press Enter to add symptoms (e.g. "fever", "headache")'
              value={symptoms}
              onChange={setSymptoms}
              tokenSeparators={[',']}
            />
          </Col>
          <Col span={8}>
            <Text strong>Age</Text>
            <InputNumber
              min={0} max={150}
              value={age}
              onChange={v => setAge(v || 0)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </Col>
          <Col span={16}>
            <Text strong>Gender</Text>
            <div style={{ marginTop: 8 }}>
              <Radio.Group value={gender} onChange={e => setGender(e.target.value)}>
                <Radio value="MALE">Male</Radio>
                <Radio value="FEMALE">Female</Radio>
                <Radio value="OTHER">Other</Radio>
              </Radio.Group>
            </div>
          </Col>
        </Row>
        <Button
          type="primary"
          icon={<RobotOutlined />}
          onClick={handleAnalyze}
          loading={isPending}
          disabled={!symptoms.length}
          style={{ marginTop: 16 }}
        >
          Analyze Symptoms
        </Button>
      </Card>

      {isPending && (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin size="large" /></div>
      )}

      {!isPending && diagnoses.length > 0 && (
        <Card title={
          <Space>
            <span>Differential Diagnosis Results</span>
            {aiEngine && (
              <Tag color={aiEngine === 'llm' ? 'blue' : 'default'}>
                {aiEngine === 'llm' ? 'AI (LLM)' : 'Rule-based'}
              </Tag>
            )}
          </Space>
        }>
          <List
            dataSource={diagnoses}
            renderItem={item => (
              <List.Item style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <Space>
                  <Tag color="blue" style={{ fontFamily: 'monospace' }}>{item.icdCode}</Tag>
                  <Text strong>{item.diagnosis}</Text>
                  <Tag color={item.probability > 0.7 ? 'green' : item.probability >= 0.5 ? 'orange' : 'red'}>
                    {Math.round(item.probability * 100)}%
                  </Tag>
                </Space>
                <Progress
                  percent={Math.round(item.probability * 100)}
                  strokeColor={getColor(item.probability)}
                  showInfo={false}
                  style={{ width: '100%' }}
                />
                {item.reasoning && (
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.reasoning}</Text>
                )}
              </List.Item>
            )}
          />
        </Card>
      )}

      <Alert
        type="warning"
        message="⚠️ For clinical decision support only. Not a substitute for clinical judgment."
        showIcon={false}
      />
    </Space>
  );
};

// ── Tab 2: Drug Interaction Checker ────────────────────────────────────────
const DrugInteractionTab: React.FC = () => {
  const [medications, setMedications] = useState<MedicationOption[]>([]);
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const { mutateAsync: checkInteractions, isPending, data: results } = useCheckInteractions();

  useEffect(() => {
    api.get('/medications').then(r => {
      setMedications(r.data?.data || r.data || []);
    }).catch(() => {});
  }, []);

  const interactions: Array<{ drug1: string; drug2: string; severity: string; description: string }> =
    results?.interactions || [];

  const aiEngine: string | undefined = (results as any)?.aiEngine;

  const severityColor: Record<string, string> = {
    CONTRAINDICATED: 'red', MAJOR: 'volcano', MODERATE: 'orange', MINOR: 'gold',
  };

  const interactionColumns = [
    { title: 'Drug 1', dataIndex: 'drug1' },
    { title: 'Drug 2', dataIndex: 'drug2' },
    {
      title: 'Severity', dataIndex: 'severity',
      render: (v: string) => <Tag color={severityColor[v] || 'default'}>{v}</Tag>,
    },
    { title: 'Description', dataIndex: 'description' },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="Select Medications to Check">
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select medications to check for interactions..."
          value={selectedDrugs}
          onChange={setSelectedDrugs}
          showSearch
          optionFilterProp="label"
          options={medications.map(m => ({
            value: m.id,
            label: m.genericName ? `${m.name} (${m.genericName})` : m.name,
          }))}
        />
        <Button
          type="primary"
          onClick={() => checkInteractions(selectedDrugs)}
          loading={isPending}
          disabled={selectedDrugs.length < 2}
          style={{ marginTop: 12 }}
        >
          Check Interactions
        </Button>
      </Card>

      {isPending && <div style={{ textAlign: 'center', padding: 32 }}><Spin size="large" /></div>}

      {!isPending && results !== undefined && (
        interactions.length === 0 ? (
          <Alert
            type="success"
            message="No interactions found — medications appear safe to use together"
            showIcon
          />
        ) : (
          <Card title={
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              <Text strong>{interactions.length} interaction(s) found</Text>
              {aiEngine && (
                <Tag color={aiEngine === 'llm' ? 'blue' : 'default'}>
                  {aiEngine === 'llm' ? 'AI (LLM)' : 'Rule-based'}
                </Tag>
              )}
            </Space>
          }>
            <Table
              dataSource={interactions}
              columns={interactionColumns}
              rowKey={(_, i) => String(i)}
              pagination={false}
              size="small"
            />
          </Card>
        )
      )}
    </Space>
  );
};

// ── Tab 3: Readmission Risk ─────────────────────────────────────────────────
const ReadmissionRiskTab: React.FC = () => {
  const { options, search } = usePatientSearch();
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const { mutateAsync: predict, isPending, data: result } = usePredictReadmission();

  const riskColor: Record<string, string> = { LOW: 'green', MEDIUM: 'orange', HIGH: 'red' };
  const risk = result?.riskLevel || result?.risk;
  const score = result?.score ?? result?.riskScore;
  const factors: string[] = result?.riskFactors || result?.factors || [];
  const recommendations: string[] = result?.recommendations || [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="Readmission Risk Assessment">
        <Space direction="vertical" style={{ width: '100%' }}>
          <AutoComplete
            options={options}
            onSearch={search}
            onSelect={(_: string, opt: { patientId: string }) => setSelectedPatientId(opt.patientId)}
            placeholder="Search patient..."
            style={{ width: '100%' }}
          />
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={() => predict(selectedPatientId)}
            loading={isPending}
            disabled={!selectedPatientId}
          >
            Assess Risk
          </Button>
        </Space>
      </Card>

      {isPending && <div style={{ textAlign: 'center', padding: 32 }}><Spin size="large" /></div>}

      {!isPending && result && (
        <Card>
          <Row gutter={24} align="middle">
            <Col span={8} style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Risk Level</Text>
              <Tag color={riskColor[risk] || 'default'} style={{ fontSize: 22, padding: '8px 24px' }}>
                {risk}
              </Tag>
            </Col>
            <Col span={8} style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Risk Score</Text>
              <Text style={{ fontSize: 48, fontWeight: 700, color: riskColor[risk] || '#666' }}>
                {score ?? '—'}
              </Text>
              <Text type="secondary"> / 100</Text>
            </Col>
          </Row>

          <Divider />

          <Row gutter={16}>
            {factors.length > 0 && (
              <Col span={12}>
                <Text strong><WarningOutlined style={{ color: '#fa8c16', marginRight: 6 }} />Risk Factors</Text>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {factors.map((f, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      <WarningOutlined style={{ color: '#fa8c16', marginRight: 6 }} />
                      <Text>{f}</Text>
                    </li>
                  ))}
                </ul>
              </Col>
            )}
            {recommendations.length > 0 && (
              <Col span={12}>
                <Text strong><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />Recommendations</Text>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {recommendations.map((r, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                      <Text>{r}</Text>
                    </li>
                  ))}
                </ul>
              </Col>
            )}
          </Row>
        </Card>
      )}
    </Space>
  );
};

// ── Tab 4: Vital Signs Analysis ─────────────────────────────────────────────
const VitalSignsTab: React.FC = () => {
  const { options, search } = usePatientSearch();
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const { mutateAsync: analyzeVitals, isPending, data: result } = useAnalyzeVitals();

  const overallStatus = result?.overallStatus;
  const alerts: Array<{
    parameter: string; value: string;
    status: 'NORMAL' | 'ABNORMAL' | 'CRITICAL'; recommendation?: string;
  }> = result?.alerts || [];

  const clinicalSummary: string | undefined = result?.clinicalSummary;
  const priorityActions: string[] = result?.priorityActions || [];
  const urgencyLevel: string | undefined = result?.urgencyLevel;
  const aiEngine: string | undefined = result?.aiEngine;

  const alertType = (s: string) => {
    if (s === 'CRITICAL') return 'error';
    if (s === 'ABNORMAL') return 'warning';
    return 'success';
  };

  const bannerType = (s: string) => {
    if (s === 'CRITICAL') return 'error';
    if (s === 'WATCH' || s === 'ABNORMAL') return 'warning';
    return 'success';
  };

  const abnormal = alerts.filter(a => a.status !== 'NORMAL');

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="Vital Signs Analysis">
        <Space direction="vertical" style={{ width: '100%' }}>
          <AutoComplete
            options={options}
            onSearch={search}
            onSelect={(_: string, opt: { patientId: string }) => setSelectedPatientId(opt.patientId)}
            placeholder="Search patient..."
            style={{ width: '100%' }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => analyzeVitals(selectedPatientId)}
            loading={isPending}
            disabled={!selectedPatientId}
          >
            Analyze
          </Button>
        </Space>
      </Card>

      {isPending && <div style={{ textAlign: 'center', padding: 32 }}><Spin size="large" /></div>}

      {!isPending && result && (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {overallStatus && (
            <Alert
              type={bannerType(overallStatus) as 'error' | 'warning' | 'success' | 'info'}
              message={
                <Space>
                  <span>Overall Status: {overallStatus}</span>
                  {urgencyLevel && <Tag color={urgencyLevel === 'CRITICAL' ? 'red' : urgencyLevel === 'HIGH' ? 'orange' : 'blue'}>{urgencyLevel}</Tag>}
                  {aiEngine && <Tag color={aiEngine === 'llm' ? 'blue' : 'default'}>{aiEngine === 'llm' ? 'AI (LLM)' : 'Rule-based'}</Tag>}
                </Space>
              }
              showIcon
            />
          )}
          {abnormal.length === 0 && alerts.length > 0 && (
            <Alert type="success" message="All vital signs within normal range" showIcon />
          )}
          {abnormal.map((a, i) => (
            <Alert
              key={i}
              type={alertType(a.status) as 'error' | 'warning'}
              showIcon
              message={
                <Space>
                  <Text strong>{a.parameter}</Text>
                  <Tag color={a.status === 'CRITICAL' ? 'red' : 'orange'}>{a.status}</Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size={2}>
                  <Text>Value: <strong>{a.value}</strong></Text>
                  {a.recommendation && <Text type="secondary">{a.recommendation}</Text>}
                </Space>
              }
            />
          ))}
          {clinicalSummary && (
            <Card size="small" title={<Space><RobotOutlined style={{ color: '#1677ff' }} /><span>Clinical Summary</span></Space>}>
              <Text>{clinicalSummary}</Text>
              {priorityActions.length > 0 && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <Text strong>Priority Actions:</Text>
                  <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                    {priorityActions.map((action, i) => (
                      <li key={i} style={{ marginBottom: 2 }}><Text>{action}</Text></li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}
        </Space>
      )}
    </Space>
  );
};

// ── Tab 5: Allergy Checker ──────────────────────────────────────────────────
const AllergyCheckerTab: React.FC = () => {
  const { options, search } = usePatientSearch();
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedMedId, setSelectedMedId] = useState('');
  const [medications, setMedications] = useState<MedicationOption[]>([]);
  const { mutateAsync: checkAllergies, isPending, data: result } = useCheckAllergies();

  useEffect(() => {
    api.get('/medications').then(r => {
      setMedications(r.data?.data || r.data || []);
    }).catch(() => {});
  }, []);

  const safe = result?.safe ?? result?.isSafe;
  const warnings: Array<{ allergen: string; reaction: string; severity: string; medication: string }> =
    result?.warnings || [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="Allergy Safety Check">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Patient</Text>
            <AutoComplete
              options={options}
              onSearch={search}
              onSelect={(_: string, opt: { patientId: string }) => setSelectedPatientId(opt.patientId)}
              placeholder="Search patient..."
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          <div>
            <Text strong>Medication</Text>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Select medication..."
              value={selectedMedId || undefined}
              onChange={setSelectedMedId}
              options={medications.map(m => ({
                value: m.id,
                label: m.genericName ? `${m.name} (${m.genericName})` : m.name,
              }))}
            />
          </div>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => checkAllergies({ patientId: selectedPatientId, medicationId: selectedMedId })}
            loading={isPending}
            disabled={!selectedPatientId || !selectedMedId}
          >
            Check Safety
          </Button>
        </Space>
      </Card>

      {isPending && <div style={{ textAlign: 'center', padding: 32 }}><Spin size="large" /></div>}

      {!isPending && result !== undefined && (
        safe ? (
          <Alert
            type="success"
            message="Safe to administer"
            description="No known allergy conflicts found for this patient and medication."
            showIcon
          />
        ) : (
          <Alert
            type="error"
            message="Allergy Conflict Detected"
            description={
              warnings.length > 0 ? (
                <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                  {warnings.map((w, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      <Space wrap>
                        <Text strong>{w.allergen}</Text>
                        <Tag color={w.severity === 'SEVERE' ? 'red' : w.severity === 'MODERATE' ? 'orange' : 'gold'}>
                          {w.severity}
                        </Tag>
                        <Text type="secondary">{w.reaction}</Text>
                      </Space>
                    </li>
                  ))}
                </ul>
              ) : 'This medication may cause an allergic reaction in this patient.'
            }
            showIcon
          />
        )
      )}
    </Space>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
const AIClinicalSupportPage: React.FC = () => {
  const tabItems = [
    { key: '1', label: <span><RobotOutlined /> Symptom Checker</span>, children: <SymptomCheckerTab /> },
    { key: '2', label: 'Drug Interactions', children: <DrugInteractionTab /> },
    { key: '3', label: 'Readmission Risk', children: <ReadmissionRiskTab /> },
    { key: '4', label: 'Vital Signs Analysis', children: <VitalSignsTab /> },
    { key: '5', label: 'Allergy Checker', children: <AllergyCheckerTab /> },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <RobotOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            AI Clinical Decision Support
          </Title>
        </Col>
      </Row>
      <Tabs defaultActiveKey="1" items={tabItems} />
    </div>
  );
};

export default AIClinicalSupportPage;
