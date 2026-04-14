import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Typography,
  Row,
  Col,
  Table,
  Tag,
  Modal,
  DatePicker,
  AutoComplete,
  Space,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useHmoCompanies,
  usePatientHmo,
  useRegisterPatientHmo,
  useUpdateHmoRegistration,
} from '../../hooks/useHMO';
import { patientService } from '../../services/patientService';

const { Title, Text } = Typography;

interface HmoRegistration {
  id: string;
  memberNo: string;
  groupNo?: string;
  plan?: string;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  hmoCompany?: { name: string; code: string };
  patient?: { firstName: string; lastName: string; patientNo: string };
}

interface HmoCompany {
  id: string;
  name: string;
  code: string;
}

const HMORegistrationPage: React.FC = () => {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedReg, setSelectedReg] = useState<HmoRegistration | null>(null);
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string }[]>([]);

  const { data: companiesData } = useHmoCompanies();
  const { data: regData } = usePatientHmo(selectedPatientId);
  const registerHmo = useRegisterPatientHmo();
  const updateHmo = useUpdateHmoRegistration();

  const companies: HmoCompany[] = companiesData?.data || [];
  const registrations: HmoRegistration[] = regData?.data || [];

  const handlePatientSearch = async (q: string) => {
    if (q.length < 2) return;
    const res = await patientService.search(q);
    const patients = res?.data || [];
    setPatientOptions(
      patients.map((p: { id: string; lastName: string; firstName: string; patientNo: string }) => ({
        value: p.id,
        label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
      }))
    );
  };

  const handleRegister = async (values: Record<string, unknown>) => {
    const data = {
      ...values,
      patientId: selectedPatientId,
      validFrom: values['validFrom'] ? (values['validFrom'] as ReturnType<typeof dayjs>).toISOString() : undefined,
      validUntil: values['validUntil'] ? (values['validUntil'] as ReturnType<typeof dayjs>).toISOString() : undefined,
    };
    await registerHmo.mutateAsync(data);
    setModalOpen(false);
    form.resetFields();
  };

  const openEdit = (reg: HmoRegistration) => {
    setSelectedReg(reg);
    editForm.setFieldsValue({
      ...reg,
      validFrom: reg.validFrom ? dayjs(reg.validFrom) : undefined,
      validUntil: reg.validUntil ? dayjs(reg.validUntil) : undefined,
    });
    setEditModal(true);
  };

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!selectedReg) return;
    const data = {
      ...values,
      validFrom: values['validFrom'] ? (values['validFrom'] as ReturnType<typeof dayjs>).toISOString() : undefined,
      validUntil: values['validUntil'] ? (values['validUntil'] as ReturnType<typeof dayjs>).toISOString() : undefined,
    };
    await updateHmo.mutateAsync({ id: selectedReg.id, data });
    setEditModal(false);
  };

  const isExpired = (validUntil?: string) => validUntil && dayjs(validUntil).isBefore(dayjs());

  const columns = [
    {
      title: 'HMO Company',
      key: 'company',
      render: (_: unknown, row: HmoRegistration) => (
        <Space>
          <Text strong>{row.hmoCompany?.name || '—'}</Text>
          <Tag>{row.hmoCompany?.code}</Tag>
        </Space>
      ),
    },
    { title: 'Member No.', dataIndex: 'memberNo' },
    { title: 'Group No.', dataIndex: 'groupNo', render: (v?: string) => v || '—' },
    { title: 'Plan', dataIndex: 'plan', render: (v?: string) => v || '—' },
    {
      title: 'Valid From',
      dataIndex: 'validFrom',
      render: (v?: string) => v ? dayjs(v).format('MMM D, YYYY') : '—',
    },
    {
      title: 'Valid Until',
      dataIndex: 'validUntil',
      render: (v?: string) => {
        if (!v) return '—';
        const expired = isExpired(v);
        return <Tag color={expired ? 'red' : 'green'}>{dayjs(v).format('MMM D, YYYY')}</Tag>;
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, row: HmoRegistration) => {
        if (!row.isActive) return <Tag color="default">Inactive</Tag>;
        if (isExpired(row.validUntil)) return <Tag color="red">Expired</Tag>;
        return <Tag color="green">Active</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, row: HmoRegistration) => (
        <Button size="small" onClick={() => openEdit(row)}>Edit</Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>HMO Registrations</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Register HMO
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8} align="middle">
          <Col span={12}>
            <AutoComplete
              options={patientOptions}
              onSearch={handlePatientSearch}
              onSelect={(value) => setSelectedPatientId(value)}
              placeholder="Search patient to view their HMO registrations..."
              style={{ width: '100%' }}
              allowClear
              onClear={() => setSelectedPatientId('')}
            />
          </Col>
        </Row>
      </Card>

      {selectedPatientId && (
        <Table
          dataSource={registrations}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'No HMO registrations for this patient' }}
        />
      )}

      {!selectedPatientId && (
        <Card>
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
            Search for a patient to view their HMO registrations
          </div>
        </Card>
      )}

      {/* Register Modal */}
      <Modal
        title="Register Patient HMO"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={registerHmo.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleRegister}>
          <Form.Item label="Patient">
            <AutoComplete
              options={patientOptions}
              onSearch={handlePatientSearch}
              onSelect={(value) => setSelectedPatientId(value)}
              placeholder="Search patient..."
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="hmoCompanyId" label="HMO Company" rules={[{ required: true }]}>
            <Select
              options={companies.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
              placeholder="Select HMO company"
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="memberNo" label="Member Number" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="groupNo" label="Group Number">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="plan" label="Plan Name">
            <Input placeholder="e.g. Basic Plan, Executive Plan" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="validFrom" label="Valid From">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="validUntil" label="Valid Until">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit HMO Registration"
        open={editModal}
        onCancel={() => setEditModal(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateHmo.isPending}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="memberNo" label="Member Number" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="groupNo" label="Group Number">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="plan" label="Plan Name">
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="validFrom" label="Valid From">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="validUntil" label="Valid Until">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isActive" label="Status">
            <Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HMORegistrationPage;
