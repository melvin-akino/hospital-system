import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Button, InputNumber, Space, Radio, Descriptions,
  Alert, Spin, Tag, Divider,
} from 'antd';
import {
  CreditCardOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBill } from '../../hooks/useBilling';
import {
  useInitiateGcash, useInitiateMaya, useInitiateCard,
  useSimulateConfirm, usePaymentStatus,
} from '../../hooks/useOnlinePayments';
import type { PaymentIntent } from '../../services/onlinePaymentService';

const { Title, Text } = Typography;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

type PayMethod = 'GCASH' | 'MAYA' | 'CREDIT_CARD' | 'DEBIT_CARD';

const PaymentStatusCard: React.FC<{ intentId: string; onRetry: () => void }> = ({
  intentId,
  onRetry,
}) => {
  const { data: intent, isLoading } = usePaymentStatus(intentId);
  const simulateConfirm = useSimulateConfirm();

  if (isLoading) return <Spin />;
  if (!intent) return null;

  const statusConfig = {
    PAID: { color: '#52c41a', icon: <CheckCircleOutlined />, text: 'Payment Successful' },
    FAILED: { color: '#ff4d4f', icon: <CloseCircleOutlined />, text: 'Payment Failed' },
    PENDING: { color: '#faad14', icon: <ClockCircleOutlined />, text: 'Waiting for Payment' },
    CANCELLED: { color: '#d9d9d9', icon: <CloseCircleOutlined />, text: 'Payment Cancelled' },
  };
  const cfg = statusConfig[intent.status];

  const methodColors: Record<string, string> = {
    GCASH: '#0066CC',
    MAYA: '#00C46E',
    CREDIT_CARD: '#722ed1',
    DEBIT_CARD: '#1890ff',
  };
  const methodColor = methodColors[intent.method] || '#1890ff';

  return (
    <Card style={{ marginTop: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: cfg.color,
            color: '#fff',
            fontSize: 36,
            marginBottom: 12,
          }}
        >
          {cfg.icon}
        </div>
        <div>
          <Title level={4} style={{ margin: 0, color: cfg.color }}>
            {cfg.text}
          </Title>
        </div>
      </div>

      {intent.status === 'PENDING' && (
        <>
          {/* Simulated QR code placeholder */}
          <div
            style={{
              width: 160,
              height: 160,
              background: methodColor,
              margin: '0 auto 16px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>QR</div>
            <div>{intent.method}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Scan to Pay</div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Spin size="small" style={{ marginRight: 8 }} />
            <Text type="secondary">Polling for payment status...</Text>
          </div>
        </>
      )}

      <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
        <Descriptions.Item label="Payment Intent ID">{intent.intentId}</Descriptions.Item>
        <Descriptions.Item label="Amount">{formatPeso(intent.amount)}</Descriptions.Item>
        <Descriptions.Item label="Method">
          <Tag color={methodColor} style={{ color: '#fff' }}>{intent.method}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={cfg.color}>{intent.status}</Tag>
        </Descriptions.Item>
        {intent.paidAt && (
          <Descriptions.Item label="Paid At">
            {new Date(intent.paidAt).toLocaleString('en-PH')}
          </Descriptions.Item>
        )}
      </Descriptions>

      {intent.status === 'PENDING' && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button
            type="primary"
            size="large"
            onClick={() => simulateConfirm.mutate(intent.intentId)}
            loading={simulateConfirm.isPending}
            style={{ background: methodColor, borderColor: methodColor }}
          >
            Simulate Payment Confirmation (Demo)
          </Button>
        </div>
      )}

      {intent.status === 'FAILED' && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button icon={<ReloadOutlined />} onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}

      {intent.status === 'PAID' && (
        <Alert
          type="success"
          message="Payment received and bill updated"
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

const OnlinePaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const billId = searchParams.get('billId') || '';

  const { data: billData } = useBill(billId);
  const bill = (billData as { data?: Record<string, unknown> })?.data as Record<string, unknown> | undefined;

  const [method, setMethod] = useState<PayMethod>('GCASH');
  const [amount, setAmount] = useState<number>(0);
  const [initiated, setInitiated] = useState<PaymentIntent | null>(null);

  const initiateGcash = useInitiateGcash();
  const initiateMaya = useInitiateMaya();
  const initiateCard = useInitiateCard();

  useEffect(() => {
    if (bill) {
      setAmount(bill.balance || bill.totalAmount);
    }
  }, [bill]);

  if (!billId) {
    return (
      <div className="page-container">
        <Alert type="error" message="No bill ID specified. Go back and select a bill." />
        <Button style={{ marginTop: 16 }} onClick={() => navigate('/billing')}>
          Back to Billing
        </Button>
      </div>
    );
  }

  if (!bill) return <div className="page-container"><Spin /></div>;

  const handleProceed = async () => {
    const payload = { billId, amount, description: `Payment for Bill ${bill.billNo}` };
    let result: PaymentIntent;
    if (method === 'GCASH') result = await initiateGcash.mutateAsync(payload);
    else if (method === 'MAYA') result = await initiateMaya.mutateAsync(payload);
    else result = await initiateCard.mutateAsync({ ...payload, cardType: method === 'CREDIT_CARD' ? 'credit' : 'debit' });
    setInitiated(result);
  };

  const isPending = initiateGcash.isPending || initiateMaya.isPending || initiateCard.isPending;

  const methodOptions = [
    {
      value: 'GCASH',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, background: '#0066CC', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11 }}>
            GCash
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>GCash</div>
            <div style={{ fontSize: 12, color: '#888' }}>Pay via GCash e-wallet</div>
          </div>
        </div>
      ),
    },
    {
      value: 'MAYA',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, background: '#00C46E', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11 }}>
            Maya
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Maya</div>
            <div style={{ fontSize: 12, color: '#888' }}>Pay via Maya e-wallet</div>
          </div>
        </div>
      ),
    },
    {
      value: 'CREDIT_CARD',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, background: '#722ed1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
            <CreditCardOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Credit Card</div>
            <div style={{ fontSize: 12, color: '#888' }}>Visa / Mastercard</div>
          </div>
        </div>
      ),
    },
    {
      value: 'DEBIT_CARD',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, background: '#1890ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
            <CreditCardOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Debit Card</div>
            <div style={{ fontSize: 12, color: '#888' }}>Bank debit card</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/billing/${billId}`)}>
          Back to Bill
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          Online Payment
        </Title>
      </Space>

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Card title="Bill Summary" style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Bill No.">{bill.billNo}</Descriptions.Item>
              <Descriptions.Item label="Patient">
                {bill.patient
                  ? `${bill.patient.firstName} ${bill.patient.lastName}`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                {formatPeso(bill.totalAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Amount Paid">
                {formatPeso(bill.paidAmount || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="Balance Due">
                <Text strong style={{ color: bill.balance > 0 ? '#ff4d4f' : '#52c41a' }}>
                  {formatPeso(bill.balance || 0)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={{ PAID: 'green', PARTIAL: 'orange', DRAFT: 'blue', CANCELLED: 'red' }[bill.status as string] || 'default'}
                >
                  {bill.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {!initiated && (
            <Card title="Select Payment Method">
              <Radio.Group
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {methodOptions.map((opt) => (
                    <Radio
                      key={opt.value}
                      value={opt.value}
                      style={{
                        border: `2px solid ${method === opt.value ? '#1890ff' : '#d9d9d9'}`,
                        borderRadius: 8,
                        padding: '12px 16px',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {opt.label}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>

              <Divider />

              <div style={{ marginBottom: 16 }}>
                <Text>Payment Amount (₱)</Text>
                <InputNumber
                  value={amount}
                  onChange={(v) => setAmount(v || 0)}
                  min={1}
                  max={bill.balance || bill.totalAmount}
                  style={{ width: '100%', marginTop: 8 }}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => parseFloat((v || '0').replace(/,/g, '')) as number}
                  size="large"
                  prefix="₱"
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Balance due: {formatPeso(bill.balance || 0)}
                </Text>
              </div>

              <Button
                type="primary"
                size="large"
                block
                onClick={handleProceed}
                loading={isPending}
                disabled={amount <= 0}
              >
                Proceed to Pay {amount > 0 ? formatPeso(amount) : ''}
              </Button>
            </Card>
          )}
        </Col>

        <Col xs={24} md={12}>
          {initiated && (
            <PaymentStatusCard
              intentId={initiated.intentId}
              onRetry={() => setInitiated(null)}
            />
          )}
        </Col>
      </Row>
    </div>
  );
};

export default OnlinePaymentPage;
