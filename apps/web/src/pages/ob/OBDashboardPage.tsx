import React, { useState } from 'react';
import {
  Card, Row, Col, Tag, Button, Space, Typography, Statistic,
  Modal, Form, Input, InputNumber, Select, Table, Divider,
  Descriptions, Alert, DatePicker, Drawer, Tabs, Tooltip, Timeline,
  Badge,
} from 'antd';
import {
  HeartOutlined, PlusOutlined, FileTextOutlined, MedicineBoxOutlined,
  CheckCircleOutlined, ClockCircleOutlined, LineChartOutlined,
  EditOutlined, FieldTimeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import ClinicalNotesPanel from '../../components/clinical/ClinicalNotesPanel';

const { Title, Text } = Typography;
const { TextArea } = Input;

const DELIVERY_TYPES = [
  { value: 'NSD',     label: 'NSD — Normal Spontaneous Delivery' },
  { value: 'CS',      label: 'CS — Cesarean Section' },
  { value: 'FORCEPS', label: 'Forceps Delivery' },
  { value: 'VACUUM',  label: 'Vacuum Extraction' },
  { value: 'BREECH',  label: 'Breech Delivery' },
];

const PERINEAL_OPTIONS = [
  { value: 'INTACT',      label: 'Intact' },
  { value: '1ST_DEGREE',  label: '1st Degree Laceration' },
  { value: '2ND_DEGREE',  label: '2nd Degree Laceration' },
  { value: '3RD_DEGREE',  label: '3rd Degree Laceration' },
  { value: 'EPISIOTOMY',  label: 'Episiotomy' },
];

const apgarLabel = (score: number | null): { color: string; label: string } => {
  if (score === null || score === undefined) return { color: '#d9d9d9', label: '—' };
  if (score >= 7) return { color: '#52c41a', label: 'Good' };
  if (score >= 4) return { color: '#fa8c16', label: 'Fair' };
  return { color: '#ff4d4f', label: 'Poor' };
};

const fhrStatus = (fhr: number): { color: string; label: string } => {
  if (fhr >= 110 && fhr <= 160) return { color: '#52c41a', label: 'Normal' };
  if ((fhr >= 100 && fhr < 110) || (fhr > 160 && fhr <= 180)) return { color: '#fa8c16', label: 'Borderline' };
  return { color: '#ff4d4f', label: 'Abnormal' };
};

// ── Partograph Drawer ─────────────────────────────────────────────────────────
const PartographDrawer: React.FC<{ admission: any; open: boolean; onClose: () => void }> = ({ admission, open, onClose }) => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [partForm] = Form.useForm();
  const [fhrForm] = Form.useForm();
  const [obsForm] = Form.useForm();
  const [partModal, setPartModal] = useState(false);
  const [fhrModal, setFhrModal] = useState(false);
  const [obsModal, setObsModal] = useState(false);

  const { data: obsRecord, refetch } = useQuery({
    queryKey: ['obs-record', admission?.id],
    queryFn: () => api.get(`/admissions/${admission.id}/obs-record`).then((r) => r.data?.data),
    enabled: !!admission?.id && open,
  });

  const upsertMutation = useMutation({
    mutationFn: (data: any) => api.put(`/admissions/${admission.id}/obs-record`, data),
    onSuccess: () => refetch(),
  });

  const partographData: any[] = obsRecord?.partographData || [];
  const fhrRecords: any[] = obsRecord?.fhrRecords || [];

  const savePartEntry = (values: any) => {
    const entry = {
      recordedAt: values.recordedAt?.toISOString() || new Date().toISOString(),
      cervicalDilation: values.cervicalDilation,
      fetalStation: values.fetalStation,
      contractions: values.contractions,
      contractionDuration: values.contractionDuration,
      fhr: values.fhr,
      maternalBP: values.maternalBP,
      maternalHR: values.maternalHR,
      liquor: values.liquor,
      moulding: values.moulding,
      notes: values.notes,
      recordedBy: user?.displayName || user?.username,
    };
    upsertMutation.mutate({ partographData: [...partographData, entry] });
    setPartModal(false);
    partForm.resetFields();
  };

  const saveFhrEntry = (values: any) => {
    const entry = {
      recordedAt: values.recordedAt?.toISOString() || new Date().toISOString(),
      baseline: values.baseline,
      variability: values.variability,
      accelerations: values.accelerations,
      decelerations: values.decelerations,
      decelerationType: values.decelerationType,
      notes: values.notes,
      recordedBy: user?.displayName || user?.username,
    };
    upsertMutation.mutate({ fhrRecords: [...fhrRecords, entry] });
    setFhrModal(false);
    fhrForm.resetFields();
  };

  const saveObsInfo = (values: any) => {
    upsertMutation.mutate(values);
    setObsModal(false);
    obsForm.resetFields();
  };

  // Sort entries chronologically
  const sortedPart = [...partographData].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const sortedFhr = [...fhrRecords].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  // Last cervical dilation
  const lastPart = sortedPart[sortedPart.length - 1];
  const latestFhr = sortedFhr[0];

  const partColumns = [
    { title: 'Time', dataIndex: 'recordedAt', render: (v: string) => dayjs(v).format('HH:mm'), width: 70 },
    {
      title: 'Dilation (cm)',
      dataIndex: 'cervicalDilation',
      render: (v: number) => {
        const pct = Math.round((v / 10) * 100);
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ color: v >= 10 ? '#52c41a' : v >= 7 ? '#1890ff' : '#333' }}>{v} cm</Text>
            <div style={{ height: 4, width: 60, background: '#f0f0f0', borderRadius: 2 }}>
              <div style={{ height: 4, width: `${pct}%`, background: v >= 10 ? '#52c41a' : '#1890ff', borderRadius: 2 }} />
            </div>
          </Space>
        );
      },
    },
    { title: 'Station', dataIndex: 'fetalStation', render: (v: number) => v !== undefined ? (v > 0 ? `+${v}` : `${v}`) : '—' },
    { title: 'Contrax/10min', dataIndex: 'contractions' },
    { title: 'Duration (s)', dataIndex: 'contractionDuration' },
    {
      title: 'FHR (bpm)',
      dataIndex: 'fhr',
      render: (v: number) => v ? (
        <Tag color={fhrStatus(v).color}>{v}</Tag>
      ) : '—',
    },
    { title: 'BP', dataIndex: 'maternalBP' },
    { title: 'Notes', dataIndex: 'notes', render: (v: string) => v ? <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> : '' },
    { title: 'By', dataIndex: 'recordedBy', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
  ];

  return (
    <Drawer
      title={
        <Space>
          <LineChartOutlined style={{ color: '#eb2f96' }} />
          <Text strong>
            Partograph — {admission?.patient?.lastName}, {admission?.patient?.firstName}
          </Text>
          {lastPart && (
            <Tag color="blue">Dilation: {lastPart.cervicalDilation} cm</Tag>
          )}
          {latestFhr && (
            <Tag color={fhrStatus(latestFhr.baseline)?.color || 'default'}>
              FHR: {latestFhr.baseline} bpm
            </Tag>
          )}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={960}
      extra={
        <Button size="small" icon={<EditOutlined />} onClick={() => {
          obsForm.setFieldsValue({
            gravida: obsRecord?.gravida,
            para: obsRecord?.para,
            abortus: obsRecord?.abortus,
            gestationalAgeAtAdmit: obsRecord?.gestationalAgeAtAdmit,
            presentationType: obsRecord?.presentationType,
            membraneStatus: obsRecord?.membraneStatus,
            bloodGroup: obsRecord?.bloodGroup,
          });
          setObsModal(true);
        }}>
          OB Info
        </Button>
      }
    >
      {/* OB Info summary */}
      {obsRecord?.gravida !== null && obsRecord?.gravida !== undefined && (
        <Card size="small" style={{ marginBottom: 12, background: '#fff0f6', borderColor: '#ffadd2' }}>
          <Descriptions size="small" column={4}>
            <Descriptions.Item label="G/P/A">
              <Text strong>G{obsRecord.gravida ?? '?'} P{obsRecord.para ?? '?'} A{obsRecord.abortus ?? '0'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="GA">{obsRecord.gestationalAgeAtAdmit ? `${obsRecord.gestationalAgeAtAdmit} wks` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Presentation">
              {obsRecord.presentationType ? <Tag color="blue">{obsRecord.presentationType}</Tag> : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Membranes">
              {obsRecord.membraneStatus ? (
                <Tag color={obsRecord.membraneStatus === 'RUPTURED' ? 'red' : 'green'}>
                  {obsRecord.membraneStatus}
                  {obsRecord.membraneRupturedAt ? ` @ ${dayjs(obsRecord.membraneRupturedAt).format('HH:mm')}` : ''}
                </Tag>
              ) : '—'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Tabs
        items={[
          {
            key: 'partograph',
            label: (
              <Space>
                <LineChartOutlined />
                Cervical Progress ({partographData.length} entries)
              </Space>
            ),
            children: (
              <div>
                {/* Visual dilation progress */}
                {sortedPart.length > 0 && (
                  <Card size="small" style={{ marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 12 }}>Cervical Dilation Progress</Text>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 8, height: 80 }}>
                      {sortedPart.map((entry: any, i: number) => {
                        const height = Math.round((entry.cervicalDilation / 10) * 72);
                        const isLast = i === sortedPart.length - 1;
                        return (
                          <Tooltip key={i} title={`${dayjs(entry.recordedAt).format('HH:mm')} — ${entry.cervicalDilation} cm`}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 28 }}>
                              <Text style={{ fontSize: 9, color: '#666' }}>{entry.cervicalDilation}</Text>
                              <div
                                style={{
                                  height,
                                  width: 20,
                                  background: isLast ? '#eb2f96' : '#91caff',
                                  borderRadius: '3px 3px 0 0',
                                  transition: 'all 0.3s',
                                }}
                              />
                              <Text style={{ fontSize: 9, color: '#999', marginTop: 2 }}>
                                {dayjs(entry.recordedAt).format('HH:mm')}
                              </Text>
                            </div>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </Card>
                )}

                <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                  <Col><Text strong>Cervical Exam Log</Text></Col>
                  <Col>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { partForm.setFieldsValue({ recordedAt: dayjs() }); setPartModal(true); }}>
                      Add Cervical Exam
                    </Button>
                  </Col>
                </Row>

                <Table
                  dataSource={[...sortedPart].reverse()}
                  columns={partColumns}
                  rowKey={(r: any) => r.recordedAt}
                  size="small"
                  pagination={false}
                  scroll={{ x: 600 }}
                  locale={{ emptyText: 'No cervical exams recorded — click "Add Cervical Exam"' }}
                />
              </div>
            ),
          },
          {
            key: 'fhr',
            label: (
              <Space>
                <HeartOutlined />
                FHR Monitoring ({fhrRecords.length} entries)
              </Space>
            ),
            children: (
              <div>
                {/* FHR summary */}
                {sortedFhr.length > 0 && (
                  <Row gutter={12} style={{ marginBottom: 12 }}>
                    <Col span={8}>
                      <Card size="small" style={{ background: '#fff0f6', borderColor: '#ffadd2' }}>
                        <Statistic
                          title="Latest Baseline FHR"
                          value={sortedFhr[0]?.baseline || '—'}
                          suffix="bpm"
                          valueStyle={{ color: sortedFhr[0]?.baseline ? fhrStatus(sortedFhr[0].baseline).color : '#999' }}
                        />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic title="Last FHR Entry" value={dayjs(sortedFhr[0]?.recordedAt).fromNow()} />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic title="Total Entries" value={fhrRecords.length} />
                      </Card>
                    </Col>
                  </Row>
                )}

                <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                  <Col><Text strong>FHR Log</Text></Col>
                  <Col>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { fhrForm.setFieldsValue({ recordedAt: dayjs() }); setFhrModal(true); }}>
                      Record FHR
                    </Button>
                  </Col>
                </Row>

                <Timeline
                  items={sortedFhr.map((entry: any) => ({
                    color: fhrStatus(entry.baseline)?.color || 'gray',
                    children: (
                      <Card size="small" style={{ marginBottom: 4 }}>
                        <Row>
                          <Col flex="auto">
                            <Space wrap size={4}>
                              <Text strong style={{ fontSize: 13 }}>{entry.baseline} bpm</Text>
                              <Tag color={fhrStatus(entry.baseline)?.color}>{fhrStatus(entry.baseline)?.label}</Tag>
                              {entry.variability && <Tag color="blue" style={{ fontSize: 10 }}>Var: {entry.variability}</Tag>}
                              {entry.accelerations && <Tag color="green" style={{ fontSize: 10 }}>Accels: {entry.accelerations}</Tag>}
                              {entry.decelerations && (
                                <Tag color={entry.decelerationType === 'EARLY' ? 'default' : entry.decelerationType === 'LATE' ? 'red' : 'orange'} style={{ fontSize: 10 }}>
                                  {entry.decelerationType || ''} Decel: {entry.decelerations}
                                </Tag>
                              )}
                            </Space>
                            {entry.notes && <div><Text type="secondary" style={{ fontSize: 11 }}>{entry.notes}</Text></div>}
                          </Col>
                          <Col>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {dayjs(entry.recordedAt).format('MMM D HH:mm')}<br />
                              {entry.recordedBy}
                            </Text>
                          </Col>
                        </Row>
                      </Card>
                    ),
                  }))}
                />
                {sortedFhr.length === 0 && (
                  <Alert type="info" showIcon message="No FHR entries recorded" description='Click "Record FHR" to add monitoring entries.' />
                )}
              </div>
            ),
          },
        ]}
      />

      {/* ── Partograph Entry Modal ── */}
      <Modal
        title="Add Cervical Exam / Partograph Entry"
        open={partModal}
        onCancel={() => { setPartModal(false); partForm.resetFields(); }}
        onOk={() => partForm.submit()}
        confirmLoading={upsertMutation.isPending}
        width={640}
      >
        <Form form={partForm} layout="vertical" onFinish={savePartEntry}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="recordedAt" label="Time of Exam" rules={[{ required: true }]}>
                <DatePicker showTime format="MMM D HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cervicalDilation" label="Cervical Dilation (cm)" rules={[{ required: true }]}>
                <InputNumber min={0} max={10} style={{ width: '100%' }} placeholder="0–10 cm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fetalStation" label="Fetal Station (–5 to +5)">
                <InputNumber min={-5} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fhr" label="FHR at exam (bpm)">
                <InputNumber min={60} max={220} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contractions" label="Contractions per 10 min">
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contractionDuration" label="Contraction Duration (sec)">
                <InputNumber min={0} max={120} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maternalBP" label="Maternal BP">
                <Input placeholder="120/80" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maternalHR" label="Maternal HR (bpm)">
                <InputNumber min={40} max={200} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="liquor" label="Liquor / Fluid">
                <Select allowClear options={[
                  { value: 'C', label: 'C — Clear' },
                  { value: 'M', label: 'M — Meconium stained' },
                  { value: 'B', label: 'B — Bloody' },
                  { value: 'A', label: 'A — Absent / Dry' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="moulding" label="Moulding">
                <Select allowClear options={[
                  { value: '0', label: '0 — No moulding' },
                  { value: '+', label: '+ — Sutures apposed' },
                  { value: '++', label: '++ — Sutures overlapping, reducible' },
                  { value: '+++', label: '+++ — Fixed overlap' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── FHR Entry Modal ── */}
      <Modal
        title="Record FHR Monitoring"
        open={fhrModal}
        onCancel={() => { setFhrModal(false); fhrForm.resetFields(); }}
        onOk={() => fhrForm.submit()}
        confirmLoading={upsertMutation.isPending}
      >
        <Form form={fhrForm} layout="vertical" onFinish={saveFhrEntry}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="recordedAt" label="Time" rules={[{ required: true }]}>
                <DatePicker showTime format="MMM D HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="baseline" label="Baseline FHR (bpm)" rules={[{ required: true }]}>
                <InputNumber min={60} max={220} style={{ width: '100%' }} placeholder="Normal: 110–160 bpm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="variability" label="Variability">
                <Select allowClear options={[
                  { value: 'ABSENT', label: 'Absent (<2 bpm)' },
                  { value: 'MINIMAL', label: 'Minimal (2–5 bpm)' },
                  { value: 'MODERATE', label: 'Moderate (6–25 bpm) — Normal' },
                  { value: 'MARKED', label: 'Marked (>25 bpm)' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="accelerations" label="Accelerations">
                <Select allowClear options={[
                  { value: 'PRESENT', label: 'Present (reactive)' },
                  { value: 'ABSENT', label: 'Absent (non-reactive)' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="decelerations" label="Decelerations">
                <Select allowClear options={[
                  { value: 'NONE', label: 'None' },
                  { value: 'VARIABLE', label: 'Variable' },
                  { value: 'EARLY', label: 'Early' },
                  { value: 'LATE', label: 'Late' },
                  { value: 'PROLONGED', label: 'Prolonged (>2 min)' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notes / NST interpretation">
                <TextArea rows={2} placeholder="Reactive / Non-reactive NST, additional findings..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── OB Info Modal ── */}
      <Modal
        title="Obstetric History & Admission Details"
        open={obsModal}
        onCancel={() => { setObsModal(false); obsForm.resetFields(); }}
        onOk={() => obsForm.submit()}
        confirmLoading={upsertMutation.isPending}
      >
        <Form form={obsForm} layout="vertical" onFinish={saveObsInfo}>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="gravida" label="Gravida"><InputNumber min={0} max={20} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="para" label="Para"><InputNumber min={0} max={20} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="abortus" label="Abortus"><InputNumber min={0} max={20} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="gestationalAgeAtAdmit" label="GA at Admission (wks)">
                <InputNumber min={20} max={45} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bloodGroup" label="Blood Group">
                <Select allowClear options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((v) => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="presentationType" label="Fetal Presentation">
                <Select allowClear options={[
                  { value: 'CEPHALIC', label: 'Cephalic (vertex)' },
                  { value: 'BREECH', label: 'Breech' },
                  { value: 'TRANSVERSE', label: 'Transverse' },
                  { value: 'OBLIQUE', label: 'Oblique' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="membraneStatus" label="Membrane Status">
                <Select allowClear options={[
                  { value: 'INTACT', label: 'Intact' },
                  { value: 'RUPTURED', label: 'Ruptured (SROM)' },
                  { value: 'AROM', label: 'AROM (Artificially ruptured)' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Drawer>
  );
};

// ── Main OB Dashboard ─────────────────────────────────────────────────────────
const OBDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [partographOpen, setPartographOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: admissions, isLoading } = useQuery({
    queryKey: ['ob-admissions', user?.departmentId],
    queryFn: () =>
      api.get('/admissions', { params: { status: 'ADMITTED', limit: 50, ...(user?.departmentId && { departmentId: user.departmentId }) } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 30000,
  });

  const { data: deliveriesData, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['deliveries-today'],
    queryFn: () =>
      api.get('/delivery-records', { params: { today: true, limit: 50 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 30000,
  });

  const deliveryMutation = useMutation({
    mutationFn: (data: any) => api.post('/delivery-records', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries-today'] });
      setDeliveryModal(false);
      form.resetFields();
      setSelectedAdmission(null);
    },
  });

  const patients = admissions || [];
  const deliveries = deliveriesData || [];
  const csCount = deliveries.filter((d: any) => d.deliveryType === 'CS').length;
  const nsdCount = deliveries.filter((d: any) => d.deliveryType === 'NSD').length;

  const deliveryColumns = [
    { title: 'Delivery No', dataIndex: 'deliveryNo', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>, width: 130 },
    {
      title: 'Mother',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.patient?.lastName}, {r.patient?.firstName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    { title: 'Time', dataIndex: 'deliveryDateTime', render: (v: string) => dayjs(v).format('h:mm A'), width: 80 },
    { title: 'Type', dataIndex: 'deliveryType', render: (v: string) => <Tag color={v === 'CS' ? 'orange' : 'blue'}>{v}</Tag>, width: 80 },
    {
      title: 'Baby',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Space size={4}>
            <Tag style={{ fontSize: 10 }}>{r.babyGender || '—'}</Tag>
            {r.babyWeight && <Text style={{ fontSize: 11 }}>{r.babyWeight} kg</Text>}
            {r.gestationalAge && <Text style={{ fontSize: 11 }}>{r.gestationalAge} wks</Text>}
          </Space>
        </Space>
      ),
    },
    {
      title: 'APGAR 1\'/ 5\'',
      render: (_: any, r: any) => {
        const a1 = apgarLabel(r.apgar1);
        const a5 = apgarLabel(r.apgar5);
        return (
          <Space>
            <Tooltip title={`APGAR @ 1 min: ${a1.label}`}>
              <Tag color={a1.color}>{r.apgar1 ?? '—'}</Tag>
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 10 }}>→</Text>
            <Tooltip title={`APGAR @ 5 min: ${a5.label}`}>
              <Tag color={a5.color}>{r.apgar5 ?? '—'}</Tag>
            </Tooltip>
          </Space>
        );
      },
      width: 110,
    },
    { title: 'Attending', render: (_: any, r: any) => <Text style={{ fontSize: 12 }}>{r.attendingDoctor || '—'}</Text> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <HeartOutlined style={{ fontSize: 24, color: '#eb2f96' }} />
            <Title level={3} style={{ margin: 0 }}>OB / Delivery Room</Title>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><Card><Statistic title="In Labor" value={patients.length} valueStyle={{ color: '#eb2f96' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Deliveries Today" value={deliveries.length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="NSD Today" value={nsdCount} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="CS Today" value={csCount} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
      </Row>

      <Row gutter={16}>
        {/* Labor Watch */}
        <Col xs={24} lg={10}>
          <Card
            title={<Space><ClockCircleOutlined style={{ color: '#eb2f96' }} />Labor Watch ({patients.length})</Space>}
            loading={isLoading}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {patients.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>No patients currently in labor</div>
              )}
              {patients.map((a: any) => (
                <Card key={a.id} size="small" style={{ borderLeft: '4px solid #eb2f96' }}>
                  <Row justify="space-between" align="top">
                    <Col flex="auto">
                      <Text strong>{a.patient?.lastName}, {a.patient?.firstName}</Text>
                      <div><Text type="secondary" style={{ fontSize: 11 }}>{a.patient?.patientNo} · Day {a.daysStayed || 1}</Text></div>
                      {a.room && <Tag style={{ fontSize: 10, marginTop: 4 }}>Rm {a.room.roomNumber}</Tag>}
                      {a.chiefComplaint && <div><Text type="secondary" style={{ fontSize: 11 }}>{a.chiefComplaint}</Text></div>}
                      {a.attendingDoctor && <div><Text style={{ fontSize: 11 }}>Dr. {a.attendingDoctor}</Text></div>}
                    </Col>
                    <Col>
                      <Space direction="vertical" size={4} align="end">
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => { setSelectedAdmission(a); setDeliveryModal(true); form.setFieldsValue({ attendingDoctor: a.attendingDoctor }); }}
                        >
                          Record Delivery
                        </Button>
                        <Space size={4}>
                          <Tooltip title="Partograph & FHR">
                            <Button size="small" icon={<LineChartOutlined />} onClick={() => { setActivePatient(a); setPartographOpen(true); }}>
                              Partograph
                            </Button>
                          </Tooltip>
                          <Tooltip title="Clinical Notes">
                            <Button size="small" icon={<FileTextOutlined />} onClick={() => { setActivePatient(a); setNotesOpen(true); }} />
                          </Tooltip>
                        </Space>
                      </Space>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>
          </Card>
        </Col>

        {/* Today's Deliveries */}
        <Col xs={24} lg={14}>
          <Card
            title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} />Today's Deliveries</Space>}
            loading={deliveriesLoading}
          >
            <Table
              dataSource={deliveries}
              columns={deliveryColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Record Delivery Modal */}
      <Modal
        title={`Record Delivery — ${selectedAdmission?.patient?.firstName} ${selectedAdmission?.patient?.lastName}`}
        open={deliveryModal}
        onCancel={() => { setDeliveryModal(false); form.resetFields(); setSelectedAdmission(null); }}
        onOk={() => form.submit()}
        confirmLoading={deliveryMutation.isPending}
        width={680}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => deliveryMutation.mutate({
            patientId: selectedAdmission?.patientId,
            admissionId: selectedAdmission?.id,
            deliveryDateTime: v.deliveryDateTime?.toISOString() || new Date().toISOString(),
            deliveryType: v.deliveryType,
            gestationalAge: v.gestationalAge,
            babyWeight: v.babyWeight,
            babyGender: v.babyGender,
            babyLength: v.babyLength,
            apgar1: v.apgar1,
            apgar5: v.apgar5,
            apgar10: v.apgar10,
            placentaComplete: v.placentaComplete,
            bloodLoss: v.bloodLoss,
            perinealStatus: v.perinealStatus,
            complications: v.complications,
            attendingDoctor: v.attendingDoctor,
            attendingNurse: v.attendingNurse,
            notes: v.notes,
          })}
        >
          <Row gutter={16}>
            <Col span={24}><Divider orientation="left" style={{ margin: '0 0 12px' }}>Delivery Details</Divider></Col>
            <Col xs={24} sm={12}>
              <Form.Item name="deliveryDateTime" label="Date & Time of Delivery" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker showTime format="MMM D, YYYY h:mm A" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="deliveryType" label="Type of Delivery" rules={[{ required: true }]}>
                <Select options={DELIVERY_TYPES} />
              </Form.Item>
            </Col>

            <Col span={24}><Divider orientation="left" style={{ margin: '8px 0 12px' }}>Baby Information</Divider></Col>
            <Col xs={24} sm={8}>
              <Form.Item name="babyGender" label="Baby Gender">
                <Select options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'UNDETERMINED', label: 'Undetermined' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="babyWeight" label="Birth Weight (kg)">
                <InputNumber min={0.3} max={8} step={0.01} precision={2} style={{ width: '100%' }} placeholder="e.g. 3.20" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="babyLength" label="Birth Length (cm)">
                <InputNumber min={20} max={70} step={0.5} precision={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="gestationalAge" label="Gestational Age (wks)">
                <InputNumber min={20} max={45} style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={24}><Divider orientation="left" style={{ margin: '8px 0 12px' }}>APGAR Scores</Divider></Col>
            <Col xs={24} sm={8}>
              <Form.Item name="apgar1" label="APGAR @ 1 min" tooltip="Score 0–10: Activity, Pulse, Grimace, Appearance, Respiration">
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="apgar5" label="APGAR @ 5 min">
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="apgar10" label="APGAR @ 10 min">
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={24}><Divider orientation="left" style={{ margin: '8px 0 12px' }}>Mother / Post-Delivery</Divider></Col>
            <Col xs={24} sm={8}>
              <Form.Item name="bloodLoss" label="Estimated Blood Loss (ml)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="placentaComplete" label="Placenta Complete">
                <Select options={[{ value: true, label: 'Yes — Complete' }, { value: false, label: 'No — Incomplete' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="perinealStatus" label="Perineal Status">
                <Select options={PERINEAL_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="complications" label="Complications">
                <Input placeholder="None / describe complications..." />
              </Form.Item>
            </Col>

            <Col span={24}><Divider orientation="left" style={{ margin: '8px 0 12px' }}>Attending Team</Divider></Col>
            <Col xs={24} sm={12}>
              <Form.Item name="attendingDoctor" label="Attending Physician">
                <Input placeholder="OB-GYN name..." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="attendingNurse" label="Delivery Nurse">
                <Input placeholder="Nurse name..." />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="notes" label="Delivery Notes">
                <TextArea rows={3} placeholder="Additional delivery notes, maternal condition, baby condition..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Clinical Notes Panel */}
      <ClinicalNotesPanel
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        patientId={activePatient?.patientId}
        admissionId={activePatient?.id}
        patientName={`${activePatient?.patient?.firstName || ''} ${activePatient?.patient?.lastName || ''}`}
      />

      {/* Partograph & FHR Drawer */}
      {activePatient && (
        <PartographDrawer
          admission={activePatient}
          open={partographOpen}
          onClose={() => setPartographOpen(false)}
        />
      )}
    </div>
  );
};

export default OBDashboardPage;
