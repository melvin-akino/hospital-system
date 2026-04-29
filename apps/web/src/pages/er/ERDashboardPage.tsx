import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Badge, Space, Typography, Statistic,
  Modal, Form, Input, Select, InputNumber, Divider, Tooltip, Alert,
} from 'antd';
import {
  PlusOutlined, AlertOutlined, UserOutlined, MedicineBoxOutlined,
  FileTextOutlined, ThunderboltOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import PatientSearchModal from '../../components/patients/PatientSearchModal';
import ClinicalNotesPanel from '../../components/clinical/ClinicalNotesPanel';
import OrderServicesModal from '../../components/clinical/OrderServicesModal';

dayjs.extend(relativeTime);
const { Title, Text } = Typography;
const { TextArea } = Input;

const TRIAGE_CONFIG: Record<number, { color: string; label: string; antColor: string }> = {
  1: { color: '#cf1322', label: 'Resuscitation', antColor: 'red' },
  2: { color: '#d46b08', label: 'Emergent', antColor: 'orange' },
  3: { color: '#d4b106', label: 'Urgent', antColor: 'gold' },
  4: { color: '#389e0d', label: 'Less Urgent', antColor: 'green' },
  5: { color: '#0958d9', label: 'Non-Urgent', antColor: 'blue' },
};

const ERDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [admitModal, setAdmitModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientSearch, setPatientSearch] = useState(false);
  const [admitForm] = Form.useForm();
  const [activeAdmission, setActiveAdmission] = useState<any>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);

  // Fetch active ER admissions
  const { data: admissions, isLoading } = useQuery({
    queryKey: ['er-admissions'],
    queryFn: () =>
      api.get('/admissions', { params: { status: 'ADMITTED', admissionType: 'ER', limit: 100 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 30000,
  });

  const { data: depts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then((r) => r.data?.data || []),
  });

  const admitMutation = useMutation({
    mutationFn: (payload: any) => api.post('/admissions', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['er-admissions'] });
      setAdmitModal(false);
      admitForm.resetFields();
      setSelectedPatient(null);
    },
  });

  const dischargeMutation = useMutation({
    mutationFn: ({ id, dischargeType }: { id: string; dischargeType: string }) =>
      api.put(`/admissions/${id}`, { status: 'DISCHARGED', dischargeType, dischargedAt: new Date() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['er-admissions'] }),
  });

  const handleAdmit = (values: any) => {
    if (!selectedPatient) return;
    admitMutation.mutate({
      patientId: selectedPatient.id,
      admissionType: 'ER',
      departmentId: user?.departmentId,
      triageLevel: values.triageLevel,
      chiefComplaint: values.chiefComplaint,
      attendingDoctor: values.attendingDoctor,
      notes: values.notes,
    });
  };

  const active = admissions || [];
  const byTriage = [1, 2, 3].reduce(
    (acc, l) => ({ ...acc, [l]: active.filter((a: any) => a.triageLevel === l).length }),
    {} as Record<number, number>
  );

  const columns = [
    {
      title: 'Triage',
      dataIndex: 'triageLevel',
      width: 110,
      render: (lvl: number) =>
        lvl ? (
          <Tag color={TRIAGE_CONFIG[lvl]?.antColor}>
            ESI {lvl} — {TRIAGE_CONFIG[lvl]?.label}
          </Tag>
        ) : (
          <Tag>Pending</Tag>
        ),
      sorter: (a: any, b: any) => (a.triageLevel || 9) - (b.triageLevel || 9),
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: 'Patient',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.patient?.firstName} {r.patient?.lastName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    {
      title: 'Chief Complaint',
      dataIndex: 'chiefComplaint',
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Time in ER',
      dataIndex: 'admittedAt',
      render: (v: string) => (
        <Tooltip title={dayjs(v).format('MMM D, h:mm A')}>
          <Space>
            <ClockCircleOutlined />
            {dayjs(v).fromNow(true)}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Attending',
      dataIndex: 'attendingDoctor',
      render: (v: string) => v || <Text type="secondary">Unassigned</Text>,
    },
    {
      title: 'Actions',
      render: (_: any, r: any) => (
        <Space>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => { setActiveAdmission(r); setNotesOpen(true); }}
          >
            Notes
          </Button>
          <Button
            size="small"
            icon={<MedicineBoxOutlined />}
            onClick={() => { setActiveAdmission(r); setOrdersOpen(true); }}
          >
            Orders
          </Button>
          <Button
            size="small"
            danger
            onClick={() =>
              Modal.confirm({
                title: 'Discharge Patient',
                content: (
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Discharge type"
                    onChange={(v) => (Modal as any)._dischargeType = v}
                    options={[
                      { value: 'IMPROVED', label: 'Improved / Discharged' },
                      { value: 'TRANSFERRED', label: 'Transferred to Ward' },
                      { value: 'REFERRED', label: 'Referred to Other Facility' },
                      { value: 'HAMA', label: 'HAMA (Against Medical Advice)' },
                      { value: 'ABSCONDED', label: 'Absconded' },
                      { value: 'DIED', label: 'Died' },
                    ]}
                  />
                ),
                onOk: () =>
                  dischargeMutation.mutate({
                    id: r.id,
                    dischargeType: (Modal as any)._dischargeType || 'IMPROVED',
                  }),
              })
            }
          >
            Discharge
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <ThunderboltOutlined style={{ fontSize: 24, color: '#cf1322' }} />
            <Title level={3} style={{ margin: 0 }}>Emergency Room Dashboard</Title>
          </Space>
          <Text type="secondary">Real-time ER patient census</Text>
        </Col>
        <Col>
          <Button type="primary" danger icon={<PlusOutlined />} onClick={() => setAdmitModal(true)}>
            Admit ER Patient
          </Button>
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Total Active" value={active.length} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title={<Space><Badge color="red" />ESI 1-2 Critical</Space>}
              value={(byTriage[1] || 0) + (byTriage[2] || 0)}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title={<Space><Badge color="gold" />ESI 3 Urgent</Space>}
              value={byTriage[3] || 0}
              valueStyle={{ color: '#d4b106' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Avg Wait"
              value={
                active.length
                  ? Math.round(
                      active.reduce(
                        (s: number, a: any) => s + dayjs().diff(dayjs(a.admittedAt), 'minute'),
                        0
                      ) / active.length
                    )
                  : 0
              }
              suffix="min"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Patient table */}
      <Card>
        <Table
          dataSource={active}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={false}
          rowClassName={(r) =>
            r.triageLevel === 1 ? 'er-row-critical' : r.triageLevel === 2 ? 'er-row-emergent' : ''
          }
        />
      </Card>

      {/* Admit Modal */}
      <Modal
        title={<Space><AlertOutlined style={{ color: '#cf1322' }} />Admit ER Patient</Space>}
        open={admitModal}
        onCancel={() => { setAdmitModal(false); setSelectedPatient(null); admitForm.resetFields(); }}
        onOk={() => admitForm.submit()}
        confirmLoading={admitMutation.isPending}
        width={560}
      >
        <Form form={admitForm} layout="vertical" onFinish={handleAdmit}>
          <Form.Item label="Patient" required>
            {selectedPatient ? (
              <Alert
                message={`${selectedPatient.firstName} ${selectedPatient.lastName} — ${selectedPatient.patientNo}`}
                type="success"
                showIcon
                action={
                  <Button size="small" onClick={() => setSelectedPatient(null)}>Change</Button>
                }
              />
            ) : (
              <Button icon={<UserOutlined />} onClick={() => setPatientSearch(true)}>
                Search Patient
              </Button>
            )}
          </Form.Item>

          <Form.Item name="triageLevel" label="Triage Level (ESI)" rules={[{ required: true }]}>
            <Select
              options={Object.entries(TRIAGE_CONFIG).map(([k, v]) => ({
                value: Number(k),
                label: `ESI ${k} — ${v.label}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="chiefComplaint" label="Chief Complaint" rules={[{ required: true }]}>
            <Input placeholder="e.g. Chest pain, shortness of breath" />
          </Form.Item>

          <Form.Item name="attendingDoctor" label="Attending Doctor">
            <Input placeholder="Doctor name" />
          </Form.Item>

          <Form.Item name="notes" label="Initial Notes">
            <TextArea rows={3} placeholder="Initial assessment notes..." />
          </Form.Item>
        </Form>
      </Modal>

      <PatientSearchModal
        open={patientSearch}
        onClose={() => setPatientSearch(false)}
        onSelect={(p) => { setSelectedPatient(p); setPatientSearch(false); }}
      />

      {activeAdmission && (
        <>
          <ClinicalNotesPanel
            open={notesOpen}
            onClose={() => setNotesOpen(false)}
            patientId={activeAdmission.patient?.id}
            admissionId={activeAdmission.id}
            patientName={`${activeAdmission.patient?.firstName} ${activeAdmission.patient?.lastName}`}
          />
          <OrderServicesModal
            open={ordersOpen}
            onClose={() => setOrdersOpen(false)}
            patientId={activeAdmission.patient?.id}
            admissionId={activeAdmission.id}
            patientName={`${activeAdmission.patient?.firstName} ${activeAdmission.patient?.lastName}`}
          />
        </>
      )}
    </div>
  );
};

export default ERDashboardPage;
