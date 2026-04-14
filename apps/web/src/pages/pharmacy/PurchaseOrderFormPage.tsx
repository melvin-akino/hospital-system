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
  InputNumber,
  Space,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSuppliers, useCreatePurchaseOrder } from '../../hooks/usePharmacy';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface POItem {
  key: string;
  itemName: string;
  quantity: number;
  unitCost: number;
}

const PurchaseOrderFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<POItem[]>([]);
  const [newItem, setNewItem] = useState({ itemName: '', quantity: 1, unitCost: 0 });

  const { data: suppliersData } = useSuppliers();
  const createPO = useCreatePurchaseOrder();

  const suppliers = suppliersData?.data || [];

  const addItem = () => {
    if (!newItem.itemName) return;
    setItems((prev) => [
      ...prev,
      { ...newItem, key: Date.now().toString() },
    ]);
    setNewItem({ itemName: '', quantity: 1, unitCost: 0 });
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (items.length === 0) return;
    await createPO.mutateAsync({ ...values, items });
    navigate('/pharmacy/purchase-orders/new');
    form.resetFields();
    setItems([]);
  };

  const columns = [
    { title: 'Item Name', dataIndex: 'itemName', key: 'itemName' },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Unit Cost (₱)', dataIndex: 'unitCost', key: 'unitCost', render: (v: number) => `₱${v.toFixed(2)}` },
    {
      title: 'Total',
      key: 'total',
      render: (_: unknown, row: POItem) => `₱${(row.quantity * row.unitCost).toFixed(2)}`,
    },
    {
      title: '',
      key: 'remove',
      render: (_: unknown, row: POItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(row.key)}
        />
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/pharmacy/inventory')} style={{ marginRight: 12 }}>
          Back
        </Button>
        <Title level={4} style={{ margin: 0 }}>New Purchase Order</Title>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="PO Details" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item name="supplierId" label="Supplier" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="Select supplier"
                  options={suppliers.map((s: { id: string; name: string }) => ({ value: s.id, label: s.name }))}
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={2} placeholder="Special instructions, delivery notes..." />
              </Form.Item>
            </Form>
          </Card>

          <Card title="Order Items">
            <div style={{ marginBottom: 16, padding: 12, background: '#f9f9f9', borderRadius: 4 }}>
              <Row gutter={8} align="middle">
                <Col flex="auto">
                  <Input
                    placeholder="Item name"
                    value={newItem.itemName}
                    onChange={(e) => setNewItem((p) => ({ ...p, itemName: e.target.value }))}
                    onPressEnter={addItem}
                  />
                </Col>
                <Col span={5}>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    value={newItem.quantity}
                    onChange={(v) => setNewItem((p) => ({ ...p, quantity: v || 1 }))}
                    placeholder="Qty"
                  />
                </Col>
                <Col span={6}>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                    value={newItem.unitCost}
                    onChange={(v) => setNewItem((p) => ({ ...p, unitCost: v || 0 }))}
                    placeholder="Unit Cost"
                    prefix="₱"
                  />
                </Col>
                <Col>
                  <Button icon={<PlusOutlined />} onClick={addItem} type="dashed">
                    Add
                  </Button>
                </Col>
              </Row>
            </div>

            <Table
              dataSource={items}
              columns={columns}
              rowKey="key"
              pagination={false}
              size="small"
              footer={() => (
                <div style={{ textAlign: 'right' }}>
                  <Text strong style={{ fontSize: 16 }}>
                    Total: ₱{totalAmount.toFixed(2)}
                  </Text>
                </div>
              )}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Order Summary" style={{ position: 'sticky', top: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Total Items: </Text>
                <Text strong>{items.length}</Text>
              </div>
              <div>
                <Text type="secondary">Total Quantity: </Text>
                <Text strong>{items.reduce((s, i) => s + i.quantity, 0)}</Text>
              </div>
              <div>
                <Text type="secondary">Total Amount: </Text>
                <Text strong style={{ fontSize: 18 }}>₱{totalAmount.toFixed(2)}</Text>
              </div>
              <Button
                type="primary"
                block
                loading={createPO.isPending}
                disabled={items.length === 0}
                onClick={() => form.submit()}
              >
                Submit Purchase Order
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PurchaseOrderFormPage;
