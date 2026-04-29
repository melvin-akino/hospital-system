import React, { useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, Row, Col, Statistic,
  Modal, Form, Input, Select, InputNumber, Drawer, Descriptions, Divider,
  Timeline, Alert, DatePicker, AutoComplete, Spin,
} from 'antd';
import {
  ScissorOutlined, PlayCircleOutlined, CheckOutlined, CloseOutlined,
  FileTextOutlined, PlusOutlined, UserOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import ClinicalNotesPanel from '../../components/clinical/ClinicalNotesPanel';
import OrderServicesModal from '../../components/clinical/OrderServicesModal';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'blue', HOLDING: 'orange', IN_PROGRESS: 'green',
  RECOVERY: 'cyan', COMPLETED: 'default', CANCELLED: 'red', POSTPONED: 'purple',
};

const STATUS_FLOW = ['SCHEDULED', 'HOLDING', 'IN_PROGRESS', 'RECOVERY', 'COMPLETED'];

const ANESTHESIA_TYPES = ['GENERAL', 'SPINAL', 'EPIDURAL', 'LOCAL', 'REGIONAL', 'MAC'].map(v => ({ value: v, label: v }));

const ORDashboardPage: React.FC = () => {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [scheduleModal, setScheduleModal] = useState(false);
  const [detailDrawer, setDetailDrawer] = useState(false);
  const [postOpModal, setPostOpModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [form] = Form.useForm();
  const [postOpForm] = Form.useForm();
  const [patientOptions, setPatientOptions] = useState<any[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const { data: surgeriesData, isLoading } = useQuery({
    queryKey: ['or-dashboard', selectedDate.format('YYYY-MM-DD')],
    queryFn: () =>
      api.get('/surgeries', {
        params: {
          from: selectedDate.startOf('day').toISOString(),
          to: selectedDate.endOf('day').toISOString(),
          limit: 100,
        },
      }).then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 30000,
  });

  const { data: doctors } = useQuery({
    queryKey: ['or-doctors'],
    queryFn: () => api.get('/doctors', { params: { limit: 200 } }).then((r) => r.data?.data?.data || r.data?.data || []),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/surgeries/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['or-dashboard'] }),
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: any) => api.post('/surgeries', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['or-dashboard'] }); setScheduleModal(false); form.resetFields(); setSelectedPatient(null); },
  });

  const surgeries = surgeriesData || [];
  const active = surgeries.filter((s: any) => s.status === 'IN_PROGRESS');
  const holding = surgeries.filter((s: any) => s.status === 'HOLDING');
  const scheduled = surgeries.filter((s: any) => s.status === 'SCHEDULED');
  const completed = surgeries.filter((s: any) => s.status === 'COMPLETED');

  const advanceStatus = (surgery: any) => {
    const idx = STATUS_FLOW.indexOf(surgery.status);
    if (idx < STATUS_FLOW.length - 1) {
      const nextStatus = STATUS_FLOW[idx + 1];
      if (nextStatus === 'COMPLETED') {
        setSelected(surgery);
        postOpForm.setFieldsValue({ postOpNotes: surgery.postOpNotes });
        setPostOpModal(true);
      } else {
        updateMutation.mutate({ id: surgery.id, status: nextStatus });
      }
    }
  };

  const handlePatientSearch = async (value: string) => {
    if (value.length < 2) return;
    setPatientSearching(true);
    try {
      const res = await api.get('/patients', { params: { search: value, limit: 10 } });
      const patients = res.data?.data?.data || res.data?.data || [];
      setPatientOptions(patients.map((p: any) => ({
        value: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
        label: `${p.lastName}, ${p.firstName} — ${p.patientNo}`,
        patient: p,
      })));
    } finally {
      setPatientSearching(false);
    }
  };

  const columns = [
    { title: 'OR#', dataIndex: 'orRoom', render: (v: string) => <Tag color="blue">{v || '—'}</Tag>, width: 70 },
    { title: 'Time', dataIndex: 'scheduledAt', render: (v: string) => dayjs(v).format('h:mm A'), width: 80 },
    {
      title: 'Patient',
      render: (_: any, r: any) => r.patient
        ? <Space direction="vertical" size={0}><Text strong>{r.patient.lastName}, {r.patient.firstName}</Text><Text type="secondary" style={{ fontSize: 11 }}>{r.patient.patientNo}</Text></Space>
        : <Text type="secondary">TBA</Text>,
    },
    {
      title: 'Procedure',
      dataIndex: 'procedure',
      render: (v: string) => <Text>{v}</Text>,
    },
    {
      title: 'Surgeon',
      render: (_: any, r: any) => r.surgeon ? `Dr. ${r.surgeon.firstName} ${r.surgeon.lastName}` : r.attendingDoctor || '—',
    },
    {
      title: 'Anesthesia',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          {r.anesthesiaType && <Tag style={{ fontSize: 10 }}>{r.anesthesiaType}</Tag>}
          {r.anesthesiologist && <Text type="secondary" style={{ fontSize: 11 }}>{r.anesthesiologist}</Text>}
        </Space>
      ),
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v.replace('_', ' ')}</Tag>,
      width: 110,
    },
    {
      title: 'Actions',
      render: (_: any, r: any) => {
        const idx = STATUS_FLOW.indexOf(r.status);
        const next = STATUS_FLOW[idx + 1];
        return (
          <Space size={4}>
            {next && r.status !== 'CANCELLED' && (
              <Button
                size="small"
                type={r.status === 'IN_PROGRESS' ? 'primary' : 'default'}
                icon={r.status === 'IN_PROGRESS' ? <CheckOutlined /> : <PlayCircleOutlined />}
                onClick={() => advanceStatus(r)}
              >
                {next === 'HOLDING' ? 'To Holding' : next === 'IN_PROGRESS' ? 'Start OR' : next === 'RECOVERY' ? 'Recovery' : 'Complete'}
              </Button>
            )}
            {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
              <Button size="small" icon={<CloseOutlined />} danger onClick={() => updateMutation.mutate({ id: r.id, status: 'CANCELLED' })}>
                Cancel
              </Button>
            )}
            <Button size="small" icon={<FileTextOutlined />} onClick={() => { setSelected(r); setDetailDrawer(true); }}>
              Details
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <ScissorOutlined style={{ fontSize: 24, color: '#722ed1' }} />
            <Title level={3} style={{ margin: 0 }}>Operating Room Dashboard</Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <DatePicker value={selectedDate} onChange={(d) => d && setSelectedDate(d)} allowClear={false} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setScheduleModal(true)}>
              Schedule Case
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><Card><Statistic title="In Progress" value={active.length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="In Holding" value={holding.length} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Scheduled" value={scheduled.length} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Completed Today" value={completed.length} valueStyle={{ color: '#d9d9d9' }} /></Card></Col>
      </Row>

      {/* Active cases alert */}
      {active.length > 0 && (
        <Alert
          type="success"
          showIcon
          icon={<ScissorOutlined />}
          message={`${active.length} case(s) currently in progress: ${active.map((s: any) => `OR${s.orRoom} — ${s.procedure}`).join(' | ')}`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title={`OR Schedule — ${selectedDate.format('dddd, MMMM D, YYYY')}`}>
        <Table dataSource={surgeries} columns={columns} rowKey="id" loading={isLoading} size="small" pagination={false} />
      </Card>

      {/* Schedule Surgery Modal */}
      <Modal
        title="Schedule Surgery"
        open={scheduleModal}
        onCancel={() => { setScheduleModal(false); form.resetFields(); setSelectedPatient(null); }}
        onOk={() => form.submit()}
        confirmLoading={scheduleMutation.isPending}
        width={680}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => scheduleMutation.mutate({
            patientId: selectedPatient?.id,
            surgeonId: v.surgeonId,
            procedure: v.procedure,
            scheduledAt: v.scheduledAt?.toISOString(),
            duration: v.duration,
            orRoom: v.orRoom,
            anesthesiaType: v.anesthesiaType,
            anesthesiologist: v.anesthesiologist,
            scrubNurse: v.scrubNurse,
            circulatingNurse: v.circulatingNurse,
            preOpNotes: v.preOpNotes,
          })}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Patient" required>
                {selectedPatient
                  ? <Space><Tag color="blue">{selectedPatient.lastName}, {selectedPatient.firstName}</Tag><Button size="small" onClick={() => setSelectedPatient(null)}>Change</Button></Space>
                  : <AutoComplete options={patientOptions} onSearch={handlePatientSearch} onSelect={(_v, opt: any) => setSelectedPatient(opt.patient)}
                      placeholder="Search patient..." notFoundContent={patientSearching ? <Spin size="small" /> : 'Not found'} />}
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="surgeonId" label="Primary Surgeon" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label"
                  options={(doctors || []).map((d: any) => ({ value: d.id, label: `Dr. ${d.firstName} ${d.lastName}${d.specialization ? ' · ' + d.specialization : ''}` }))} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="procedure" label="Procedure" rules={[{ required: true }]}>
                <Input placeholder="e.g. Appendectomy, Cholecystectomy..." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="scheduledAt" label="Scheduled Date & Time" rules={[{ required: true }]}>
                <DatePicker showTime format="MMM D, YYYY h:mm A" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="duration" label="Est. Duration (min)">
                <InputNumber min={15} step={15} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="orRoom" label="OR Room">
                <Select options={['OR-1', 'OR-2', 'OR-3', 'OR-4', 'OR-5'].map(v => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="anesthesiaType" label="Anesthesia Type">
                <Select options={ANESTHESIA_TYPES} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="anesthesiologist" label="Anesthesiologist">
                <Input placeholder="Name..." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="scrubNurse" label="Scrub Nurse">
                <Input placeholder="Name..." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="circulatingNurse" label="Circulating Nurse">
                <Input placeholder="Name..." />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="preOpNotes" label="Pre-Op Notes">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Post-Op Completion Modal */}
      <Modal
        title="Complete Surgery — Post-Op Report"
        open={postOpModal}
        onCancel={() => { setPostOpModal(false); postOpForm.resetFields(); }}
        onOk={() => postOpForm.submit()}
        confirmLoading={updateMutation.isPending}
        width={560}
      >
        <Form
          form={postOpForm}
          layout="vertical"
          onFinish={(v) => {
            updateMutation.mutate({ id: selected?.id, status: 'COMPLETED', ...v });
            setPostOpModal(false);
            postOpForm.resetFields();
          }}
        >
          <Row gutter={12}>
            <Col span={12}><Form.Item name="bloodLoss" label="Blood Loss (ml)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="specimens" label="Specimens"><Input placeholder="e.g. Gallbladder..." /></Form.Item></Col>
          </Row>
          <Form.Item name="complications" label="Complications / Findings">
            <Input placeholder="None / describe..." />
          </Form.Item>
          <Form.Item name="postOpNotes" label="Post-Op Notes" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Operative findings, procedure done, patient condition post-op..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Case Detail Drawer */}
      <Drawer
        title={selected ? `${selected.procedure} — ${selected.surgeryNo}` : 'Case Details'}
        open={detailDrawer}
        onClose={() => { setDetailDrawer(false); setSelected(null); }}
        width={680}
        extra={
          <Space>
            <Button icon={<FileTextOutlined />} size="small" onClick={() => setNotesOpen(true)}>Notes</Button>
            <Button icon={<UserOutlined />} size="small" onClick={() => setOrdersOpen(true)}>OR Supplies</Button>
          </Space>
        }
      >
        {selected && (
          <>
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="Surgery No"><Text code>{selected.surgeryNo}</Text></Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[selected.status]}>{selected.status.replace('_', ' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="Patient">{selected.patient ? `${selected.patient.lastName}, ${selected.patient.firstName}` : 'TBA'}</Descriptions.Item>
              <Descriptions.Item label="Blood Type">{selected.patient?.bloodType || '—'}</Descriptions.Item>
              <Descriptions.Item label="Procedure" span={2}>{selected.procedure}</Descriptions.Item>
              <Descriptions.Item label="Surgeon">{selected.surgeon ? `Dr. ${selected.surgeon.firstName} ${selected.surgeon.lastName}` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Anesthesiologist">{selected.anesthesiologist || '—'}</Descriptions.Item>
              <Descriptions.Item label="Anesthesia Type">{selected.anesthesiaType || '—'}</Descriptions.Item>
              <Descriptions.Item label="OR Room">{selected.orRoom || '—'}</Descriptions.Item>
              <Descriptions.Item label="Scrub Nurse">{selected.scrubNurse || '—'}</Descriptions.Item>
              <Descriptions.Item label="Circulating Nurse">{selected.circulatingNurse || '—'}</Descriptions.Item>
              <Descriptions.Item label="Scheduled">{dayjs(selected.scheduledAt).format('MMM D, YYYY h:mm A')}</Descriptions.Item>
              <Descriptions.Item label="Est. Duration">{selected.duration ? `${selected.duration} min` : '—'}</Descriptions.Item>
              {selected.startedAt && <Descriptions.Item label="Started">{dayjs(selected.startedAt).format('h:mm A')}</Descriptions.Item>}
              {selected.completedAt && <Descriptions.Item label="Completed">{dayjs(selected.completedAt).format('h:mm A')}</Descriptions.Item>}
              {selected.actualDuration && <Descriptions.Item label="Actual Duration">{selected.actualDuration} min</Descriptions.Item>}
            </Descriptions>

            {(selected.preOpNotes || selected.postOpNotes) && (
              <>
                <Divider orientation="left">Clinical Notes</Divider>
                {selected.preOpNotes && <><Text strong>Pre-Op:</Text><p>{selected.preOpNotes}</p></>}
                {selected.postOpNotes && <><Text strong>Post-Op:</Text><p>{selected.postOpNotes}</p></>}
                {selected.complications && <><Text strong>Complications:</Text><p>{selected.complications}</p></>}
              </>
            )}

            <Divider orientation="left">Progress</Divider>
            <Timeline
              items={STATUS_FLOW.map((s) => ({
                color: selected.status === s ? 'green' : STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(selected.status) ? 'gray' : 'blue',
                children: s.replace('_', ' '),
              }))}
            />
          </>
        )}
      </Drawer>

      <ClinicalNotesPanel
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        patientId={selected?.patient?.id}
        admissionId={selected?.admissionId}
        patientName={selected?.patient ? `${selected.patient.firstName} ${selected.patient.lastName}` : selected?.procedure}
      />
      <OrderServicesModal
        open={ordersOpen}
        onClose={() => setOrdersOpen(false)}
        patientId={selected?.patient?.id}
        admissionId={selected?.admissionId}
        patientName={selected?.patient ? `${selected.patient.firstName} ${selected.patient.lastName}` : selected?.procedure}
        allowBilling={false}
      />
    </div>
  );
};

export default ORDashboardPage;
