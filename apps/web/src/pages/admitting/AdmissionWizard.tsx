import React, { useState, useEffect } from 'react';
import {
  Modal, Steps, Button, Form, Input, Select, Row, Col, Space, Tag, Card,
  InputNumber, Divider, Checkbox, Typography, Alert, DatePicker, Radio,
  AutoComplete, Spin,
} from 'antd';
import {
  UserOutlined, HomeOutlined, SafetyOutlined, FileTextOutlined,
  CheckCircleOutlined, ClockCircleOutlined, DollarOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (admission: any) => void;
}

const SERVICE_CLASS_OPTIONS = [
  { value: 'PRIVATE',     label: 'Private' },
  { value: 'SEMI_PRIVATE',label: 'Semi-Private' },
  { value: 'WARD',        label: 'Ward' },
  { value: 'CHARITY',     label: 'Charity' },
];

const ADMISSION_SOURCE_OPTIONS = [
  { value: 'WALK_IN',           label: 'Walk-in' },
  { value: 'OPD_REFERRAL',      label: 'OPD Referral' },
  { value: 'PHYSICIAN_REFERRAL',label: 'Physician Referral' },
  { value: 'ER_TRANSFER',       label: 'ER Transfer' },
  { value: 'EXTERNAL_TRANSFER', label: 'Transfer from Another Hospital' },
  { value: 'SCHEDULED',         label: 'Scheduled Admission' },
];

const RELATIONSHIP_OPTIONS = [
  'SELF', 'SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'RELATIVE', 'FRIEND', 'EMPLOYER', 'GUARDIAN',
].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));

const PHILHEALTH_MEMBER_TYPES = [
  { value: 'MEMBER',    label: 'Member' },
  { value: 'DEPENDENT', label: 'Dependent' },
  { value: 'LIFETIME',  label: 'Lifetime Member' },
  { value: 'NHTS',      label: 'NHTS / Indigent' },
];

const DEPOSIT_METHODS = [
  { value: 'CASH',    label: 'Cash' },
  { value: 'CHECK',   label: 'Check' },
  { value: 'CARD',    label: 'Credit/Debit Card' },
  { value: 'HMO_LOA', label: 'HMO LOA' },
];

const steps = [
  { title: 'Patient',    icon: <UserOutlined /> },
  { title: 'Admission',  icon: <FileTextOutlined /> },
  { title: 'Room',       icon: <HomeOutlined /> },
  { title: 'Coverage',   icon: <SafetyOutlined /> },
  { title: 'Guarantor',  icon: <MedicineBoxOutlined /> },
  { title: 'Deposit',    icon: <DollarOutlined /> },
  { title: 'Documents',  icon: <CheckCircleOutlined /> },
];

