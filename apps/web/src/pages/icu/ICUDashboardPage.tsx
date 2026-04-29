import React, { useState } from 'react';
import {
  Card, Row, Col, Tag, Button, Space, Typography, Statistic,
  Modal, Form, Input, InputNumber, Select, Badge, Alert, Divider,
  Descriptions, Progress, Drawer, Tabs, Table, Popconfirm, Tooltip,
} from 'antd';
import {
  MonitorOutlined, PlusOutlined, HeartOutlined, AlertOutlined,
  FileTextOutlined, MedicineBoxOutlined, WarningOutlined,
  EditOutlined, DeleteOutlined, SafetyOutlined, ThunderboltOutlined,
  DropboxOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import ClinicalNotesPanel from '../../components/clinical/ClinicalNotesPanel';

const { Title, Text } = Typography;

// ── Thresholds ───────────────────────────────────────────────────────────────
const isCritical = (v: any): boolean => {
  if (!v) return false;
  if (v.oxygenSaturation && Number(v.oxygenSaturation) < 90) return true;
  if (v.heartRate && (Number(v.heartRate) > 130 || Number(v.heartRate) < 40)) return true;
  if (v.bloodPressureSystolic && Number(v.bloodPressureSystolic) > 180) return true;
  if (v.respiratoryRate && (Number(v.respiratoryRate) > 30 || Number(v.respiratoryRate) < 8)) return true;
  return false;
};

const getSpO2Color = (val: number | null): string => {
  if (!val) return '#d9d9d9';
  if (val >= 95) return '#52c41a';
  if (val >= 90) return '#fa8c16';
  return '#ff4d4f';
};

const RASS_LABELS: Record<number, { label: string; color: string }> = {
  4: { label: '+4 Combative', color: '#cf1322' },
  3: { label: '+3 Very Agitated', color: '#f5222d' },
  2: { label: '+2 Agitated', color: '#fa8c16' },
  1: { label: '+1 Restless', color: '#faad14' },
  0: { label: '0 Alert & Calm', color: '#52c41a' },
  [-1]: { label: '-1 Drowsy', color: '#1890ff' },
  [-2]: { label: '-2 Light Sedation', color: '#096dd9' },
  [-3]: { label: '-3 Moderate Sedation', color: '#0050b3' },
  [-4]: { label: '-4 Deep Sedation', color: '#003a8c' },
  [-5]: { label: '-5 Unarousable', color: '#002766' },
};

const CODE_STATUS_COLOR: Record<string, string> = {
  FULL_CODE: 'green',
  DNR: 'red',
  DNI: 'orange',
  COMFORT_CARE: 'purple',
};

// ── ICUMonitorDrawer — full detail per patient ────────────────────────────────
const ICUMonitorDrawer: React.FC<{ admission: any; open: boolean; onClose: () => void }> = ({ admission, open, onClose }) => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [dripForm] = Form.useForm();
  const [ioForm] = Form.useForm();
  const [ventForm] = Form.useForm();
  const [codeForm] = Form.useForm();
  const [dripModal, setDripModal] = useState(false);
  const [ioModal, setIoModal] = useState(false);
  const [ventModal, setVentModal] = useState(false);
  const [codeModal, setCodeModal] = useState(false);
  const [editDrip, setEditDrip] = useState<any>(null);

  const { data: icuRecord, refetch } = useQuery({
    queryKey: ['icu-record', admission?.id],
    queryFn: () => api.get(`/admissions/${admission.id}/icu-record`).then((r) => r.data?.data),
    enabled: !!admission?.id && open,
  });

  const upsertMutation = useMutation({
    mutationFn: (data: any) => api.put(`/admissions/${admission.id}/icu-record`, data),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['icu-admissions'] }); },
  });

  const dripOrders: any[] = icuRecord?.dripOrders || [];
  const ioRecords: any[] = icuRecord?.ioRecords || [];
  const ventSettings: any = icuRecord?.ventSettings || null;
  const rassScore: number | null = icuRecord?.rassScore ?? null;
  const codeStatus: string = icuRecord?.codeStatus || 'FULL_CODE';

  // Add / edit drip
  const saveDrip = (values: any) => {
    const updated = editDrip
      ? dripOrders.map((d: any, i: number) => (i === editDrip.index ? { ...d, ...values } : d))
      : [...dripOrders, { ...values, id: Date.now(), startedAt: new Date().toISOString(), status: 'RUNNING' }];
    upsertMutation.mutate({ dripOrders: updated });
    setDripModal(false);
    setEditDrip(null);
    dripForm.resetFields();
  };

  const stopDrip = (index: number) => {
    const updated = dripOrders.map((d: any, i: number) =>
      i === index ? { ...d, status: 'STOPPED', stoppedAt: new Date().toISOString() } : d
    );
    upsertMutation.mutate({ dripOrders: updated });
  };

  const deleteDrip = (index: number) => {
    const updated = dripOrders.filter((_: any, i: number) => i !== index);
    upsertMutation.mutate({ dripOrders: updated });
  };

  // Add I&O entry
  const saveIO = (values: any) => {
    const entry = {
      recordedAt: new Date().toISOString(),
      recordedBy: user?.displayName || user?.username,
      period: values.period,
      totalIn: Number(values.totalIn || 0),
      totalOut: Number(values.totalOut || 0),
      balance: Number(values.totalIn || 0) - Number(values.totalOut || 0),
      items: values.items || [],
      notes: values.notes,
    };
    upsertMutation.mutate({ ioRecords: [...ioRecords, entry] });
    setIoModal(false);
    ioForm.resetFields();
  };

  // Save ventilator
  const saveVent = (values: any) => {
    upsertMutation.mutate({ ventSettings: { ...values, updatedAt: new Date().toISOString(), updatedBy: user?.displayName } });
    setVentModal(false);
    ventForm.resetFields();
  };

  // Save code status / RASS
  const saveCode = (values: any) => {
    upsertMutation.mutate({ codeStatus: values.codeStatus, rassScore: values.rassScore ?? null });
    setCodeModal(false);
    codeForm.resetFields();
  };

  // Running I&O balance totals (last 24h)
  const last24h = ioRecords.filter((r: any) => dayjs(r.recordedAt).isAfter(dayjs().subtract(24, 'hour')));
  const totalIn24 = last24h.reduce((s: number, r: any) => s + (r.totalIn || 0), 0);
  const totalOut24 = last24h.reduce((s: number, r: any) => s + (r.totalOut || 0), 0);
  const balance24 = totalIn24 - totalOut24;

  const dripColumns = [
    { title: 'Drug / Fluid', dataIndex: 'drug', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Concentration', dataIndex: 'concentration' },
    { title: 'Rate', render: (_: any, r: any) => `${r.rate} ${r.unit || 'mL/hr'}` },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'RUNNING' ? 'green' : v === 'STOPPED' ? 'red' : 'default'}>{v}</Tag> },
    { title: 'Started', dataIndex: 'startedAt', render: (v: string) => v ? dayjs(v).format('MMM D h:mm A') : '—' },
    {
      title: '',
      render: (_: any, r: any, idx: number) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditDrip({ index: idx });
            dripForm.setFieldsValue(r);
            setDripModal(true);
          }} />
          {r.status === 'RUNNING' && (
            <Popconfirm title="Stop this drip?" onConfirm={() => stopDrip(idx)}>
              <Button size="small" danger>Stop</Button>
            </Popconfirm>
          )}
          <Popconfirm title="Remove this drip order?" onConfirm={() => deleteDrip(idx)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const ioColumns = [
    { title: 'Time', dataIndex: 'recordedAt', render: (v: string) => dayjs(v).format('MMM D h:mm A') },
    { title: 'Period', dataIndex: 'period' },
    { title: 'Total In (mL)', dataIndex: 'totalIn', render: (v: number) => <Text style={{ color: '#1890ff' }}>{v}</Text> },
    { title: 'Total Out (mL)', dataIndex: 'totalOut', render: (v: number) => <Text style={{ color: '#fa8c16' }}>{v}</Text> },
    { title: 'Balance (mL)', dataIndex: 'balance', render: (v: number) => <Text strong style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{v >= 0 ? '+' : ''}{v}</Text> },
    { title: 'By', dataIndex: 'recordedBy' },
  ];

  return (
    <Drawer
      title={
        <Space>
          <MonitorOutlined style={{ color: '#cf1322' }} />
          <Text strong>{admission?.patient?.lastName}, {admission?.patient?.firstName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {admission?.room ? `Bed ${admission.room.roomNumber}` : 'Unassigned'} · Day {admission?.daysStayed || 1}
          </Text>
          <Tag color={CODE_STATUS_COLOR[codeStatus] || 'default'}>{codeStatus.replace('_', ' ')}</Tag>
          {rassScore !== null && (
            <Tag color={RASS_LABELS[rassScore]?.color || 'default'} style={{ fontSize: 11 }}>
              RASS {rassScore > 0 ? '+' : ''}{rassScore}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={900}
      extra={
        <Button size="small" icon={<EditOutlined />} onClick={() => {
          codeForm.setFieldsValue({ codeStatus, rassScore });
          setCodeModal(true);
        }}>
          Code / RASS
        </Button>
      }
    >
      <Tabs
        items={[
          {
            key: 'drips',
            label: (
              <Space>
                <DropboxOutlined />
                IV Drips
                <Badge count={dripOrders.filter((d: any) => d.status === 'RUNNING').length} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            ),
            children: (
              <div>
                <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                  <Col><Text strong>Active Drip Orders</Text></Col>
                  <Col>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { setEditDrip(null); dripForm.resetFields(); setDripModal(true); }}>
                      Add Drip / Infusion
                    </Button>
                  </Col>
                </Row>
                <Table
                  dataSource={dripOrders}
                  columns={dripColumns}
                  rowKey={(r: any, i?: number) => `${r.drug}-${i}`}
                  size="small"
                  pagination={false}
                  locale={{ emptyText: 'No drip orders — click "Add Drip / Infusion"' }}
                  rowClassName={(r: any) => r.status === 'STOPPED' ? 'ant-table-row-disabled' : ''}
                />
              </div>
            ),
          },
          {
            key: 'io',
            label: (
              <Space>
                <ThunderboltOutlined />
                I&O Balance
              </Space>
            ),
            children: (
              <div>
                {/* 24h summary */}
                <Row gutter={12} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <Card size="small" style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
                      <Statistic title="Total In (24h)" value={totalIn24} suffix="mL" valueStyle={{ color: '#1890ff' }} />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" style={{ background: '#fff7e6', borderColor: '#ffd591' }}>
                      <Statistic title="Total Out (24h)" value={totalOut24} suffix="mL" valueStyle={{ color: '#fa8c16' }} />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" style={{ background: balance24 >= 0 ? '#f6ffed' : '#fff1f0', borderColor: balance24 >= 0 ? '#b7eb8f' : '#ffccc7' }}>
                      <Statistic
                        title="Balance (24h)"
                        value={Math.abs(balance24)}
                        prefix={balance24 >= 0 ? '+' : '-'}
                        suffix="mL"
                        valueStyle={{ color: balance24 >= 0 ? '#52c41a' : '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                </Row>

                <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                  <Col><Text strong>I&O Log</Text></Col>
                  <Col>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { ioForm.resetFields(); setIoModal(true); }}>
                      Record I&O
                    </Button>
                  </Col>
                </Row>
                <Table
                  dataSource={[...ioRecords].reverse()}
                  columns={ioColumns}
                  rowKey={(r: any) => r.recordedAt}
                  size="small"
                  pagination={{ pageSize: 8, size: 'small' }}
                  locale={{ emptyText: 'No I&O records yet' }}
                />
              </div>
            ),
          },
          {
            key: 'vent',
            label: (
              <Space>
                <MonitorOutlined />
                Ventilator
              </Space>
            ),
            children: (
              <div>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                  <Col><Text strong>Current Ventilator Settings</Text></Col>
                  <Col>
                    <Button
                      type="primary"
                      size="small"
                      icon={ventSettings ? <EditOutlined /> : <PlusOutlined />}
                      onClick={() => { ventForm.setFieldsValue(ventSettings || {}); setVentModal(true); }}
                    >
                      {ventSettings ? 'Update Settings' : 'Configure Ventilator'}
                    </Button>
                  </Col>
                </Row>
                {ventSettings ? (
                  <Card size="small" style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}>
                    <Descriptions bordered size="small" column={3}>
                      <Descriptions.Item label="Mode"><Tag color="blue">{ventSettings.mode || '—'}</Tag></Descriptions.Item>
                      <Descriptions.Item label="Tidal Volume">{ventSettings.tidalVolume ? `${ventSettings.tidalVolume} mL` : '—'}</Descriptions.Item>
                      <Descriptions.Item label="Set RR">{ventSettings.rr ? `${ventSettings.rr} /min` : '—'}</Descriptions.Item>
                      <Descriptions.Item label="FiO₂">{ventSettings.fio2 ? `${Math.round(Number(ventSettings.fio2) * 100)}%` : '—'}</Descriptions.Item>
                      <Descriptions.Item label="PEEP">{ventSettings.peep ? `${ventSettings.peep} cmH₂O` : '—'}</Descriptions.Item>
                      <Descriptions.Item label="PIP">{ventSettings.pip ? `${ventSettings.pip} cmH₂O` : '—'}</Descriptions.Item>
                      {ventSettings.pressureSupport && <Descriptions.Item label="Pressure Support">{ventSettings.pressureSupport} cmH₂O</Descriptions.Item>}
                      {ventSettings.updatedAt && (
                        <Descriptions.Item label="Last Updated" span={3}>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {dayjs(ventSettings.updatedAt).format('MMM D, YYYY h:mm A')}
                            {ventSettings.updatedBy ? ` by ${ventSettings.updatedBy}` : ''}
                          </Text>
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </Card>
                ) : (
                  <Alert
                    type="info"
                    showIcon
                    message="No ventilator settings on record"
                    description="Patient may not be mechanically ventilated. Click 'Configure Ventilator' to add settings."
                  />
                )}
              </div>
            ),
          },
        ]}
      />

      {/* ── Drip Modal ───────────────────────────────────────────────── */}
      <Modal
        title={editDrip ? 'Edit Drip Order' : 'Add Drip / Infusion Order'}
        open={dripModal}
        onCancel={() => { setDripModal(false); setEditDrip(null); dripForm.resetFields(); }}
        onOk={() => dripForm.submit()}
        confirmLoading={upsertMutation.isPending}
      >
        <Form form={dripForm} layout="vertical" onFinish={saveDrip}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="drug" label="Drug / Fluid Name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Dopamine, NS 0.9%, D5W, Dobutamine..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="concentration" label="Concentration">
                <Input placeholder="400mg/250mL" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rate" label="Rate" rules={[{ required: true }]}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="5.0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label="Rate Unit" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'mL/hr', label: 'mL/hr' },
                  { value: 'mcg/kg/min', label: 'mcg/kg/min' },
                  { value: 'mcg/min', label: 'mcg/min' },
                  { value: 'mg/hr', label: 'mg/hr' },
                  { value: 'units/hr', label: 'units/hr' },
                  { value: 'mEq/hr', label: 'mEq/hr' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={2} placeholder="Titration instructions, goals..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── I&O Modal ───────────────────────────────────────────────── */}
      <Modal
        title="Record Intake & Output"
        open={ioModal}
        onCancel={() => { setIoModal(false); ioForm.resetFields(); }}
        onOk={() => ioForm.submit()}
        confirmLoading={upsertMutation.isPending}
      >
        <Form form={ioForm} layout="vertical" onFinish={saveIO}>
          <Form.Item name="period" label="Period (shift/time window)">
            <Input placeholder="e.g. 0600-1400, Night shift..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="totalIn" label="Total Intake (mL)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="totalOut" label="Total Output (mL)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Alert
            showIcon
            type="info"
            message="Include all sources: IV fluids, oral, NGT feeds (intake) · Urine, NGT drainage, drains, emesis (output)"
            style={{ fontSize: 11, marginBottom: 12 }}
          />
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Foley output, JP drain, chest tube drainage..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Ventilator Settings Modal ───────────────────────────────── */}
      <Modal
        title="Ventilator Settings"
        open={ventModal}
        onCancel={() => { setVentModal(false); ventForm.resetFields(); }}
        onOk={() => ventForm.submit()}
        confirmLoading={upsertMutation.isPending}
        width={600}
      >
        <Form form={ventForm} layout="vertical" onFinish={saveVent}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="mode" label="Ventilator Mode" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'AC/VC', label: 'AC/VC — Assist Control Volume' },
                  { value: 'AC/PC', label: 'AC/PC — Assist Control Pressure' },
                  { value: 'SIMV', label: 'SIMV — Synchronized Intermittent Mandatory' },
                  { value: 'PSV', label: 'PSV — Pressure Support' },
                  { value: 'CPAP', label: 'CPAP — Continuous Positive Airway Pressure' },
                  { value: 'BiPAP', label: 'BiPAP — Non-Invasive' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tidalVolume" label="Tidal Volume (mL)">
                <InputNumber min={100} max={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rr" label="Respiratory Rate (/min)">
                <InputNumber min={4} max={40} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fio2" label="FiO₂ (0.21 – 1.0)">
                <InputNumber min={0.21} max={1.0} step={0.05} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="peep" label="PEEP (cmH₂O)">
                <InputNumber min={0} max={25} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="pip" label="Peak Inspiratory Pressure (cmH₂O)">
                <InputNumber min={0} max={60} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="pressureSupport" label="Pressure Support (cmH₂O)">
                <InputNumber min={0} max={30} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Code Status / RASS Modal ───────────────────────────────── */}
      <Modal
        title="Code Status & Sedation (RASS)"
        open={codeModal}
        onCancel={() => { setCodeModal(false); codeForm.resetFields(); }}
        onOk={() => codeForm.submit()}
        confirmLoading={upsertMutation.isPending}
      >
        <Alert
          showIcon
          type="warning"
          message="Code status changes should be verified with the attending physician and documented in clinical notes."
          style={{ marginBottom: 16 }}
        />
        <Form form={codeForm} layout="vertical" onFinish={saveCode}>
          <Form.Item name="codeStatus" label="Code Status" rules={[{ required: true }]}>
            <Select options={[
              { value: 'FULL_CODE', label: '🟢 Full Code — Full resuscitation' },
              { value: 'DNR', label: '🔴 DNR — Do Not Resuscitate' },
              { value: 'DNI', label: '🟠 DNI — Do Not Intubate' },
              { value: 'COMFORT_CARE', label: '🟣 Comfort Care — Palliative measures only' },
            ]} />
          </Form.Item>
          <Form.Item name="rassScore" label="RASS Score (Sedation / Agitation)">
            <Select
              allowClear
              placeholder="Select RASS score"
              options={Object.entries(RASS_LABELS)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([val, info]) => ({
                  value: Number(val),
                  label: info.label,
                }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
};

// ── Main ICU Dashboard ────────────────────────────────────────────────────────
const ICUDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [vitalsModal, setVitalsModal] = useState(false);
  const [vitalsPatient, setVitalsPatient] = useState<any>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: admissions, isLoading } = useQuery({
    queryKey: ['icu-admissions', user?.departmentId],
    queryFn: () =>
      api.get('/admissions', { params: { status: 'ADMITTED', limit: 50, ...(user?.departmentId && { departmentId: user.departmentId }) } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 30000,
  });

  const { data: vitalsMap } = useQuery({
    queryKey: ['icu-vitals', admissions?.map((a: any) => a.patientId).join(',')],
    queryFn: async () => {
      if (!admissions?.length) return {};
      const results = await Promise.all(
        admissions.map((a: any) =>
          api.get(`/patients/${a.patientId}/vital-signs`, { params: { limit: 1 } })
            .then((r) => {
              const list = r.data?.data?.data || r.data?.data || [];
              return { patientId: a.patientId, vitals: list[0] || null };
            })
            .catch(() => ({ patientId: a.patientId, vitals: null }))
        )
      );
      return Object.fromEntries(results.map((r) => [r.patientId, r.vitals]));
    },
    enabled: !!admissions?.length,
    refetchInterval: 60000,
  });

  // Per-bed ICU records
  const { data: icuRecordsMap } = useQuery({
    queryKey: ['icu-records-map', admissions?.map((a: any) => a.id).join(',')],
    queryFn: async () => {
      if (!admissions?.length) return {};
      const results = await Promise.all(
        admissions.map((a: any) =>
          api.get(`/admissions/${a.id}/icu-record`)
            .then((r) => ({ admissionId: a.id, record: r.data?.data }))
            .catch(() => ({ admissionId: a.id, record: null }))
        )
      );
      return Object.fromEntries(results.map((r) => [r.admissionId, r.record]));
    },
    enabled: !!admissions?.length,
    refetchInterval: 60000,
  });

  const vitalsMutation = useMutation({
    mutationFn: (data: any) => api.post(`/patients/${vitalsPatient?.patientId}/vital-signs`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icu-vitals'] });
      setVitalsModal(false);
      form.resetFields();
    },
  });

  const patients = admissions || [];
  const criticalPatients = patients.filter((a: any) => isCritical(vitalsMap?.[a.patientId]));

  const renderBedCard = (admission: any) => {
    const vitals = vitalsMap?.[admission.patientId];
    const icuRec = icuRecordsMap?.[admission.id];
    const critical = isCritical(vitals);
    const spo2 = vitals?.oxygenSaturation ? Number(vitals.oxygenSaturation) : null;
    const hr = vitals?.heartRate;
    const bp = vitals?.bloodPressureSystolic ? `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}` : null;
    const rr = vitals?.respiratoryRate;
    const temp = vitals?.temperature;
    const codeStatus = icuRec?.codeStatus || 'FULL_CODE';
    const rassScore = icuRec?.rassScore ?? null;
    const activeDrips = (icuRec?.dripOrders || []).filter((d: any) => d.status === 'RUNNING').length;
    const onVent = !!icuRec?.ventSettings;

    return (
      <Col xs={24} sm={12} md={8} xl={6} key={admission.id}>
        <Card
          size="small"
          style={{
            borderColor: critical ? '#ff4d4f' : codeStatus === 'DNR' ? '#d9d9d9' : '#d9d9d9',
            background: critical ? '#fff1f0' : '#fff',
          }}
          title={
            <Space wrap size={4}>
              {critical && <Badge status="error" />}
              <Text strong style={{ fontSize: 13 }}>
                {admission.room ? `Bed ${admission.room.roomNumber}` : 'Unassigned'}
              </Text>
              {admission.room?.roomType && <Tag style={{ fontSize: 10 }}>{admission.room.roomType.name}</Tag>}
              <Tag color={CODE_STATUS_COLOR[codeStatus] || 'default'} style={{ fontSize: 9 }}>
                {codeStatus.replace('_', ' ')}
              </Tag>
            </Space>
          }
          extra={critical && <WarningOutlined style={{ color: '#ff4d4f' }} />}
          actions={[
            <Tooltip key="v" title="Record vitals">
              <Button type="text" size="small" icon={<HeartOutlined />}
                onClick={() => { setVitalsPatient(admission); setVitalsModal(true); }} />
            </Tooltip>,
            <Tooltip key="n" title="Clinical notes">
              <Button type="text" size="small" icon={<FileTextOutlined />}
                onClick={() => { setActivePatient(admission); setNotesOpen(true); }} />
            </Tooltip>,
            <Tooltip key="m" title="ICU monitor (drips, I&O, vent)">
              <Button type="text" size="small" icon={<MonitorOutlined />}
                onClick={() => { setActivePatient(admission); setMonitorOpen(true); }} />
            </Tooltip>,
          ]}
        >
          {/* Patient info */}
          <Space direction="vertical" size={2} style={{ width: '100%', marginBottom: 8 }}>
            <Text strong>{admission.patient?.lastName}, {admission.patient?.firstName}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{admission.patient?.patientNo}</Text>
            {admission.diagnosis && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{admission.diagnosis}</Text>}
            <Space size={4}>
              <Text style={{ fontSize: 11 }}>Day {admission.daysStayed || 1}</Text>
              {activeDrips > 0 && <Tag color="blue" style={{ fontSize: 9 }}>{activeDrips} drip{activeDrips > 1 ? 's' : ''}</Tag>}
              {onVent && <Tag color="purple" style={{ fontSize: 9 }}>On vent</Tag>}
              {rassScore !== null && (
                <Tag color={RASS_LABELS[rassScore]?.color || 'default'} style={{ fontSize: 9 }}>
                  RASS {rassScore > 0 ? '+' : ''}{rassScore}
                </Tag>
              )}
            </Space>
          </Space>

          <Divider style={{ margin: '8px 0' }} />

          {/* Vitals grid */}
          {vitals ? (
            <div style={{ fontSize: 12 }}>
              <Row gutter={4}>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: '4px 0', background: '#f5f5f5', borderRadius: 4, marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: '#666' }}>SpO₂</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: getSpO2Color(spo2) }}>
                      {spo2 ? `${spo2}%` : '—'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: '4px 0', background: '#f5f5f5', borderRadius: 4, marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: '#666' }}>HR</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: (hr && (hr > 130 || hr < 40)) ? '#ff4d4f' : '#333' }}>
                      {hr ? `${hr} bpm` : '—'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: '4px 0', background: '#f5f5f5', borderRadius: 4, marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: '#666' }}>BP</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: (vitals.bloodPressureSystolic > 180) ? '#ff4d4f' : '#333' }}>
                      {bp || '—'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: '4px 0', background: '#f5f5f5', borderRadius: 4, marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: '#666' }}>RR</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: (rr && (rr > 30 || rr < 8)) ? '#ff4d4f' : '#333' }}>
                      {rr ? `${rr}/min` : '—'}
                    </div>
                  </div>
                </Col>
              </Row>
              {temp && (
                <div style={{ textAlign: 'center', fontSize: 11, marginTop: 2 }}>
                  Temp: <b>{Number(temp).toFixed(1)}°C</b>
                  {Number(temp) >= 38 && <Tag color="orange" style={{ fontSize: 9, marginLeft: 4 }}>Febrile</Tag>}
                </div>
              )}
              {spo2 && (
                <Progress percent={spo2} strokeColor={getSpO2Color(spo2)} size="small" style={{ marginTop: 4 }} showInfo={false} />
              )}
              <div style={{ fontSize: 10, color: '#999', textAlign: 'right', marginTop: 2 }}>
                {dayjs(vitals.recordedAt).format('h:mm A')}
              </div>
            </div>
          ) : (
            <Alert message="No vitals on record" type="warning" showIcon style={{ fontSize: 11 }} />
          )}
        </Card>
      </Col>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <MonitorOutlined style={{ fontSize: 24, color: '#cf1322' }} />
            <Title level={3} style={{ margin: 0 }}>ICU / CCU Dashboard</Title>
          </Space>
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><Card><Statistic title="Total Patients" value={patients.length} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Critical Alerts" value={criticalPatients.length} valueStyle={{ color: criticalPatients.length > 0 ? '#cf1322' : '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="No Recent Vitals" value={patients.filter((a: any) => !vitalsMap?.[a.patientId]).length} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Avg Days in ICU" value={patients.length > 0 ? Math.round(patients.reduce((s: number, a: any) => s + (a.daysStayed || 1), 0) / patients.length) : 0} suffix="days" /></Card></Col>
      </Row>

      {/* Critical alerts banner */}
      {criticalPatients.length > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<AlertOutlined />}
          message={
            <Space wrap>
              <Text strong>{criticalPatients.length} CRITICAL ALERT{criticalPatients.length > 1 ? 'S' : ''}:</Text>
              {criticalPatients.map((a: any) => (
                <Tag key={a.id} color="red">
                  {a.patient?.lastName} — {a.room ? `Bed ${a.room.roomNumber}` : 'Unassigned'}
                </Tag>
              ))}
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Bed cards */}
      {isLoading ? (
        <Card loading />
      ) : patients.length === 0 ? (
        <Card><div style={{ textAlign: 'center', padding: 40, color: '#999' }}>No patients currently in ICU/CCU</div></Card>
      ) : (
        <Row gutter={[16, 16]}>
          {patients.map((a: any) => renderBedCard(a))}
        </Row>
      )}

      {/* ── Record Vitals Modal ── */}
      <Modal
        title={`Record Vitals — ${vitalsPatient?.patient?.firstName} ${vitalsPatient?.patient?.lastName}`}
        open={vitalsModal}
        onCancel={() => { setVitalsModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={vitalsMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => vitalsMutation.mutate({
            patientId: vitalsPatient?.patientId,
            admissionId: vitalsPatient?.id,
            ...v,
            recordedBy: user?.displayName || user?.username,
          })}
        >
          <Row gutter={12}>
            <Col span={12}><Form.Item name="bloodPressureSystolic" label="BP Systolic (mmHg)"><InputNumber min={50} max={300} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="bloodPressureDiastolic" label="BP Diastolic (mmHg)"><InputNumber min={30} max={200} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="heartRate" label="Heart Rate (bpm)"><InputNumber min={20} max={300} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="respiratoryRate" label="Resp. Rate (/min)"><InputNumber min={4} max={60} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="oxygenSaturation" label="SpO₂ (%)"><InputNumber min={60} max={100} precision={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="temperature" label="Temperature (°C)"><InputNumber min={34} max={42} precision={1} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={24}><Form.Item name="notes" label="Notes / GCS / Neuro"><Input placeholder="GCS E4V5M6, pupils 3mm reactive, extra observations..." /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Clinical Notes Panel ── */}
      <ClinicalNotesPanel
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        patientId={activePatient?.patientId}
        admissionId={activePatient?.id}
        patientName={`${activePatient?.patient?.firstName || ''} ${activePatient?.patient?.lastName || ''}`}
      />

      {/* ── ICU Monitor Drawer ── */}
      {activePatient && (
        <ICUMonitorDrawer
          admission={activePatient}
          open={monitorOpen}
          onClose={() => setMonitorOpen(false)}
        />
      )}
    </div>
  );
};

export default ICUDashboardPage;
