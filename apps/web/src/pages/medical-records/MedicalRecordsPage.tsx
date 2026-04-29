import React, { useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, Row, Col, Input,
  Statistic, Modal, Form, Select, Descriptions, Tabs,
} from 'antd';
import {
  FileTextOutlined, SearchOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import ClinicalNotesPanel from '../../components/clinical/ClinicalNotesPanel';

const { Title, Text } = Typography;
const { TextArea } = Input;

const MedicalRecordsPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [summaryModal, setSummaryModal] = useState(false);
  const [form] = Form.useForm();

  const { data: admissions, isLoading } = useQuery({
    queryKey: ['med-rec-admissions'],
    queryFn: () =>
      api.get('/admissions', { params: { limit: 100 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
  });

  const dischargeMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/admissions/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['med-rec-admissions'] }); setSummaryModal(false); form.resetFields(); },
  });

  const filtered = (admissions || []).filter((a: any) => {
    if (!search) return true;
    const name = `${a.patient?.firstName || ''} ${a.patient?.lastName || ''}`.toLowerCase();
    return name.includes(search.toLowerCase()) || a.admissionNo?.includes(search) || a.patient?.patientNo?.includes(search);
  });

  const columns = [
    { title: 'Adm #', dataIndex: 'admissionNo', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>, width: 120 },
    {
      title: 'Patient',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.patient?.firstName} {r.patient?.lastName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patient?.patientNo}</Text>
        </Space>
      ),
    },
    { title: 'Type', dataIndex: 'admissionType', render: (v: string) => <Tag>{v}</Tag>, width: 90 },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => (
        <Tag color={v === 'ADMITTED' ? 'blue' : v === 'DISCHARGED' ? 'green' : 'orange'}>{v}</Tag>
      ),
      width: 100,
    },
    {
      title: 'Admitted',
      dataIndex: 'admittedAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
      width: 120,
    },
    {
      title: 'Discharged',
      dataIndex: 'dischargedAt',
      render: (v: string) => v ? dayjs(v).format('MMM D, YYYY') : <Text type="secondary">Active</Text>,
      width: 120,
    },
    {
      title: 'Summary',
      dataIndex: 'dischargeSummary',
      render: (v: string) => v
        ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
        : <ClockCircleOutlined style={{ color: '#fa8c16' }} />,
      width: 80,
    },
    {
      title: 'Actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => setSelected(r)}>View</Button>
          <Button size="small" icon={<FileTextOutlined />} onClick={() => { setSelected(r); setNotesOpen(true); }}>
            Notes
          </Button>
          {!r.dischargeSummary && (
            <Button
              size="small"
              type="primary"
              onClick={() => { setSelected(r); form.setFieldsValue({ diagnosis: r.diagnosis, dischargeType: r.dischargeType }); setSummaryModal(true); }}
            >
              Discharge Summary
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>Medical Records</Title>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><Card><Statistic title="Total Records" value={(admissions || []).length} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Active Admissions" value={(admissions || []).filter((a: any) => a.status === 'ADMITTED').length} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Missing Summaries" value={(admissions || []).filter((a: any) => a.status === 'DISCHARGED' && !a.dischargeSummary).length} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Completed" value={(admissions || []).filter((a: any) => a.dischargeSummary).length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>

      <Card
        extra={
          <Input prefix={<SearchOutlined />} placeholder="Search..." size="small" style={{ width: 220 }} value={search} onChange={(e) => setSearch(e.target.value)} />
        }
      >
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 15 }} />
      </Card>

      {/* Discharge Summary Modal */}
      <Modal
        title="Discharge Summary"
        open={summaryModal}
        onCancel={() => { setSummaryModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={dischargeMutation.isPending}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) =>
            dischargeMutation.mutate({
              id: selected?.id,
              diagnosis: v.diagnosis,
              dischargeSummary: v.dischargeSummary,
              dischargeType: v.dischargeType,
              ...(selected?.status === 'ADMITTED' && { status: 'DISCHARGED', dischargedAt: new Date() }),
            })
          }
        >
          <Form.Item name="diagnosis" label="Final Diagnosis" rules={[{ required: true }]}>
            <Input placeholder="Primary and secondary diagnoses" />
          </Form.Item>
          <Form.Item name="dischargeType" label="Discharge Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'IMPROVED', label: 'Improved' },
                { value: 'TRANSFERRED', label: 'Transferred' },
                { value: 'REFERRED', label: 'Referred' },
                { value: 'HAMA', label: 'HAMA (Against Medical Advice)' },
                { value: 'ABSCONDED', label: 'Absconded' },
                { value: 'DIED', label: 'Died' },
              ]}
            />
          </Form.Item>
          <Form.Item name="dischargeSummary" label="Discharge Summary / Notes" rules={[{ required: true }]}>
            <TextArea rows={6} placeholder="Clinical course, procedures done, medications given, discharge instructions..." />
          </Form.Item>
        </Form>
      </Modal>

      {selected && (
        <ClinicalNotesPanel
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          patientId={selected.patient?.id}
          admissionId={selected.id}
          patientName={`${selected.patient?.firstName} ${selected.patient?.lastName}`}
        />
      )}
    </div>
  );
};

export default MedicalRecordsPage;