const AdmissionWizard: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientOptions, setPatientOptions] = useState<any[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [hmoRegistrations, setHmoRegistrations] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({});

  const { data: rooms } = useQuery({
    queryKey: ['admission-rooms'],
    queryFn: () => api.get('/rooms', { params: { status: 'AVAILABLE' } }).then((r) => r.data?.data || []),
    enabled: open,
  });

  const { data: doctors } = useQuery({
    queryKey: ['admission-doctors'],
    queryFn: () => api.get('/doctors', { params: { limit: 200 } }).then((r) => r.data?.data?.data || r.data?.data || []),
    enabled: open,
  });

  const admitMutation = useMutation({
    mutationFn: (data: any) => api.post('/admissions', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['admitting-queue'] });
      onSuccess?.(res.data?.data);
      handleReset();
    },
  });

  const handleReset = () => {
    setCurrent(0);
    setSelectedPatient(null);
    setSelectedRoom(null);
    setHmoRegistrations([]);
    setFormData({});
    form.resetFields();
    onClose();
  };

  const handlePatientSearch = async (value: string) => {
    if (value.length < 2) return;
    setPatientSearching(true);
    try {
      const res = await api.get('/patients', { params: { search: value, limit: 10 } });
      const patients = res.data?.data?.data || res.data?.data || [];
      setPatientOptions(patients.map((p: any) => ({
        value: `${p.lastName}, ${p.firstName}${p.middleName ? ' ' + p.middleName : ''} (${p.patientNo})`,
        label: (
          <Space direction="vertical" size={0}>
            <Text strong>{p.lastName}, {p.firstName} {p.middleName}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{p.patientNo} · {p.dateOfBirth ? dayjs(p.dateOfBirth).format('MMM D, YYYY') : ''} · {p.gender}</Text>
          </Space>
        ),
        patient: p,
      })));
    } finally {
      setPatientSearching(false);
    }
  };

  const handlePatientSelect = (_val: string, option: any) => {
    const p = option.patient;
    setSelectedPatient(p);
    // Pre-fill PhilHealth from patient record
    form.setFieldsValue({
      philhealthNumber: p.philhealthNo,
      seniorPWDId: p.seniorIdNo || p.pwdIdNo,
      discountType: p.isSenior ? 'SENIOR' : p.isPwd ? 'PWD' : undefined,
    });
    // Load patient's HMO registrations
    api.get(`/hmo/registrations`, { params: { patientId: p.id, isActive: true } })
      .then((r) => setHmoRegistrations(r.data?.data || []))
      .catch(() => setHmoRegistrations([]));
  };

  const saveStep = async () => {
    try {
      const values = await form.validateFields();
      setFormData((prev: any) => ({ ...prev, ...values }));
      setCurrent((c) => c + 1);
    } catch {
      // validation failed, stay on step
    }
  };

  const handleFinish = async () => {
    try {
      const finalValues = await form.validateFields();
      const all = { ...formData, ...finalValues };

      await admitMutation.mutateAsync({
        patientId: selectedPatient?.id,
        roomId: selectedRoom?.id || all.roomId,
        attendingDoctor: all.attendingDoctor,
        admissionType: all.admissionType || 'INPATIENT',
        admissionSource: all.admissionSource,
        serviceClass: all.serviceClass,
        chiefComplaint: all.chiefComplaint,
        diagnosis: all.diagnosis,
        notes: all.notes,
        departmentId: user?.departmentId,
        // Guarantor
        guarantorName: all.guarantorName,
        guarantorRelationship: all.guarantorRelationship,
        guarantorContact: all.guarantorContact,
        guarantorAddress: all.guarantorAddress,
        // HMO
        hmoRegistrationId: all.hmoRegistrationId,
        hmoName: all.hmoName,
        hmoCardNumber: all.hmoCardNumber,
        hmoLOANumber: all.hmoLOANumber,
        hmoApprovedAmount: all.hmoApprovedAmount,
        // PhilHealth
        philhealthNumber: all.philhealthNumber,
        philhealthMemberType: all.philhealthMemberType,
        // Senior/PWD
        seniorPWDId: all.seniorPWDId,
        discountType: all.discountType,
        // Deposit
        initialDeposit: all.initialDeposit,
        depositMethod: all.depositMethod,
        depositReceivedBy: all.depositReceivedBy || user?.displayName || user?.username,
        createDefaultDocuments: true,
        createDefaultConsents: true,
      });
    } catch {
      // validation failed
    }
  };

  const roomsByFloor = (rooms || []).reduce((acc: any, r: any) => {
    const floor = r.floor || 'Unassigned';
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(r);
    return acc;
  }, {});

  // ── Step renderers ──────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div>
      <Form.Item label="Search Patient" name="patientDisplay" rules={[{ required: !selectedPatient, message: 'Please select a patient' }]}>
        <AutoComplete
          options={patientOptions}
          onSearch={handlePatientSearch}
          onSelect={handlePatientSelect}
          placeholder="Search by name or patient number..."
          notFoundContent={patientSearching ? <Spin size="small" /> : 'No patients found'}
        />
      </Form.Item>
      {selectedPatient && (
        <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Space direction="vertical" size={2}>
                <Text strong style={{ fontSize: 16 }}>{selectedPatient.lastName}, {selectedPatient.firstName} {selectedPatient.middleName}</Text>
                <Text type="secondary">{selectedPatient.patientNo}</Text>
                <Space>
                  <Tag>{selectedPatient.gender}</Tag>
                  {selectedPatient.dateOfBirth && <Tag>{dayjs(selectedPatient.dateOfBirth).format('MMM D, YYYY')} · {dayjs().diff(dayjs(selectedPatient.dateOfBirth), 'year')} yrs</Tag>}
                  {selectedPatient.isSenior && <Tag color="gold">Senior</Tag>}
                  {selectedPatient.isPwd && <Tag color="purple">PWD</Tag>}
                </Space>
              </Space>
            </Col>
            <Col xs={24} sm={12}>
              <Space direction="vertical" size={2}>
                <Text><b>Phone:</b> {selectedPatient.phone || '—'}</Text>
                <Text><b>Address:</b> {selectedPatient.address || '—'}</Text>
                {selectedPatient.philhealthNo && <Text><b>PhilHealth:</b> {selectedPatient.philhealthNo}</Text>}
                {selectedPatient.bloodType && <Tag color="red">Blood: {selectedPatient.bloodType}</Tag>}
              </Space>
            </Col>
          </Row>
          <Button size="small" style={{ marginTop: 8 }} onClick={() => { setSelectedPatient(null); form.setFieldValue('patientDisplay', ''); }}>
            Change Patient
          </Button>
        </Card>
      )}
    </div>
  );

  const renderStep1 = () => (
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item name="admissionType" label="Admission Type" rules={[{ required: true }]} initialValue="INPATIENT">
          <Select options={[
            { value: 'INPATIENT', label: 'Inpatient' },
            { value: 'DAYCARE', label: 'Day Care / Observation' },
            { value: 'ER', label: 'Emergency' },
            { value: 'OPD_OBSERVATION', label: 'OPD Observation' },
          ]} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="admissionSource" label="Source of Admission" rules={[{ required: true }]}>
          <Select options={ADMISSION_SOURCE_OPTIONS} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="serviceClass" label="Service Classification" rules={[{ required: true }]}>
          <Select options={SERVICE_CLASS_OPTIONS} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="attendingDoctor" label="Attending Physician" rules={[{ required: true }]}>
          <Select
            showSearch optionFilterProp="label" placeholder="Select attending physician..."
            options={(doctors || []).map((d: any) => ({
              value: `Dr. ${d.firstName} ${d.lastName}`,
              label: `Dr. ${d.firstName} ${d.lastName}${d.specialization ? ' · ' + d.specialization : ''}`,
            }))}
          />
        </Form.Item>
      </Col>
      <Col xs={24}>
        <Form.Item name="chiefComplaint" label="Chief Complaint / Reason for Admission" rules={[{ required: true }]}>
          <TextArea rows={2} placeholder="Main presenting complaint..." />
        </Form.Item>
      </Col>
      <Col xs={24}>
        <Form.Item name="diagnosis" label="Admitting Diagnosis">
          <Input placeholder="Preliminary / admitting diagnosis..." />
        </Form.Item>
      </Col>
      <Col xs={24}>
        <Form.Item name="notes" label="Admission Notes">
          <TextArea rows={2} placeholder="Additional notes..." />
        </Form.Item>
      </Col>
    </Row>
  );

  const renderStep2 = () => (
    <div>
      <Alert
        type="info"
        showIcon
        message={`${(rooms || []).filter((r: any) => !r.isOccupied).length} room(s) available`}
        style={{ marginBottom: 16 }}
      />
      {Object.keys(roomsByFloor).sort().map((floor) => (
        <div key={floor} style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Floor {floor}</Text>
          <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
            {roomsByFloor[floor].map((r: any) => (
              <Col key={r.id} xs={12} sm={8} md={6}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => { setSelectedRoom(r); form.setFieldValue('roomId', r.id); }}
                  style={{
                    borderColor: selectedRoom?.id === r.id ? '#1890ff' : r.isOccupied ? '#ff4d4f' : '#d9d9d9',
                    background: selectedRoom?.id === r.id ? '#e6f7ff' : r.isOccupied ? '#fff1f0' : '#fff',
                    cursor: r.isOccupied ? 'not-allowed' : 'pointer',
                    opacity: r.isOccupied ? 0.6 : 1,
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <HomeOutlined style={{ fontSize: 18, color: r.isOccupied ? '#ff4d4f' : selectedRoom?.id === r.id ? '#1890ff' : '#666' }} />
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Room {r.roomNumber}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>{r.roomType?.name || 'General'}</div>
                    {r.roomType?.ratePerDay && (
                      <div style={{ fontSize: 11, color: '#52c41a' }}>₱{Number(r.roomType.ratePerDay).toLocaleString()}/day</div>
                    )}
                    <Tag color={r.isOccupied ? 'red' : 'green'} style={{ fontSize: 10, marginTop: 2 }}>
                      {r.isOccupied ? 'Occupied' : 'Available'}
                    </Tag>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}
      {selectedRoom && (
        <Alert
          type="success"
          showIcon
          message={`Selected: Room ${selectedRoom.roomNumber} — ${selectedRoom.roomType?.name || 'General'}, Floor ${selectedRoom.floor || '?'}`}
          action={<Button size="small" onClick={() => { setSelectedRoom(null); form.setFieldValue('roomId', null); }}>Clear</Button>}
        />
      )}
      {!selectedRoom && <Alert type="warning" showIcon message="No room selected. You can assign a room later." />}
      <Form.Item name="roomId" hidden><Input /></Form.Item>
    </div>
  );

  const renderStep3 = () => (
    <div>
      {/* HMO */}
      <Title level={5} style={{ marginBottom: 12 }}>HMO Coverage</Title>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="hmoRegistrationId" label="HMO Registration">
            <Select
              allowClear placeholder="Select patient's HMO..."
              onChange={(id) => {
                const reg = hmoRegistrations.find((r: any) => r.id === id);
                if (reg) form.setFieldsValue({ hmoName: reg.hmoCompany?.name, hmoCardNumber: reg.memberNo });
              }}
              options={hmoRegistrations.map((r: any) => ({
                value: r.id,
                label: `${r.hmoCompany?.name} — ${r.memberNo}${r.plan ? ' · ' + r.plan : ''}`,
              }))}
              notFoundContent={<Text type="secondary">No active HMO on file.{' '}<a onClick={() => {}}>Add manually below.</a></Text>}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="hmoName" label="HMO Company Name">
            <Input placeholder="e.g. Maxicare, Intellicare..." />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="hmoCardNumber" label="HMO Card Number">
            <Input placeholder="Card / Member No." />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="hmoLOANumber" label="LOA Number">
            <Input placeholder="Letter of Authorization No." />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="hmoApprovedAmount" label="Approved Amount (₱)">
            <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
        </Col>
      </Row>

      <Divider />

      {/* PhilHealth */}
      <Title level={5} style={{ marginBottom: 12 }}>PhilHealth</Title>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="philhealthNumber" label="PhilHealth Number">
            <Input placeholder="PhilHealth / MDR No." />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="philhealthMemberType" label="Member Type">
            <Select allowClear options={PHILHEALTH_MEMBER_TYPES} />
          </Form.Item>
        </Col>
      </Row>

      <Divider />

      {/* Senior / PWD */}
      <Title level={5} style={{ marginBottom: 12 }}>Senior / PWD / Discount</Title>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="discountType" label="Discount Type">
            <Select allowClear options={[
              { value: 'NONE',     label: 'None' },
              { value: 'SENIOR',   label: 'Senior Citizen (20%)' },
              { value: 'PWD',      label: 'PWD (20%)' },
              { value: 'INDIGENT', label: 'Indigent / NHTS' },
            ]} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="seniorPWDId" label="Senior / PWD ID Number">
            <Input placeholder="SC or PWD ID number..." />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );

  const renderStep4 = () => (
    <Row gutter={16}>
      <Col xs={24}>
        <Alert showIcon type="info" message="Guarantor is the person financially responsible. If the patient is paying themselves, put 'SELF'." style={{ marginBottom: 16 }} />
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="guarantorName" label="Guarantor Full Name" rules={[{ required: true, message: 'Guarantor name is required' }]}>
          <Input placeholder="Full name of guarantor..." />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="guarantorRelationship" label="Relationship to Patient" rules={[{ required: true }]}>
          <Select options={RELATIONSHIP_OPTIONS} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="guarantorContact" label="Contact Number" rules={[{ required: true }]}>
          <Input placeholder="Mobile / phone number..." />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="guarantorAddress" label="Address">
          <Input placeholder="Complete address..." />
        </Form.Item>
      </Col>
    </Row>
  );

  const renderStep5 = () => (
    <Row gutter={16}>
      <Col xs={24}>
        <Alert showIcon type="info" message="Collect initial deposit or document LOA/HMO coverage as financial guarantee." style={{ marginBottom: 16 }} />
      </Col>
      <Col xs={24} sm={8}>
        <Form.Item name="initialDeposit" label="Initial Deposit (₱)">
          <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={8}>
        <Form.Item name="depositMethod" label="Payment Method">
          <Select allowClear options={DEPOSIT_METHODS} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={8}>
        <Form.Item name="depositReceivedBy" label="Received By" initialValue={user?.displayName}>
          <Input />
        </Form.Item>
      </Col>
    </Row>
  );

  const renderStep6 = () => (
    <div>
      <Alert
        showIcon type="success"
        message="Almost done! The system will automatically generate the document checklist and consent forms based on the patient's coverage."
        description="You can mark documents as received and sign consent forms from the admission record after processing."
        style={{ marginBottom: 16 }}
      />
      <Title level={5} style={{ marginBottom: 8 }}>Documents that will be requested:</Title>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        {[
          'Valid Government-issued ID (Patient or Guardian)',
          'Signed Admission Form',
          'Referral Letter / Doctor\'s Order',
          ...(formData.hmoRegistrationId || formData.hmoName ? ['HMO Card', 'HMO Letter of Authorization (LOA)'] : []),
          ...(formData.philhealthNumber ? ['PhilHealth MDR (Member Data Record)'] : []),
          ...(formData.discountType === 'SENIOR' ? ['Senior Citizen ID & Booklet'] : []),
          ...(formData.discountType === 'PWD' ? ['PWD ID'] : []),
          'Previous Hospital Records (if any)',
        ].map((doc, i) => (
          <Space key={i}><CheckCircleOutlined style={{ color: '#52c41a' }} /><Text>{doc}</Text></Space>
        ))}
      </Space>
      <Divider />
      <Title level={5} style={{ marginBottom: 8 }}>Consent forms that will be prepared:</Title>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        {['General Consent for Treatment', 'Financial Responsibility Agreement', 'Data Privacy Consent',
          'Blood Transfusion Consent', 'Anesthesia Consent', 'Surgical Procedure Consent', 'Photo/Video Documentation Consent']
          .map((c, i) => (
            <Space key={i}><ClockCircleOutlined style={{ color: '#fa8c16' }} /><Text>{c}</Text></Space>
          ))}
      </Space>
    </div>
  );

  const stepContent = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];

  return (
    <Modal
      title={<Space><MedicineBoxOutlined /><span>New Patient Admission — Step {current + 1} of {steps.length}</span></Space>}
      open={open}
      onCancel={handleReset}
      width={760}
      footer={
        <Row justify="space-between">
          <Col>
            {current > 0 && <Button onClick={() => setCurrent((c) => c - 1)}>← Back</Button>}
          </Col>
          <Col>
            <Space>
              <Button onClick={handleReset}>Cancel</Button>
              {current < steps.length - 1 ? (
                <Button type="primary" onClick={saveStep}>
                  Next →
                </Button>
              ) : (
                <Button type="primary" loading={admitMutation.isPending} onClick={handleFinish} icon={<CheckCircleOutlined />}>
                  Admit Patient
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      }
      destroyOnClose
    >
      <Steps
        current={current}
        items={steps}
        size="small"
        style={{ marginBottom: 24 }}
        onChange={(s) => { if (s < current) setCurrent(s); }}
      />
      <div style={{ minHeight: 320 }}>
        <Form form={form} layout="vertical">
          {stepContent[current]?.()}
        </Form>
      </div>
    </Modal>
  );
};

export default AdmissionWizard;
