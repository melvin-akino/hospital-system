import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Space, Typography, Tabs, List,
  Avatar, Statistic, Input, Spin, Empty, Badge, Divider,
} from 'antd';
import {
  UserOutlined, FileTextOutlined, MedicineBoxOutlined, ExperimentOutlined,
  RadarChartOutlined, HeartOutlined, SearchOutlined, AlertOutlined,
  CheckOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import ClinicalNotesPanel from '../../components/clinical/ClinicalNotesPanel';
import OrderServicesModal from '../../components/clinical/OrderServicesModal';

const { Title, Text } = Typography;

const DoctorWorkspacePage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [search, setSearch] = useState('');

  // My current admissions / consultations
  const { data: admissions, isLoading: admissionsLoading } = useQuery({
    queryKey: ['doctor-admissions', user?.id],
    queryFn: () =>
      api.get('/admissions', { params: { status: 'ADMITTED', limit: 100 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
  });

  const { data: consultations, isLoading: consultsLoading } = useQuery({
    queryKey: ['doctor-consultations', user?.id],
    queryFn: () =>
      api.get('/consultations', { params: { status: 'SCHEDULED,IN_PROGRESS', limit: 50 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
  });

  // Pending lab results (all patients, PENDING status)
  const { data: pendingLabs } = useQuery({
    queryKey: ['workspace-pending-labs'],
    queryFn: () =>
      api.get('/lab-requisitions', { params: { status: 'PENDING', limit: 20 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 60000,
  });

  // Active prescriptions awaiting action (ACTIVE, recent)
  const { data: pendingRx } = useQuery({
    queryKey: ['workspace-pending-rx'],
    queryFn: () =>
      api.get('/prescriptions', { params: { status: 'ACTIVE', limit: 20 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 60000,
  });

  const dispensePrescription = useMutation({
    mutationFn: (id: string) => api.put(`/prescriptions/${id}`, { status: 'DISPENSED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-pending-rx'] }),
  });

  const filtered = (admissions || []).filter((a: any) => {
    if (!search) return true;
    const name = `${a.patient?.firstName} ${a.patient?.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase()) || a.patient?.patientNo?.includes(search);
  });

  const patientDetail = selectedPatient;

  // Fetch selected patient's full chart
  const { data: labResults } = useQuery({
    queryKey: ['patient-labs', patientDetail?.patient?.id],
    queryFn: () =>
      api.get('/lab-results', { params: { patientId: patientDetail.patient.id, limit: 20 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    enabled: !!patientDetail?.patient?.id,
  });

  const { data: radResults } = useQuery({
    queryKey: ['patient-radiology', patientDetail?.patient?.id],
    queryFn: () =>
      api.get('/radiology-orders', { params: { patientId: patientDetail.patient.id, limit: 20 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    enabled: !!patientDetail?.patient?.id,
  });

  const { data: vitals } = useQuery({
    queryKey: ['patient-vitals', patientDetail?.patient?.id],
    queryFn: () =>
      api.get('/vital-signs', { params: { patientId: patientDetail.patient.id, limit: 10 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    enabled: !!patientDetail?.patient?.id,
  });

  const { data: prescriptions } = useQuery({
    queryKey: ['patient-prescriptions', patientDetail?.patient?.id],
    queryFn: () =>
      api.get('/prescriptions', { params: { patientId: patientDetail.patient.id } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    enabled: !!patientDetail?.patient?.id,
  });

  const admissionColumns = [
    {
      title: 'Patient',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.patient?.firstName} {r.patient?.lastName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'admissionType',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Complaint',
      dataIndex: 'chiefComplaint',
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Since',
      dataIndex: 'admittedAt',
      render: (v: string) => dayjs(v).format('MMM D, h:mm A'),
    },
    {
      title: 'Actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" type="primary" onClick={() => setSelectedPatient(r)}>
            View Chart
          </Button>
          <Button size="small" icon={<FileTextOutlined />}
            onClick={() => { setSelectedPatient(r); setNotesOpen(true); }}>
            Notes
          </Button>
          <Button size="small" icon={<MedicineBoxOutlined />}
            onClick={() => { setSelectedPatient(r); setOrdersOpen(true); }}>
            Orders
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
            <HeartOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              Doctor's Workspace
            </Title>
          </Space>
          <Text type="secondary">Welcome, {user?.displayName || user?.username}</Text>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Active Admissions" value={(admissions || []).length} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Today's Consultations" value={(consultations || []).length} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{ cursor: 'pointer', borderLeft: (pendingLabs || []).length > 0 ? '4px solid #fa8c16' : undefined }}
            onClick={() => navigate('/lab/work-queue')}
          >
            <Statistic
              title="Pending Lab Orders"
              value={(pendingLabs || []).length}
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: (pendingLabs || []).length > 0 ? '#fa8c16' : '#333' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderLeft: (pendingRx || []).length > 0 ? '4px solid #1890ff' : undefined }}>
            <Statistic
              title="Active Prescriptions"
              value={(pendingRx || []).length}
              prefix={<MedicineBoxOutlined />}
              valueStyle={{ color: (pendingRx || []).length > 0 ? '#1890ff' : '#333' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Action Items panel ── */}
      {((pendingLabs || []).length > 0 || (pendingRx || []).length > 0) && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {(pendingLabs || []).length > 0 && (
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={<Space><AlertOutlined style={{ color: '#fa8c16' }} /><Text strong>Pending Lab Orders</Text><Tag color="orange">{(pendingLabs || []).length}</Tag></Space>}
                extra={<Button size="small" onClick={() => navigate('/lab/work-queue')}>View All</Button>}
              >
                <List
                  size="small"
                  dataSource={(pendingLabs || []).slice(0, 5)}
                  renderItem={(item: any) => (
                    <List.Item
                      actions={[
                        <Button size="small" type="link" onClick={() => navigate(`/lab/results/entry/${item.id}`)}>
                          View
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <Tag color={item.priority === 'STAT' ? 'red' : item.priority === 'URGENT' ? 'orange' : 'default'} style={{ fontSize: 10 }}>
                              {item.priority}
                            </Tag>
                            <Text strong style={{ fontSize: 12 }}>
                              {item.patient?.lastName}, {item.patient?.firstName}
                            </Text>
                          </Space>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {(item.items || []).map((i: any) => i.testCode || i.testName).join(', ')}
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          )}
          {(pendingRx || []).length > 0 && (
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={<Space><MedicineBoxOutlined style={{ color: '#1890ff' }} /><Text strong>Active Prescriptions</Text><Tag color="blue">{(pendingRx || []).length}</Tag></Space>}
              >
                <List
                  size="small"
                  dataSource={(pendingRx || []).slice(0, 5)}
                  renderItem={(rx: any) => (
                    <List.Item
                      actions={[
                        <Button
                          size="small"
                          type="link"
                          style={{ color: '#52c41a' }}
                          icon={<CheckOutlined />}
                          onClick={() => dispensePrescription.mutate(rx.id)}
                        >
                          Dispensed
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={<Text strong style={{ fontSize: 12 }}>{rx.rxNo}</Text>}
                        description={
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {rx.patient?.lastName}, {rx.patient?.firstName} ·{' '}
                            {(rx.items || []).map((i: any) => i.drugName).join(', ')}
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          )}
        </Row>
      )}

      <Row gutter={16}>
        {/* Patient List */}
        <Col xs={24} md={selectedPatient ? 10 : 24}>
          <Card
            title="Active Patients"
            extra={
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search..."
                size="small"
                style={{ width: 180 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            }
          >
            <Table
              dataSource={filtered}
              columns={admissionColumns}
              rowKey="id"
              loading={admissionsLoading}
              size="small"
              pagination={{ pageSize: 10 }}
              rowClassName={(r) => r.id === selectedPatient?.id ? 'ant-table-row-selected' : ''}
              onRow={(r) => ({ onClick: () => setSelectedPatient(r) })}
            />
          </Card>
        </Col>

        {/* Patient Chart Panel */}
        {selectedPatient && (
          <Col xs={24} md={14}>
            <Card
              title={
                <Space>
                  <Avatar icon={<UserOutlined />} />
                  <div>
                    <Text strong>{selectedPatient.patient?.firstName} {selectedPatient.patient?.lastName}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {selectedPatient.patient?.patientNo} · Admitted {dayjs(selectedPatient.admittedAt).format('MMM D')}
                    </Text>
                  </div>
                </Space>
              }
              extra={
                <Space>
                  <Button icon={<FileTextOutlined />} onClick={() => setNotesOpen(true)}>Notes</Button>
                  <Button icon={<MedicineBoxOutlined />} onClick={() => setOrdersOpen(true)}>Orders</Button>
                  <Button onClick={() => setSelectedPatient(null)}>✕</Button>
                </Space>
              }
            >
              {selectedPatient.chiefComplaint && (
                <Space direction="vertical" size={0} style={{ marginBottom: 12, width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>CHIEF COMPLAINT</Text>
                  <Text>{selectedPatient.chiefComplaint}</Text>
                  <Divider style={{ margin: '8px 0' }} />
                </Space>
              )}

              <Tabs
                size="small"
                items={[
                  {
                    key: 'vitals',
                    label: <Space><HeartOutlined />Vitals</Space>,
                    children: (
                      <List
                        size="small"
                        dataSource={(vitals || []).slice(0, 5)}
                        locale={{ emptyText: 'No vitals recorded' }}
                        renderItem={(v: any) => (
                          <List.Item>
                            <Space wrap style={{ width: '100%' }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {dayjs(v.recordedAt).format('MMM D h:mm A')}
                              </Text>
                              {v.bloodPressureSystolic && (
                                <Tag>BP {v.bloodPressureSystolic}/{v.bloodPressureDiastolic}</Tag>
                              )}
                              {v.heartRate && <Tag>HR {v.heartRate}</Tag>}
                              {v.temperature && <Tag>T {Number(v.temperature)}°C</Tag>}
                              {v.oxygenSaturation && <Tag>SpO₂ {Number(v.oxygenSaturation)}%</Tag>}
                            </Space>
                          </List.Item>
                        )}
                      />
                    ),
                  },
                  {
                    key: 'labs',
                    label: <Space><ExperimentOutlined />Labs <Badge count={(labResults || []).filter((l: any) => l.isAbnormal).length} /></Space>,
                    children: (
                      <Table
                        size="small"
                        dataSource={labResults || []}
                        pagination={false}
                        rowKey="id"
                        columns={[
                          { title: 'Test', dataIndex: 'testName' },
                          { title: 'Result', dataIndex: 'result', render: (v: string, r: any) => (
                            <Text style={{ color: r.isAbnormal ? '#cf1322' : undefined }}>{v || '—'}</Text>
                          )},
                          { title: 'Ref', dataIndex: 'referenceRange', render: (v: string) => v || '—' },
                          { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag>{v}</Tag> },
                        ]}
                      />
                    ),
                  },
                  {
                    key: 'radiology',
                    label: <Space><RadarChartOutlined />Imaging</Space>,
                    children: (
                      <Table
                        size="small"
                        dataSource={radResults || []}
                        pagination={false}
                        rowKey="id"
                        columns={[
                          { title: 'Modality', dataIndex: 'modality' },
                          { title: 'Body Part', dataIndex: 'bodyPart', render: (v: string) => v || '—' },
                          { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag>{v}</Tag> },
                          { title: 'Impression', render: (_: any, r: any) => r.report?.impression || <Text type="secondary">Pending</Text> },
                        ]}
                      />
                    ),
                  },
                  {
                    key: 'rx',
                    label: <Space><MedicineBoxOutlined />Prescriptions</Space>,
                    children: (
                      <List
                        size="small"
                        dataSource={prescriptions || []}
                        locale={{ emptyText: 'No prescriptions' }}
                        renderItem={(rx: any) => (
                          <List.Item>
                            <Space direction="vertical" size={0}>
                              <Text strong>{dayjs(rx.createdAt).format('MMM D')}</Text>
                              {(rx.items || []).map((item: any) => (
                                <Text key={item.id} style={{ fontSize: 12 }}>
                                  • {item.drugName} {item.dosage} {item.frequency}
                                </Text>
                              ))}
                            </Space>
                          </List.Item>
                        )}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        )}
      </Row>

      {selectedPatient && (
        <>
          <ClinicalNotesPanel
            open={notesOpen}
            onClose={() => setNotesOpen(false)}
            patientId={selectedPatient.patient?.id}
            admissionId={selectedPatient.id}
            patientName={`${selectedPatient.patient?.firstName} ${selectedPatient.patient?.lastName}`}
          />
          <OrderServicesModal
            open={ordersOpen}
            onClose={() => setOrdersOpen(false)}
            patientId={selectedPatient.patient?.id}
            admissionId={selectedPatient.id}
            patientName={`${selectedPatient.patient?.firstName} ${selectedPatient.patient?.lastName}`}
          />
        </>
      )}
    </div>
  );
};

export default DoctorWorkspacePage;
