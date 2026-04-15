import React, { useState } from 'react';
import {
  Card, Row, Col, Typography, Tag, Descriptions, Button, Space, Spin, Alert,
  Table, Modal, Form, InputNumber, Select, Input, Divider, Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined, DollarOutlined, PrinterOutlined,
  CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useBill, useAddPayment, useFinalizeBill, useCancelBill } from '../../hooks/useBilling';
import type { BillItem, Payment } from '../../types';
import { exportBillPDF } from '../../utils/pdfExport';

const { Title, Text } = Typography;

const formatPeso = (v: number) => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const statusColor: Record<string, string> = {
  DRAFT: 'blue', FINALIZED: 'purple', PAID: 'green', PARTIAL: 'orange', CANCELLED: 'red',
};

const BillingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useBill(id || '');
  const { mutate: addPayment, isPending: paying } = useAddPayment();
  const { mutate: finalize, isPending: finalizing } = useFinalizeBill();
  const { mutate: cancel, isPending: cancelling } = useCancelBill();

  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentForm] = Form.useForm();

  if (isLoading) return <div className="page-container"><Spin size="large" /></div>;
  if (error || !data?.data) return <div className="page-container"><Alert type="error" message="Bill not found" /></div>;

  const bill = data.data;

  const handlePayment = (values: Record<string, unknown>) => {
    addPayment(
      { id: bill.id, data: values },
      {
        onSuccess: () => {
          setPaymentModal(false);
          paymentForm.resetFields();
        },
      }
    );
  };

  const itemColumns = [
    { title: 'Description', dataIndex: 'description', render: (v: string) => <Text>{v}</Text> },
    { title: 'Qty', dataIndex: 'quantity', width: 60, align: 'center' as const },
    { title: 'Unit Price', dataIndex: 'unitPrice', render: (v: number) => <Text className="currency">{formatPeso(v)}</Text> },
    {
      title: 'Discount', dataIndex: 'discount',
      render: (v: number) => v > 0 ? <Text type="danger" className="currency">- {formatPeso(v)}</Text> : '—',
    },
    {
      title: 'Total', dataIndex: 'total',
      render: (v: number) => <Text strong className="currency">{formatPeso(v)}</Text>,
    },
  ];

  const paymentColumns = [
    { title: 'Date', dataIndex: 'paidAt', render: (v: string) => dayjs(v).format('MMM D, YYYY h:mm A') },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => <Text className="currency" type="success">{formatPeso(v)}</Text> },
    { title: 'Method', dataIndex: 'method', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Reference', dataIndex: 'referenceNo', render: (v: string) => v || '—' },
    { title: 'Received By', dataIndex: 'receivedBy', render: (v: string) => v || '—' },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/billing')}>Back</Button>
            <Title level={4} style={{ margin: 0 }}>{bill.billNo}</Title>
            <Tag color={statusColor[bill.status] || 'default'} style={{ fontSize: 13 }}>{bill.status}</Tag>
            {bill.orNumber && <Text type="secondary">OR: {bill.orNumber}</Text>}
          </Space>
        </Col>
        <Col>
          <Space>
            {bill.status === 'DRAFT' && (
              <Button icon={<CheckCircleOutlined />} onClick={() => finalize(bill.id)} loading={finalizing}>Finalize</Button>
            )}
            {bill.balance > 0 && bill.status !== 'CANCELLED' && bill.status !== 'DRAFT' && (
              <Button type="primary" icon={<DollarOutlined />} onClick={() => setPaymentModal(true)}>Add Payment</Button>
            )}
            {bill.status === 'FINALIZED' && (
              <Button type="primary" icon={<DollarOutlined />} onClick={() => setPaymentModal(true)}>Add Payment</Button>
            )}
            {bill.status !== 'PAID' && bill.status !== 'CANCELLED' && (
              <Popconfirm title="Cancel this bill?" onConfirm={() => cancel(bill.id)} okText="Cancel Bill" okButtonProps={{ danger: true }}>
                <Button danger icon={<StopOutlined />} loading={cancelling}>Cancel</Button>
              </Popconfirm>
            )}
            <Button
              icon={<PrinterOutlined />}
              onClick={() => exportBillPDF({
                billNo: bill.billNo,
                createdAt: bill.createdAt,
                patient: bill.patient,
                items: bill.items.map((i: BillItem) => ({ serviceName: i.serviceName || i.description || '—', quantity: i.quantity, unitPrice: Number(i.unitPrice), total: Number(i.total) })),
                subtotal: Number(bill.subtotal),
                seniorDiscount: bill.seniorDiscount ? Number(bill.seniorDiscount) : undefined,
                pwdDiscount: bill.pwdDiscount ? Number(bill.pwdDiscount) : undefined,
                philhealthDeduction: bill.philhealthDeduction ? Number(bill.philhealthDeduction) : undefined,
                hmoDeduction: bill.hmoDeduction ? Number(bill.hmoDeduction) : undefined,
                totalAmount: Number(bill.totalAmount),
                amountPaid: Number(bill.amountPaid),
                balance: Number(bill.totalAmount) - Number(bill.amountPaid),
                status: bill.status,
                payments: bill.payments?.map((p: Payment) => ({ method: p.method, amount: Number(p.amount), paidAt: p.paidAt || p.createdAt })),
              })}
            >
              Download PDF
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Patient & Summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="Patient Information">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Name">
                {bill.patient?.lastName}, {bill.patient?.firstName}
              </Descriptions.Item>
              <Descriptions.Item label="Patient No.">{bill.patient?.patientNo}</Descriptions.Item>
              <Descriptions.Item label="PhilHealth">{(bill.patient as { philhealthNo?: string })?.philhealthNo || '—'}</Descriptions.Item>
              <Descriptions.Item label="Date">{dayjs(bill.createdAt).format('MMMM D, YYYY')}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Summary" style={{ height: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row justify="space-between"><Col>Subtotal:</Col><Col><Text className="currency">{formatPeso(Number(bill.subtotal))}</Text></Col></Row>
              {Number(bill.discountAmount) > 0 && (
                <Row justify="space-between">
                  <Col>Discount ({bill.discountType} {bill.discountPercent}%):</Col>
                  <Col><Text type="danger" className="currency">- {formatPeso(Number(bill.discountAmount))}</Text></Col>
                </Row>
              )}
              {Number(bill.philhealthDeduction) > 0 && (
                <Row justify="space-between">
                  <Col>PhilHealth Deduction:</Col>
                  <Col><Text type="danger" className="currency">- {formatPeso(Number(bill.philhealthDeduction))}</Text></Col>
                </Row>
              )}
              {Number(bill.hmoDeduction) > 0 && (
                <Row justify="space-between">
                  <Col>HMO Deduction:</Col>
                  <Col><Text type="danger" className="currency">- {formatPeso(Number(bill.hmoDeduction))}</Text></Col>
                </Row>
              )}
              <Divider style={{ margin: '8px 0' }} />
              <Row justify="space-between">
                <Col><Text strong style={{ fontSize: 16 }}>Total:</Text></Col>
                <Col><Text strong style={{ fontSize: 18, color: '#1890ff' }}>{formatPeso(Number(bill.totalAmount))}</Text></Col>
              </Row>
              <Row justify="space-between">
                <Col>Paid:</Col>
                <Col><Text type="success" className="currency">{formatPeso(Number(bill.paidAmount))}</Text></Col>
              </Row>
              <Row justify="space-between">
                <Col><Text strong>Balance:</Text></Col>
                <Col>
                  <Text strong style={{ color: Number(bill.balance) > 0 ? '#ff4d4f' : '#52c41a', fontSize: 16 }}>
                    {formatPeso(Number(bill.balance))}
                  </Text>
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Line Items */}
      <Card title="Bill Items" style={{ marginBottom: 16 }}>
        <Table
          dataSource={(bill.items || []) as BillItem[]}
          columns={itemColumns}
          rowKey="id"
          pagination={false}
          size="small"
          summary={(rows) => {
            const total = (rows as BillItem[]).reduce((s: number, r: BillItem) => s + Number(r.total), 0);
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><Text strong>Total</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={4}><Text strong className="currency">{formatPeso(total)}</Text></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      {/* Payments */}
      {(bill.payments || []).length > 0 && (
        <Card title="Payment History">
          <Table
            dataSource={(bill.payments || []) as Payment[]}
            columns={paymentColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* Payment Modal */}
      <Modal
        title="Add Payment"
        open={paymentModal}
        onCancel={() => { setPaymentModal(false); paymentForm.resetFields(); }}
        onOk={() => paymentForm.submit()}
        confirmLoading={paying}
        okText="Record Payment"
      >
        <Alert
          message={`Outstanding balance: ${formatPeso(Number(bill.balance))}`}
          type="info"
          style={{ marginBottom: 16 }}
        />
        <Form form={paymentForm} layout="vertical" onFinish={handlePayment}>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }, { type: 'number', min: 0.01 }]}>
            <InputNumber style={{ width: '100%' }} prefix="₱" min={0.01} max={Number(bill.balance)} step={100}
              placeholder={`Max: ${formatPeso(Number(bill.balance))}`} />
          </Form.Item>
          <Form.Item name="method" label="Payment Method" rules={[{ required: true }]}>
            <Select options={['CASH', 'GCASH', 'MAYA', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CHECK', 'HMO', 'PHILHEALTH'].map(v => ({ value: v, label: v.replace('_', ' ') }))} />
          </Form.Item>
          <Form.Item name="referenceNo" label="Reference No.">
            <Input placeholder="Transaction reference" />
          </Form.Item>
          <Form.Item name="receivedBy" label="Received By">
            <Input placeholder="Cashier name" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BillingDetailPage;
