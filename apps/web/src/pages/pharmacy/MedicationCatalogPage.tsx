import React, { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Typography,
  Row,
  Col,
  Card,
  Modal,
  Form,
  Select,
  Checkbox,
  Space,
  Tag,
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons';
import { useMedications, useCreateMedication, useUpdateMedication } from '../../hooks/usePharmacy';

const { Title } = Typography;

interface Medication {
  id: string;
  genericName: string;
  brandName?: string;
  dosageForm?: string;
  strength?: string;
  manufacturer?: string;
  isControlled: boolean;
  isActive: boolean;
  inventoryItems?: Array<{ currentStock: number; sellingPrice: number }>;
}

const MedicationCatalogPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useMedications({ page, limit: 20, q: search || undefined });
  const createMedication = useCreateMedication();
  const updateMedication = useUpdateMedication();

  const openCreate = () => {
    setEditingMed(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (med: Medication) => {
    setEditingMed(med);
    form.setFieldsValue(med);
    setModalOpen(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (editingMed) {
      await updateMedication.mutateAsync({ id: editingMed.id, data: values });
    } else {
      await createMedication.mutateAsync(values);
    }
    setModalOpen(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Generic Name',
      dataIndex: 'genericName',
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: 'Brand Name', dataIndex: 'brandName', render: (v?: string) => v || '—' },
    { title: 'Dosage Form', dataIndex: 'dosageForm', render: (v?: string) => v || '—' },
    { title: 'Strength', dataIndex: 'strength', render: (v?: string) => v || '—' },
    { title: 'Manufacturer', dataIndex: 'manufacturer', render: (v?: string) => v || '—' },
    {
      title: 'Stock',
      key: 'stock',
      render: (_: unknown, row: Medication) => {
        const stock = row.inventoryItems?.[0]?.currentStock;
        if (stock === undefined) return <Tag color="default">—</Tag>;
        return <Tag color={stock <= 10 ? 'red' : stock <= 50 ? 'orange' : 'green'}>{stock} units</Tag>;
      },
    },
    {
      title: 'Flags',
      key: 'flags',
      render: (_: unknown, row: Medication) => (
        <Space>
          {row.isControlled && <Tag color="red">Controlled</Tag>}
          {!row.isActive && <Tag color="default">Inactive</Tag>}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, row: Medication) => (
        <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(row)} />
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Medication Catalog
            {data?.total !== undefined && (
              <Typography.Text type="secondary" style={{ fontSize: 14, marginLeft: 8, fontWeight: 400 }}>
                ({data.total} total)
              </Typography.Text>
            )}
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Medication
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col flex="auto">
            <Input
              placeholder="Search by generic or brand name..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => { setSearch(searchInput); setPage(1); }}
              allowClear
              onClear={() => { setSearch(''); setSearchInput(''); }}
            />
          </Col>
          <Col>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => { setSearch(searchInput); setPage(1); }}>
              Search
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={data?.data || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total || 0,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        }}
      />

      <Modal
        title={editingMed ? 'Edit Medication' : 'Add Medication'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMedication.isPending || updateMedication.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="genericName" label="Generic Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="brandName" label="Brand Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="manufacturer" label="Manufacturer">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dosageForm" label="Dosage Form">
                <Select
                  options={[
                    { value: 'Tablet', label: 'Tablet' },
                    { value: 'Capsule', label: 'Capsule' },
                    { value: 'Syrup', label: 'Syrup' },
                    { value: 'Injection', label: 'Injection' },
                    { value: 'Cream', label: 'Cream' },
                    { value: 'Ointment', label: 'Ointment' },
                    { value: 'Drops', label: 'Drops' },
                    { value: 'Inhaler', label: 'Inhaler' },
                    { value: 'Suppository', label: 'Suppository' },
                    { value: 'Others', label: 'Others' },
                  ]}
                  placeholder="Select form"
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="strength" label="Strength">
                <Input placeholder="e.g. 500mg, 10mg/5mL" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isControlled" valuePropName="checked">
            <Checkbox>Controlled Substance</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MedicationCatalogPage;
