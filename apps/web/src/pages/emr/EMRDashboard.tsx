import React, { useState } from 'react';
import {
  Tabs,
  Card,
  Descriptions,
  Tag,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Spin,
  Alert,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  ArrowLeftOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useEMR, useAddVitalSigns, useAddAllergy, useUpdateAllergy, useAddPatientMedication } from '../../hooks/useEMR';
import VitalSignsChart from './VitalSignsChart';

const { Title, Text } = Typography;

interface Allergy {
  id: string;
  allergen: string;
  reaction?: string;
  severity: string;
  isActive: boolean;
}

interface Medication {
  id: string;
  drugName: string;
  dosage?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  prescribedBy?: string;
  isActive: boolean;
  notes?: string;
}

interface VitalSign {
  id: string;
  recordedAt: string;
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  recordedBy?: string;
  notes?: string;
}

interface Consultation {
  id: string;
  consultationNo: string;
  scheduledAt: string;
  chiefComplaint?: string;
  assessment?: string;
  status: string;
  doctor?: { firstName: string; lastName: string; specialty: string };
}

interface LabResult {
  id: string;
  resultNo: string;
  testName: string;
  result?: string;
  isAbnormal: boolean;
  createdAt: string;
}

const severityColor: Record<string, string> = {
  MILD: 'green',
  MODERATE: 'orange',
  SEVERE: 'red',
};

