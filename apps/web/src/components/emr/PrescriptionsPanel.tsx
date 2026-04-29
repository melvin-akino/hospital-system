import React, { useState } from 'react';
import {
  Button, Space, Tag, Typography, Form, Input, InputNumber, Modal,
  Table, Tooltip, Popconfirm, Empty, Spin, Badge, Row, Col, Select,
  Descriptions, Divider, Alert,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, DeleteOutlined, MedicineBoxOutlined,
  PrinterOutlined, CheckOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import dayjs from 'dayjs';
import api from '../../lib/api';

const { Text, Title } = Typography;

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'blue', DISPENSED: 'green', CANCELLED: 'red',
};

interface Props {
  patientId: string;
  admissionId?: string;
  consultationId?: string;
}

const FREQ_OPTIONS = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 8 hours', 'Every 6 hours', 'Every 4 hours', 'As needed (PRN)', 'Once only'];

const PrescriptionsPanel: React.FC<Props> = ({ patientId, admissionId, consultationId }) => {
  const { message } = App.useApp();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen]       = useState(false);
  const [detailModal, setDetailModal]   = useState(false);
  const [selectedRx, setSelectedRx]     = useState<any>(null);
  const [items, setItems]               = useState<any[]>([{ drugName: '', dosage: '', frequency: 'Once daily', duration: '', quantity: 1, instructions: '' }]);
  const [form] = Form.useForm();

  const queryKey = ['prescriptions', { patientId, admissionId, consultationId }];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params: Record<string, string> = { patientId };
      if (admissionId)    params['admissionId']    = admissionId;
      if (consultationId) params['consultationId'] = consultationId;
      return api.get('/prescriptions', { params }).then((r) => r.data?.data || []);
    },
  });

  const rxList: any[] = data || [];

  const { data: medsData } = useQuery({
    queryKey: ['medications-search'],
    queryFn: () => api.get('/medications?limit=200').then((r) => r.data?.data?.data || r.data?.data || []),
  });
  const medications: any[] = medsData || [];

  const createRx = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post('/prescriptions', body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); message.success('Prescription created'); },
    onError:   (e: any) => message.error(e?.response?.data?.message || 'Failed to create prescription'),
  });

  const cancelRx = useMutation({
    mutationFn: (id: string) => api.delete(`/prescriptions/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); message.success('Prescription cancelled'); },
    onError:   (e: any) => message.error(e?.response?.data?.message || 'Failed to cancel'),
  });

  const markDispensed = useMutation({
    mutationFn: (id: string) => api.put(`/prescriptions/${id}`, { status: 'DISPENSED' }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); message.success('Marked as dispensed'); },
    onError:   (e: any) => message.error(e?.response?.data?.message || 'Failed to update'),
  });

  const addItem = () =>
    setItems((prev) => [...prev, { drugName: '', dosage: '', frequency: 'Once daily', duration: '', quantity: 1, instructions: '' }]);

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, value: any) =>
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const handleSubmit = async () => {
    const valid = items.every((item) => item.drugName.trim());
    if (!valid) { message.error('All items must have a drug name'); return; }

    await createRx.mutateAsync({
      patientId,
      admissionId:    admissionId    || undefined,
      consultationId: consultationId || undefined,
      notes: form.getFieldValue('notes'),
      items,
    });
    setModalOpen(false);
    form.resetFields();
    setItems([{ drugName: '', dosage: '', frequency: 'Once daily', duration: '', quantity: 1, instructions: '' }]);
  };

  if (isLoading) return <Spin />;

  const columns = [
    {
      title: 'Rx #',
      dataIndex: 'rxNo',
      key: 'rxNo',
      render: (v: string, r: any) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => { setSelectedRx(r); setDetailModal(true); }}>{v}</Button>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          {(r.items || []).slice(0, 3).map((item: any, i: number) => (
            <Text key={i} style={{ fontSize: 12 }}>
              <MedicineBoxOutlined style={{ marginRight: 4, color: '#1890ff' }} />
              {item.drugName} {item.dosage && `— ${item.dosage}`}
            </Text>
          ))}
          {r.items?.length > 3 && <Text type="secondary" style={{ fontSize: 11 }}>+{r.items.length - 3} more</Text>}
        </Space>
      ),
    },
    {
      title: 'Prescribed By',
      dataIndex: 'prescribedBy',
      key: 'by',
      render: (v: string) => v || '—',
    },
    {
      title: 'Date',
      dataIndex: 'prescribedAt',
      key: 'date',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, r: any) => (
        <Space>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedRx(r); setDetailModal(true); }} /></Tooltip>
          {r.status === 'ACTIVE' && (
            <Tooltip title="Mark Dispensed">
              <Popconfirm title="Mark as dispensed?" onConfirm={() => markDispensed.mutate(r.id)} okText="Dispensed">
                <Button size="small" icon={<CheckOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }} />
              </Popconfirm>
            </Tooltip>
          )}
          {r.status === 'ACTIVE' && (
            <Tooltip title="Cancel">
              <Popconfirm title="Cancel prescription?" onConfirm={() => cancelRx.mutate(r.id)} okButtonProps={{ danger: true }}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <App>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space>
            <MedicineBoxOutlined />
            <Text strong>Prescriptions</Text>
            <Badge count={rxList.filter((r) => r.status === 'ACTIVE').length} color="#1890ff" showZero />
          </Space>
        </Col>
        <Col>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Prescription
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={rxList}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: <Empty description="No prescriptions" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />

      {/* Create Modal */}
      <Modal
        title={<Space><MedicineBoxOutlined style={{ color: '#1890ff' }} />New Prescription</Space>}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); }}
        onOk={handleSubmit}
        okText="Create Prescription"
        okButtonProps={{ loading: createRx.isPending }}
        width={720}
      >
        <Form form={form} layout="vertical">
          <Alert
            type="info" showIcon style={{ marginBottom: 12 }}
            message="Items matching the medication catalog will be linked automatically for drug interaction checking."
          />
          {items.map((item, idx) => (
            <Card
              key={idx}
              size="small"
              style={{ marginBottom: 8, background: '#fafafa' }}
              title={<Text strong>Drug #{idx + 1}</Text>}
              extra={items.length > 1 && (
                <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeItem(idx)} />
              )}
            >
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item label="Drug Name" required style={{ marginBottom: 8 }}>
                    <Select
                      showSearch
                      value={item.drugName || undefined}
                      placeholder="Type or select drug…"
                      filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                      onChange={(val, opt: any) => {
                        updateItem(idx, 'drugName', val);
                        if (opt?.med) updateItem(idx, 'medicationId', opt.med.id);
                      }}
                      onSearch={(val) => updateItem(idx, 'drugName', val)}
                      options={[
                        ...medications.map((m: any) => ({
                          value: m.genericName,
                          label: `${m.genericName}${m.brandName ? ` (${m.brandName})` : ''}`,
                          med: m,
                        })),
                      ]}
                      mode={undefined}
                      style={{ width: '100%' }}
                      allowClear
                      notFoundContent={<Button type="link" size="small" onClick={() => {}}>Use typed name</Button>}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Dosage" style={{ marginBottom: 8 }}>
                    <Input value={item.dosage} onChange={(e) => updateItem(idx, 'dosage', e.target.value)} placeholder="e.g. 500mg" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Quantity" style={{ marginBottom: 8 }}>
                    <InputNumber value={item.quantity} onChange={(v) => updateItem(idx, 'quantity', v)} min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Frequency" style={{ marginBottom: 8 }}>
                    <Select
                      value={item.frequency}
                      onChange={(v) => updateItem(idx, 'frequency', v)}
                      options={FREQ_OPTIONS.map((f) => ({ value: f, label: f }))}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Duration" style={{ marginBottom: 8 }}>
                    <Input value={item.duration} onChange={(e) => updateItem(idx, 'duration', e.target.value)} placeholder="e.g. 7 days" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="Special Instructions" style={{ marginBottom: 0 }}>
                    <Input value={item.instructions} onChange={(e) => updateItem(idx, 'instructions', e.target.value)} placeholder="e.g. Take with food, avoid alcohol" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}

          <Button type="dashed" block icon={<PlusOutlined />} onClick={addItem} style={{ marginBottom: 12 }}>
            Add Another Drug
          </Button>

          <Form.Item name="notes" label="Prescriber Notes">
            <Input.TextArea rows={2} placeholder="Additional instructions for pharmacist…" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={<Space><PrinterOutlined />Prescription — {selectedRx?.rxNo}</Space>}
        open={detailModal}
        onCancel={() => { setDetailModal(false); setSelectedRx(null); }}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>,
          <Button key="close" type="primary" onClick={() => { setDetailModal(false); setSelectedRx(null); }}>Close</Button>,
        ]}
        width={500}
      >
        {selectedRx && (
          <div style={{ fontFamily: 'Georgia, serif' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 8, marginBottom: 12 }}>
              <Title level={4} style={{ margin: 0 }}>PRESCRIPTION</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>iHIMS Hospital</Text>
            </div>
            <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Rx #">{selectedRx.rxNo}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[selectedRx.status]}>{selectedRx.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Patient" span={2}>
                <b>{selectedRx.patient?.lastName}, {selectedRx.patient?.firstName}</b> — {selectedRx.patient?.patientNo}
              </Descriptions.Item>
              <Descriptions.Item label="Prescribed by">{selectedRx.prescribedBy || '—'}</Descriptions.Item>
              <Descriptions.Item label="Date">{dayjs(selectedRx.prescribedAt).format('MMM D, YYYY')}</Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '8px 0' }} />

            {(selectedRx.items || []).map((item: any, i: number) => (
              <div key={i} style={{ marginBottom: 12, paddingLeft: 8, borderLeft: '3px solid #1890ff' }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {i + 1}. {item.drugName}
                </div>
                {item.dosage    && <div style={{ fontSize: 13 }}>Dosage: {item.dosage}</div>}
                {item.frequency && <div style={{ fontSize: 13 }}>Frequency: {item.frequency}</div>}
                {item.duration  && <div style={{ fontSize: 13 }}>Duration: {item.duration}</div>}
                {item.quantity  && <div style={{ fontSize: 13 }}>Qty: {item.quantity}</div>}
                {item.instructions && <div style={{ fontSize: 12, fontStyle: 'italic' }}>Note: {item.instructions}</div>}
              </div>
            ))}

            {selectedRx.notes && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                <b>Notes:</b> {selectedRx.notes}
              </div>
            )}

            <div style={{ marginTop: 20, textAlign: 'right', borderTop: '1px solid #ccc', paddingTop: 12 }}>
              <div style={{ fontSize: 13 }}>___________________________</div>
              <div style={{ fontSize: 12 }}>{selectedRx.prescribedBy}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Physician's Signature</div>
            </div>
          </div>
        )}
      </Modal>
    </App>
  );
};

export default PrescriptionsPanel;
