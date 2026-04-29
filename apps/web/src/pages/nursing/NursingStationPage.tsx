import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Space, Typography, Statistic,
  Form, Input, InputNumber, Modal, Select, Divider,
} from 'antd';
import { HeartOutlined, PlusOutlined, FileTextOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import ClinicalNotesPanel from '../../components/clinical/ClinicalNotesPanel';
import OrderServicesModal from '../../components/clinical/OrderServicesModal';

const { Title, Text } = Typography;

const NursingStationPage: React.FC = () => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [vitalsModal, setVitalsModal] = useState(false);
  const [vitalsPatient, setVitalsPatient] = useState<any>(null);
  const [vitalsForm] = Form.useForm();
  const [notesPatient, setNotesPatient] = useState<any>(null);
  const [ordersPatient, setOrdersPatient] = useState<any>(null);

  const { data: admissions, isLoading } = useQuery({
    queryKey: ['nursing-admissions', user?.departmentId],
    queryFn: () =>
      api.get('/admissions', {
        params: {
          status: 'ADMITTED',
          ...(user?.departmentId && { departmentId: user.departmentId }),
          limit: 100,
        },
      }).then((r) => r.data?.data?.data || r.data?.data || []),
    refetchInterval: 60000,
  });

  const vitalsMutation = useMutation({
    mutationFn: (data: any) => api.post('/vital-signs', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nursing-admissions'] }); setVitalsModal(false); vitalsForm.resetFields(); },
  });

  const columns = [
    {
      title: 'Room / Bed',
      render: (_: any, r: any) => r.room?.roomNumber || <Text type="secondary">Unassigned</Text>,
      width: 100,
    },
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
      title: 'Diagnosis',
      dataIndex: 'diagnosis',
      render: (v: string) => v || <Text type="secondary">Pending</Text>,
    },
    {
      title: 'Admitted',
      dataIndex: 'admittedAt',
      render: (v: string) => dayjs(v).format('MMM D, h:mm A'),
    },
    {
      title: 'Actions',
      render: (_: any, r: any) => (
        <Space>
          <Button
            size="small"
            icon={<HeartOutlined />}
            onClick={() => { setVitalsPatient(r); setVitalsModal(true); }}
          >
            Vitals
          </Button>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => setNotesPatient(r)}
          >
            Notes
          </Button>
          <Button
            size="small"
            icon={<MedicineBoxOutlined />}
            onClick={() => setOrdersPatient(r)}
          >
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
            <HeartOutlined style={{ fontSize: 24, color: '#52c41a' }} />
            <Title level={3} style={{ margin: 0 }}>
              Nursing Station {user?.departmentName ? `— ${user.departmentName}` : ''}
            </Title>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card><Statistic title="Admitted Patients" value={(admissions || []).length} /></Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card><Statistic title="Critical" value={(admissions || []).filter((a: any) => a.triageLevel && a.triageLevel <= 2).length} valueStyle={{ color: '#cf1322' }} /></Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card><Statistic title="For Discharge" value={0} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
      </Row>

      <Card>
        <Table
          dataSource={admissions || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {/* Vitals Modal */}
      <Modal
        title={`Record Vitals — ${vitalsPatient?.patient?.firstName} ${vitalsPatient?.patient?.lastName}`}
        open={vitalsModal}
        onCancel={() => { setVitalsModal(false); vitalsForm.resetFields(); }}
        onOk={() => vitalsForm.submit()}
        confirmLoading={vitalsMutation.isPending}
      >
        <Form
          form={vitalsForm}
          layout="vertical"
          onFinish={(v) =>
            vitalsMutation.mutate({
              patientId: vitalsPatient?.patient?.id,
              ...v,
              recordedBy: user?.username,
            })
          }
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="bloodPressureSystolic" label="BP Systolic">
                <InputNumber style={{ width: '100%' }} placeholder="120" addonAfter="mmHg" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bloodPressureDiastolic" label="BP Diastolic">
                <InputNumber style={{ width: '100%' }} placeholder="80" addonAfter="mmHg" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="heartRate" label="Heart Rate">
                <InputNumber style={{ width: '100%' }} placeholder="72" addonAfter="bpm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="respiratoryRate" label="Resp. Rate">
                <InputNumber style={{ width: '100%' }} placeholder="16" addonAfter="/min" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="temperature" label="Temperature">
                <InputNumber style={{ width: '100%' }} placeholder="36.5" addonAfter="°C" step={0.1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="oxygenSaturation" label="SpO₂">
                <InputNumber style={{ width: '100%' }} placeholder="98" addonAfter="%" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="weight" label="Weight">
                <InputNumber style={{ width: '100%' }} addonAfter="kg" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="height" label="Height">
                <InputNumber style={{ width: '100%' }} addonAfter="cm" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {notesPatient && (
        <ClinicalNotesPanel
          open={!!notesPatient}
          onClose={() => setNotesPatient(null)}
          patientId={notesPatient.patient?.id}
          admissionId={notesPatient.id}
          patientName={`${notesPatient.patient?.firstName} ${notesPatient.patient?.lastName}`}
        />
      )}
      {ordersPatient && (
        <OrderServicesModal
          open={!!ordersPatient}
          onClose={() => setOrdersPatient(null)}
          patientId={ordersPatient.patient?.id}
          admissionId={ordersPatient.id}
          patientName={`${ordersPatient.patient?.firstName} ${ordersPatient.patient?.lastName}`}
        />
      )}
    </div>
  );
};

export default NursingStationPage;