const EMRDashboard: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [vitalForm] = Form.useForm();
  const [allergyForm] = Form.useForm();
  const [medicationForm] = Form.useForm();

  const [vitalModal, setVitalModal] = useState(false);
  const [allergyModal, setAllergyModal] = useState(false);
  const [editAllergyModal, setEditAllergyModal] = useState(false);
  const [medModal, setMedModal] = useState(false);
  const [selectedAllergy, setSelectedAllergy] = useState<Allergy | null>(null);

  const { data: emrData, isLoading } = useEMR(patientId!);
  const addVitals = useAddVitalSigns(patientId!);
  const addAllergy = useAddAllergy(patientId!);
  const updateAllergy = useUpdateAllergy(patientId!);
  const addMedication = useAddPatientMedication(patientId!);

  const patient = emrData?.data;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!patient) {
    return <Alert type="error" message="Patient not found" />;
  }

  const activeAllergies: Allergy[] = (patient.allergies || []).filter((a: Allergy) => a.isActive);
  const vitals: VitalSign[] = patient.vitalSigns || [];
  const medications: Medication[] = patient.medications || [];
  const labResults: LabResult[] = patient.labResults || [];
  const consultations: Consultation[] = patient.consultations || [];

  const handleAddVitals = async (values: Record<string, unknown>) => {
    await addVitals.mutateAsync(values);
    vitalForm.resetFields();
    setVitalModal(false);
  };

  const handleAddAllergy = async (values: Record<string, unknown>) => {
    await addAllergy.mutateAsync(values);
    allergyForm.resetFields();
    setAllergyModal(false);
  };

  const handleEditAllergy = (allergy: Allergy) => {
    setSelectedAllergy(allergy);
    allergyForm.setFieldsValue(allergy);
    setEditAllergyModal(true);
  };

  const handleUpdateAllergy = async (values: Record<string, unknown>) => {
    if (!selectedAllergy) return;
    await updateAllergy.mutateAsync({ allergyId: selectedAllergy.id, data: values });
    allergyForm.resetFields();
    setEditAllergyModal(false);
  };

  const handleAddMedication = async (values: Record<string, unknown>) => {
    const data = {
      ...values,
      startDate: values['startDate'] ? (values['startDate'] as ReturnType<typeof dayjs>).toISOString() : undefined,
      endDate: values['endDate'] ? (values['endDate'] as ReturnType<typeof dayjs>).toISOString() : undefined,
    };
    await addMedication.mutateAsync(data);
    medicationForm.resetFields();
    setMedModal(false);
  };

  const vitalColumns = [
    { title: 'Date', dataIndex: 'recordedAt', render: (v: string) => dayjs(v).format('MMM D, YYYY HH:mm') },
    { title: 'Temp (°C)', dataIndex: 'temperature', render: (v?: number) => v ?? '—' },
    {
      title: 'BP',
      key: 'bp',
      render: (_: unknown, r: VitalSign) =>
        r.bloodPressureSystolic && r.bloodPressureDiastolic
          ? `${r.bloodPressureSystolic}/${r.bloodPressureDiastolic}`
          : '—',
    },
    { title: 'HR (bpm)', dataIndex: 'heartRate', render: (v?: number) => v ?? '—' },
    { title: 'RR', dataIndex: 'respiratoryRate', render: (v?: number) => v ?? '—' },
    { title: 'O2 Sat (%)', dataIndex: 'oxygenSaturation', render: (v?: number) => v ?? '—' },
    { title: 'Weight (kg)', dataIndex: 'weight', render: (v?: number) => v ?? '—' },
    { title: 'BMI', dataIndex: 'bmi', render: (v?: number) => v ?? '—' },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: 'Patient Overview',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Card title="Demographics" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Patient No.">{patient.patientNo}</Descriptions.Item>
                <Descriptions.Item label="Name">
                  {patient.lastName}, {patient.firstName} {patient.middleName || ''}
                </Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {dayjs(patient.dateOfBirth).format('MMMM D, YYYY')} ({dayjs().diff(dayjs(patient.dateOfBirth), 'year')}y)
                </Descriptions.Item>
                <Descriptions.Item label="Gender">{patient.gender}</Descriptions.Item>
                <Descriptions.Item label="Blood Type">{patient.bloodType || '—'}</Descriptions.Item>
                <Descriptions.Item label="Phone">{patient.phone || '—'}</Descriptions.Item>
                <Descriptions.Item label="Address">{patient.address || '—'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={12}>
            <Card
              title={
                <span style={{ color: activeAllergies.length > 0 ? '#dc2626' : undefined }}>
                  Allergies {activeAllergies.length > 0 && `(${activeAllergies.length})`}
                </span>
              }
              size="small"
              style={{ marginBottom: 16, border: activeAllergies.length > 0 ? '1px solid #fca5a5' : undefined }}
            >
              {activeAllergies.length === 0 ? (
                <Text type="secondary">No known allergies</Text>
              ) : (
                <Space wrap>
                  {activeAllergies.map((a) => (
                    <Tag key={a.id} color={severityColor[a.severity] || 'red'}>
                      {a.allergen} ({a.severity})
                    </Tag>
                  ))}
                </Space>
              )}
            </Card>
            <Card title="Active Medications" size="small">
              {medications.filter((m) => m.isActive).length === 0 ? (
                <Text type="secondary">No active medications</Text>
              ) : (
                medications
                  .filter((m) => m.isActive)
                  .map((m) => (
                    <div key={m.id} style={{ marginBottom: 4 }}>
                      <Text strong>{m.drugName}</Text>
                      {m.dosage && <Text type="secondary"> — {m.dosage}</Text>}
                      {m.frequency && <Text type="secondary"> {m.frequency}</Text>}
                    </div>
                  ))
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'vitals',
      label: 'Vital Signs',
      children: (
        <>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <Title level={5} style={{ margin: 0 }}>Vital Signs History</Title>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setVitalModal(true)}>
                Add Vitals
              </Button>
            </Col>
          </Row>
          {vitals.length >= 2 && (
            <Card title="Trends (Last 10 Readings)" style={{ marginBottom: 16 }}>
              <VitalSignsChart vitals={vitals} />
            </Card>
          )}
          <Table
            dataSource={vitals}
            columns={vitalColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
          />
        </>
      ),
    },
    {
      key: 'allergies',
      label: 'Allergies',
      children: (
        <>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col><Title level={5} style={{ margin: 0 }}>Allergy List</Title></Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAllergyModal(true)}>
                Add Allergy
              </Button>
            </Col>
          </Row>
          <Table
            dataSource={patient.allergies || []}
            rowKey="id"
            size="small"
            columns={[
              { title: 'Allergen', dataIndex: 'allergen' },
              { title: 'Reaction', dataIndex: 'reaction', render: (v?: string) => v || '—' },
              {
                title: 'Severity',
                dataIndex: 'severity',
                render: (v: string) => <Tag color={severityColor[v] || 'default'}>{v}</Tag>,
              },
              {
                title: 'Status',
                dataIndex: 'isActive',
                render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_: unknown, row: Allergy) => (
                  <Button type="text" icon={<EditOutlined />} onClick={() => handleEditAllergy(row)} />
                ),
              },
            ]}
          />
        </>
      ),
    },
    {
      key: 'medications',
      label: 'Medication History',
      children: (
        <>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col><Title level={5} style={{ margin: 0 }}>Medication History</Title></Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setMedModal(true)}>
                Add Medication
              </Button>
            </Col>
          </Row>
          <Table
            dataSource={medications}
            rowKey="id"
            size="small"
            columns={[
              { title: 'Drug Name', dataIndex: 'drugName' },
              { title: 'Dosage', dataIndex: 'dosage', render: (v?: string) => v || '—' },
              { title: 'Frequency', dataIndex: 'frequency', render: (v?: string) => v || '—' },
              {
                title: 'Start Date',
                dataIndex: 'startDate',
                render: (v?: string) => v ? dayjs(v).format('MMM D, YYYY') : '—',
              },
              {
                title: 'End Date',
                dataIndex: 'endDate',
                render: (v?: string) => v ? dayjs(v).format('MMM D, YYYY') : 'Ongoing',
              },
              { title: 'Prescribed By', dataIndex: 'prescribedBy', render: (v?: string) => v || '—' },
              {
                title: 'Status',
                dataIndex: 'isActive',
                render: (v: boolean) => <Tag color={v ? 'blue' : 'default'}>{v ? 'Active' : 'Discontinued'}</Tag>,
              },
            ]}
          />
        </>
      ),
    },
    {
      key: 'lab',
      label: 'Lab Results',
      children: (
        <>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col><Title level={5} style={{ margin: 0 }}>Laboratory Results</Title></Col>
            <Col>
              <Button icon={<ExperimentOutlined />} onClick={() => navigate(`/lab/results?patientId=${patientId}`)}>
                View in Lab Module
              </Button>
            </Col>
          </Row>
          <Table
            dataSource={labResults}
            rowKey="id"
            size="small"
            columns={[
              { title: 'Result No.', dataIndex: 'resultNo' },
              { title: 'Test Name', dataIndex: 'testName' },
              {
                title: 'Result',
                dataIndex: 'result',
                render: (v: string, row: LabResult) => (
                  <span style={{ color: row.isAbnormal ? '#dc2626' : undefined, fontWeight: row.isAbnormal ? 700 : 400 }}>
                    {v || '—'} {row.isAbnormal && '⚠'}
                  </span>
                ),
              },
              { title: 'Date', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('MMM D, YYYY') },
            ]}
          />
        </>
      ),
    },
    {
      key: 'consultations',
      label: 'Clinical Notes',
      children: (
        <Table
          dataSource={consultations}
          rowKey="id"
          size="small"
          columns={[
            { title: 'Consult No.', dataIndex: 'consultationNo' },
            {
              title: 'Date',
              dataIndex: 'scheduledAt',
              render: (v: string) => dayjs(v).format('MMM D, YYYY HH:mm'),
            },
            {
              title: 'Doctor',
              key: 'doctor',
              render: (_: unknown, row: Consultation) =>
                row.doctor ? `Dr. ${row.doctor.lastName}, ${row.doctor.firstName}` : '—',
            },
            { title: 'Chief Complaint', dataIndex: 'chiefComplaint', render: (v?: string) => v || '—' },
            { title: 'Assessment', dataIndex: 'assessment', render: (v?: string) => v || '—' },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (v: string) => {
                const colors: Record<string, string> = { COMPLETED: 'green', SCHEDULED: 'blue', CANCELLED: 'red' };
                return <Tag color={colors[v] || 'default'}>{v}</Tag>;
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/patients/${patientId}`)} style={{ marginRight: 12 }}>
            Back to Patient
          </Button>
        </Col>
        <Col flex="auto">
          <Title level={4} style={{ margin: 0 }}>
            Electronic Medical Record — {patient.lastName}, {patient.firstName}
            <Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>
              #{patient.patientNo}
            </Text>
          </Title>
        </Col>
      </Row>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* Add Vitals Modal */}
      <Modal
        title="Record Vital Signs"
        open={vitalModal}
        onCancel={() => { setVitalModal(false); vitalForm.resetFields(); }}
        onOk={() => vitalForm.submit()}
        confirmLoading={addVitals.isPending}
      >
        <Form form={vitalForm} layout="vertical" onFinish={handleAddVitals}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="temperature" label="Temperature (°C)">
                <InputNumber style={{ width: '100%' }} step={0.1} min={30} max={45} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="heartRate" label="Heart Rate (bpm)">
                <InputNumber style={{ width: '100%' }} min={0} max={300} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bloodPressureSystolic" label="BP Systolic (mmHg)">
                <InputNumber style={{ width: '100%' }} min={0} max={300} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bloodPressureDiastolic" label="BP Diastolic (mmHg)">
                <InputNumber style={{ width: '100%' }} min={0} max={200} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="respiratoryRate" label="Respiratory Rate">
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="oxygenSaturation" label="O2 Saturation (%)">
                <InputNumber style={{ width: '100%' }} step={0.1} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="weight" label="Weight (kg)">
                <InputNumber style={{ width: '100%' }} step={0.1} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="height" label="Height (cm)">
                <InputNumber style={{ width: '100%' }} step={0.1} min={0} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Add Allergy Modal */}
      <Modal
        title="Add Allergy"
        open={allergyModal}
        onCancel={() => { setAllergyModal(false); allergyForm.resetFields(); }}
        onOk={() => allergyForm.submit()}
        confirmLoading={addAllergy.isPending}
      >
        <Form form={allergyForm} layout="vertical" onFinish={handleAddAllergy}>
          <Form.Item name="allergen" label="Allergen" rules={[{ required: true }]}>
            <Input placeholder="e.g. Penicillin, Shellfish, Pollen" />
          </Form.Item>
          <Form.Item name="reaction" label="Reaction">
            <Input placeholder="e.g. Hives, Anaphylaxis" />
          </Form.Item>
          <Form.Item name="severity" label="Severity" initialValue="MODERATE">
            <Select options={[{ value: 'MILD', label: 'Mild' }, { value: 'MODERATE', label: 'Moderate' }, { value: 'SEVERE', label: 'Severe' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Allergy Modal */}
      <Modal
        title="Edit Allergy"
        open={editAllergyModal}
        onCancel={() => { setEditAllergyModal(false); allergyForm.resetFields(); }}
        onOk={() => allergyForm.submit()}
        confirmLoading={updateAllergy.isPending}
      >
        <Form form={allergyForm} layout="vertical" onFinish={handleUpdateAllergy}>
          <Form.Item name="allergen" label="Allergen" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="reaction" label="Reaction">
            <Input />
          </Form.Item>
          <Form.Item name="severity" label="Severity">
            <Select options={[{ value: 'MILD', label: 'Mild' }, { value: 'MODERATE', label: 'Moderate' }, { value: 'SEVERE', label: 'Severe' }]} />
          </Form.Item>
          <Form.Item name="isActive" label="Status">
            <Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Medication Modal */}
      <Modal
        title="Add Medication"
        open={medModal}
        onCancel={() => { setMedModal(false); medicationForm.resetFields(); }}
        onOk={() => medicationForm.submit()}
        confirmLoading={addMedication.isPending}
      >
        <Form form={medicationForm} layout="vertical" onFinish={handleAddMedication}>
          <Form.Item name="drugName" label="Drug Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="dosage" label="Dosage">
                <Input placeholder="e.g. 500mg" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="frequency" label="Frequency">
                <Input placeholder="e.g. TID, BID" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startDate" label="Start Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="End Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="prescribedBy" label="Prescribed By">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EMRDashboard;
