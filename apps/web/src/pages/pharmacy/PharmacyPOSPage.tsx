import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Row, Col, Card, Input, Button, Table, Tag, Typography, Space, Divider,
  InputNumber, Modal, Select, Form, Alert, Badge, Statistic, Tooltip,
  message, Radio, Descriptions, Empty,
} from 'antd';
import {
  SearchOutlined, ShoppingCartOutlined, DeleteOutlined, PrinterOutlined,
  UserOutlined, DollarOutlined, ClearOutlined, CheckCircleOutlined,
  PlusOutlined, MinusOutlined, MedicineBoxOutlined, CreditCardOutlined,
  BankOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useCreateSale, type CartItem } from '../../hooks/usePharmacyPOS';

const { Title, Text } = Typography;

const formatPeso = (v: number) => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const PAYMENT_METHODS = [
  { value: 'CASH',       label: 'Cash',           icon: <DollarOutlined /> },
  { value: 'GCASH',      label: 'GCash',          icon: <MedicineBoxOutlined /> },
  { value: 'CARD',       label: 'Credit/Debit',   icon: <CreditCardOutlined /> },
  { value: 'CHARGE',     label: 'Charge to Bill', icon: <BankOutlined /> },
  { value: 'HMO',        label: 'HMO',            icon: <FileTextOutlined /> },
  { value: 'PHILHEALTH', label: 'PhilHealth',     icon: <FileTextOutlined /> },
];

const PharmacyPOSPage: React.FC = () => {
  const { user } = useAuthStore();
  const createSale = useCreateSale();

  // ── Cart state ─────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const searchRef = useRef<any>(null);

  // ── Patient link ────────────────────────────────────────────────────────
  const [patientSearch, setPatientSearch] = useState('');
  const [linkedPatient, setLinkedPatient] = useState<any>(null);

  // ── Payment modal ────────────────────────────────────────────────────────
  const [payModal, setPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<string>('CASH');
  const [saleType, setSaleType] = useState<string>('CASH');
  const [amountTendered, setAmountTendered] = useState<number | null>(null);
  const [referenceNo, setReferenceNo] = useState('');

  // ── Receipt modal ────────────────────────────────────────────────────────
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptModal, setReceiptModal] = useState(false);

  // ── Inventory search ─────────────────────────────────────────────────────
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['pos-inventory', itemSearch],
    queryFn: () =>
      api.get('/inventory', { params: { search: itemSearch || undefined, limit: 30, isActive: true } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    enabled: itemSearch.length >= 1,
  });

  const { data: patientResults } = useQuery({
    queryKey: ['pos-patient-search', patientSearch],
    queryFn: () =>
      api.get('/patients/search', { params: { q: patientSearch, limit: 8 } })
        .then((r) => r.data?.data || []),
    enabled: patientSearch.length >= 2,
  });

  // ── Cart calculations ────────────────────────────────────────────────────
  const subtotal      = useMemo(() => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0), [cart]);
  const discountTotal = useMemo(() => cart.reduce((s, i) => s + i.discount, 0), [cart]);
  const totalAmount   = useMemo(() => cart.reduce((s, i) => s + i.total, 0), [cart]);
  const change        = amountTendered != null ? Math.max(0, amountTendered - totalAmount) : null;

  // ── Add item to cart ──────────────────────────────────────────────────────
  const addToCart = useCallback((item: any) => {
    if (item.currentStock <= 0) { message.warning(`${item.itemName} is out of stock.`); return; }
    setCart((prev) => {
      const existing = prev.find((c) => c.inventoryItemId === item.id);
      if (existing) {
        if (existing.quantity >= item.currentStock) {
          message.warning(`Only ${item.currentStock} ${item.unit || 'units'} available.`);
          return prev;
        }
        return prev.map((c) =>
          c.inventoryItemId === item.id
            ? { ...c, quantity: c.quantity + 1, total: (c.unitPrice * (c.quantity + 1)) - c.discount }
            : c
        );
      }
      return [...prev, {
        inventoryItemId: item.id,
        itemName:        item.itemName,
        itemCode:        item.itemCode,
        genericName:     item.medication?.genericName,
        unit:            item.unit,
        quantity:        1,
        unitPrice:       Number(item.sellingPrice),
        costAtSale:      Number(item.unitCost),
        discount:        0,
        total:           Number(item.sellingPrice),
        currentStock:    item.currentStock,
      }];
    });
    setItemSearch('');
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const updateQty = (id: string, qty: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.inventoryItemId !== id) return c;
      const newQty = Math.max(1, Math.min(qty, c.currentStock));
      return { ...c, quantity: newQty, total: c.unitPrice * newQty - c.discount };
    }));
  };

  const updateDiscount = (id: string, discount: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.inventoryItemId !== id) return c;
      const disc = Math.max(0, Math.min(discount, c.unitPrice * c.quantity));
      return { ...c, discount: disc, total: c.unitPrice * c.quantity - disc };
    }));
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.inventoryItemId !== id));
  const clearCart  = () => { setCart([]); setLinkedPatient(null); setItemSearch(''); };

  // ── Open payment modal ────────────────────────────────────────────────────
  const openPayment = () => {
    if (cart.length === 0) { message.warning('Cart is empty.'); return; }
    setAmountTendered(null);
    setReferenceNo('');
    setPayMethod('CASH');
    setSaleType('CASH');
    setPayModal(true);
  };

  // ── Process sale ──────────────────────────────────────────────────────────
  const processSale = async () => {
    if (saleType === 'CHARGE_TO_BILL' && !linkedPatient) {
      message.error('Link a patient to charge to their bill.');
      return;
    }
    if (payMethod === 'CASH' && (amountTendered == null || amountTendered < totalAmount)) {
      message.error('Amount tendered must be ≥ total amount.');
      return;
    }

    try {
      const result = await createSale.mutateAsync({
        type:           saleType as any,
        patientId:      linkedPatient?.id,
        paymentMethod:  payMethod as any,
        amountTendered: amountTendered ?? undefined,
        referenceNo:    referenceNo || undefined,
        items: cart.map((c) => ({
          inventoryItemId: c.inventoryItemId,
          quantity:        c.quantity,
          unitPrice:       c.unitPrice,
          discount:        c.discount,
        })),
      });

      setPayModal(false);
      setReceiptData({ ...result, patient: linkedPatient, change: change ?? 0, payMethod, amountTendered });
      setReceiptModal(true);
      clearCart();
      message.success(`Sale ${result.saleNo} completed. GL entries posted.`);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Sale failed. Please try again.');
    }
  };

  // ── Cart table columns ────────────────────────────────────────────────────
  const cartColumns = [
    {
      title: 'Item',
      key: 'item',
      render: (_: any, r: CartItem) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.itemName}</Text>
          {r.genericName && <Text type="secondary" style={{ fontSize: 11 }}>{r.genericName}</Text>}
          <Text type="secondary" style={{ fontSize: 11 }}>{r.itemCode} · {formatPeso(r.unitPrice)}/{r.unit || 'pc'}</Text>
        </Space>
      ),
    },
    {
      title: 'Qty',
      key: 'qty',
      width: 120,
      render: (_: any, r: CartItem) => (
        <Space size={4}>
          <Button size="small" icon={<MinusOutlined />} onClick={() => updateQty(r.inventoryItemId, r.quantity - 1)} disabled={r.quantity <= 1} />
          <InputNumber
            size="small"
            min={1}
            max={r.currentStock}
            value={r.quantity}
            onChange={(v) => v != null && updateQty(r.inventoryItemId, v)}
            style={{ width: 52 }}
            controls={false}
          />
          <Button size="small" icon={<PlusOutlined />} onClick={() => updateQty(r.inventoryItemId, r.quantity + 1)} disabled={r.quantity >= r.currentStock} />
        </Space>
      ),
    },
    {
      title: 'Disc (₱)',
      key: 'discount',
      width: 100,
      render: (_: any, r: CartItem) => (
        <InputNumber
          size="small"
          min={0}
          max={r.unitPrice * r.quantity}
          value={r.discount}
          onChange={(v) => updateDiscount(r.inventoryItemId, v ?? 0)}
          style={{ width: 90 }}
          prefix="₱"
          controls={false}
        />
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 100,
      render: (_: any, r: CartItem) => <Text strong>{formatPeso(r.total)}</Text>,
    },
    {
      title: '',
      key: 'del',
      width: 40,
      render: (_: any, r: CartItem) => (
        <Button size="small" danger icon={<DeleteOutlined />} type="text" onClick={() => removeItem(r.inventoryItemId)} />
      ),
    },
  ];

  // ── Inventory results columns ─────────────────────────────────────────────
  const inventoryColumns = [
    {
      title: 'Item',
      key: 'item',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 12 }}>{r.itemName}</Text>
          {r.medication && <Text type="secondary" style={{ fontSize: 11 }}>{r.medication.genericName}</Text>}
          <Text type="secondary" style={{ fontSize: 11 }}>{r.itemCode}</Text>
        </Space>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'currentStock',
      width: 70,
      render: (v: number, r: any) => (
        <Tag color={v <= r.minimumStock ? 'orange' : 'green'} style={{ fontSize: 11 }}>{v} {r.unit}</Tag>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'sellingPrice',
      width: 80,
      render: (v: number) => <Text strong style={{ color: '#1890ff' }}>{formatPeso(v)}</Text>,
    },
    {
      title: '',
      width: 50,
      render: (_: any, r: any) => (
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          disabled={r.currentStock <= 0}
          onClick={() => addToCart(r)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 16, background: '#f0f2f5', minHeight: '100vh' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space>
            <MedicineBoxOutlined style={{ fontSize: 22, color: '#722ed1' }} />
            <Title level={3} style={{ margin: 0 }}>Pharmacy POS</Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Cashier: <b>{user?.displayName || user?.username}</b>
            </Text>
            <Tag>{dayjs().format('ddd, MMM D YYYY · h:mm A')}</Tag>
          </Space>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* ── Left Panel: Item Search ── */}
        <Col xs={24} lg={14}>
          <Card
            title={<Space><SearchOutlined /><Text strong>Item Search</Text></Space>}
            style={{ marginBottom: 12 }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            <Input
              ref={searchRef}
              prefix={<SearchOutlined />}
              placeholder="Type item name, generic name, or barcode…"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              allowClear
              size="large"
              autoFocus
            />

            {itemSearch.length >= 1 && (
              <Table
                dataSource={inventoryData || []}
                columns={inventoryColumns}
                rowKey="id"
                size="small"
                loading={inventoryLoading}
                pagination={false}
                scroll={{ y: 300 }}
                style={{ marginTop: 8 }}
                onRow={(r) => ({ onDoubleClick: () => addToCart(r), style: { cursor: 'pointer' } })}
                locale={{ emptyText: <Empty description="No items found" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              />
            )}

            {itemSearch.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#bfbfbf' }}>
                <MedicineBoxOutlined style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
                <Text type="secondary">Search or scan item to add to cart</Text>
              </div>
            )}
          </Card>

          {/* Patient Link */}
          <Card
            size="small"
            title={<Space><UserOutlined /><Text strong>Patient Link</Text><Text type="secondary" style={{ fontSize: 11 }}>(optional — required for Charge to Bill)</Text></Space>}
          >
            {linkedPatient ? (
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <Badge status="success" />
                    <Text strong>{linkedPatient.lastName}, {linkedPatient.firstName}</Text>
                    <Tag>{linkedPatient.patientNo}</Tag>
                  </Space>
                </Col>
                <Col>
                  <Button size="small" onClick={() => setLinkedPatient(null)}>Unlink</Button>
                </Col>
              </Row>
            ) : (
              <Select
                showSearch
                value={null}
                placeholder="Search patient by name or patient number…"
                style={{ width: '100%' }}
                filterOption={false}
                onSearch={setPatientSearch}
                onChange={(_, opt: any) => setLinkedPatient(opt?.data)}
                notFoundContent={patientSearch.length < 2 ? 'Type 2+ characters' : 'No patients found'}
                options={(patientResults || []).map((p: any) => ({
                  value: p.id,
                  label: `${p.lastName}, ${p.firstName} — ${p.patientNo}`,
                  data: p,
                }))}
              />
            )}
          </Card>
        </Col>

        {/* ── Right Panel: Cart ── */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <ShoppingCartOutlined style={{ color: '#722ed1' }} />
                    <Text strong>Cart</Text>
                    {cart.length > 0 && <Badge count={cart.length} color="#722ed1" />}
                  </Space>
                </Col>
                <Col>
                  {cart.length > 0 && (
                    <Tooltip title="Clear cart">
                      <Button size="small" icon={<ClearOutlined />} danger onClick={clearCart} />
                    </Tooltip>
                  )}
                </Col>
              </Row>
            }
            style={{ height: '100%' }}
          >
            {cart.length === 0 ? (
              <Empty description="Cart is empty" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '24px 0' }} />
            ) : (
              <>
                <Table
                  dataSource={cart}
                  columns={cartColumns}
                  rowKey="inventoryItemId"
                  size="small"
                  pagination={false}
                  scroll={{ y: 340 }}
                />

                <Divider style={{ margin: '12px 0' }} />

                {/* Totals */}
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                  <Row justify="space-between">
                    <Text type="secondary">Subtotal</Text>
                    <Text>{formatPeso(subtotal)}</Text>
                  </Row>
                  {discountTotal > 0 && (
                    <Row justify="space-between">
                      <Text type="secondary">Discount</Text>
                      <Text type="danger">— {formatPeso(discountTotal)}</Text>
                    </Row>
                  )}
                  <Divider style={{ margin: '4px 0' }} />
                  <Row justify="space-between">
                    <Text strong style={{ fontSize: 18 }}>TOTAL</Text>
                    <Text strong style={{ fontSize: 22, color: '#722ed1' }}>{formatPeso(totalAmount)}</Text>
                  </Row>
                </Space>

                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<DollarOutlined />}
                  style={{ marginTop: 16, height: 52, fontSize: 16, background: '#722ed1', borderColor: '#722ed1' }}
                  onClick={openPayment}
                >
                  Proceed to Payment
                </Button>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Payment Modal ── */}
      <Modal
        title={<Space><DollarOutlined style={{ color: '#722ed1' }} />Payment</Space>}
        open={payModal}
        onCancel={() => setPayModal(false)}
        footer={null}
        width={520}
      >
        <Divider orientation="left" style={{ margin: '8px 0 12px' }}>Sale Type</Divider>
        <Radio.Group
          value={saleType}
          onChange={(e) => { setSaleType(e.target.value); setPayMethod(e.target.value === 'CASH' ? 'CASH' : e.target.value); }}
          style={{ width: '100%', marginBottom: 16 }}
        >
          <Space wrap>
            <Radio.Button value="CASH">💵 Cash / Card</Radio.Button>
            <Radio.Button value="CHARGE_TO_BILL" disabled={!linkedPatient}>🏥 Charge to Bill</Radio.Button>
            <Radio.Button value="HMO">📋 HMO</Radio.Button>
            <Radio.Button value="PHILHEALTH">🇵🇭 PhilHealth</Radio.Button>
          </Space>
        </Radio.Group>

        {saleType === 'CHARGE_TO_BILL' && !linkedPatient && (
          <Alert type="warning" message="Link a patient first to use Charge to Bill." showIcon style={{ marginBottom: 12 }} />
        )}

        {saleType === 'CASH' && (
          <>
            <Divider orientation="left" style={{ margin: '8px 0 12px' }}>Payment Method</Divider>
            <Radio.Group value={payMethod} onChange={(e) => setPayMethod(e.target.value)} style={{ marginBottom: 16 }}>
              <Space>
                <Radio.Button value="CASH">Cash</Radio.Button>
                <Radio.Button value="GCASH">GCash</Radio.Button>
                <Radio.Button value="CARD">Card</Radio.Button>
              </Space>
            </Radio.Group>
          </>
        )}

        {(saleType === 'HMO' || saleType === 'PHILHEALTH') && (
          <Form.Item label="Auth / Reference No." style={{ marginBottom: 12 }}>
            <Input
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="HMO authorization code / PhilHealth reference"
            />
          </Form.Item>
        )}

        <Divider style={{ margin: '8px 0 12px' }} />

        {/* Amount summary */}
        <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Items">{cart.length}</Descriptions.Item>
          <Descriptions.Item label="Subtotal">{formatPeso(subtotal)}</Descriptions.Item>
          {discountTotal > 0 && <Descriptions.Item label="Discount" span={2}>— {formatPeso(discountTotal)}</Descriptions.Item>}
          <Descriptions.Item label="TOTAL" span={2}>
            <Text strong style={{ fontSize: 20, color: '#722ed1' }}>{formatPeso(totalAmount)}</Text>
          </Descriptions.Item>
        </Descriptions>

        {/* Cash tendered */}
        {(saleType === 'CASH' && payMethod === 'CASH') && (
          <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f', marginBottom: 16 }}>
            <Row gutter={12} align="middle">
              <Col span={14}>
                <Text strong>Amount Tendered</Text>
                <InputNumber
                  style={{ width: '100%', marginTop: 4 }}
                  size="large"
                  min={0}
                  precision={2}
                  value={amountTendered}
                  onChange={(v) => setAmountTendered(v)}
                  prefix="₱"
                  autoFocus
                />
                <Space style={{ marginTop: 6 }} wrap>
                  {[50, 100, 200, 500, 1000].map((v) => (
                    <Button key={v} size="small" onClick={() => setAmountTendered(v)}>₱{v}</Button>
                  ))}
                  <Button size="small" onClick={() => setAmountTendered(Math.ceil(totalAmount))}>Exact</Button>
                </Space>
              </Col>
              <Col span={10} style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Change</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: (change ?? 0) >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  {change != null ? formatPeso(change) : '—'}
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {linkedPatient && (
          <Alert
            type="info"
            showIcon
            message={`Patient: ${linkedPatient.lastName}, ${linkedPatient.firstName} (${linkedPatient.patientNo})`}
            style={{ marginBottom: 12 }}
          />
        )}

        <Row gutter={8}>
          <Col span={12}>
            <Button block onClick={() => setPayModal(false)}>Cancel</Button>
          </Col>
          <Col span={12}>
            <Button
              block
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              loading={createSale.isPending}
              onClick={processSale}
              style={{ background: '#722ed1', borderColor: '#722ed1' }}
              disabled={
                (saleType === 'CASH' && payMethod === 'CASH' && (amountTendered == null || amountTendered < totalAmount)) ||
                (saleType === 'CHARGE_TO_BILL' && !linkedPatient)
              }
            >
              Complete Sale
            </Button>
          </Col>
        </Row>
      </Modal>

      {/* ── Receipt Modal ── */}
      <Modal
        title={<Space><PrinterOutlined />Receipt — {receiptData?.saleNo}</Space>}
        open={receiptModal}
        onCancel={() => { setReceiptModal(false); setReceiptData(null); }}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>,
          <Button key="close" type="primary" onClick={() => { setReceiptModal(false); setReceiptData(null); }}>Done</Button>,
        ]}
        width={420}
      >
        {receiptData && (
          <div id="pos-receipt" style={{ fontFamily: 'monospace', fontSize: 13 }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>iHIMS Pharmacy</div>
              <div style={{ fontSize: 11, color: '#666' }}>Official Receipt</div>
              <div style={{ fontSize: 11, color: '#666' }}>{dayjs(receiptData.createdAt).format('MMM D, YYYY h:mm A')}</div>
              <div style={{ fontWeight: 600 }}>OR#: {receiptData.saleNo}</div>
            </div>

            {receiptData.patient && (
              <div style={{ marginBottom: 8, fontSize: 12 }}>
                Patient: <b>{receiptData.patient.lastName}, {receiptData.patient.firstName}</b>
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #ccc' }}>
                  <th style={{ textAlign: 'left', fontWeight: 600, paddingBottom: 4 }}>Item</th>
                  <th style={{ textAlign: 'right', fontWeight: 600 }}>Qty</th>
                  <th style={{ textAlign: 'right', fontWeight: 600 }}>Price</th>
                  <th style={{ textAlign: 'right', fontWeight: 600 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {receiptData.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td style={{ paddingTop: 4 }}>
                      <div>{item.itemName}</div>
                      {item.genericName && <div style={{ fontSize: 10, color: '#888' }}>{item.genericName}</div>}
                      {item.discount > 0 && <div style={{ fontSize: 10, color: '#f5222d' }}>Disc: — {formatPeso(item.discount)}</div>}
                    </td>
                    <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: 4 }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: 4 }}>{formatPeso(item.unitPrice)}</td>
                    <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: 4 }}>{formatPeso(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #ccc', paddingTop: 8 }}>
              {receiptData.discountTotal > 0 && (
                <Row justify="space-between"><Col>Discount</Col><Col>— {formatPeso(receiptData.discountTotal)}</Col></Row>
              )}
              <Row justify="space-between" style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>
                <Col>TOTAL</Col><Col style={{ color: '#722ed1' }}>{formatPeso(receiptData.totalAmount)}</Col>
              </Row>
              <Row justify="space-between" style={{ marginTop: 4 }}>
                <Col>Payment</Col><Col>{receiptData.payMethod?.replace('_', ' ')}</Col>
              </Row>
              {receiptData.amountTendered != null && (
                <>
                  <Row justify="space-between"><Col>Tendered</Col><Col>{formatPeso(receiptData.amountTendered)}</Col></Row>
                  <Row justify="space-between"><Col>Change</Col><Col>{formatPeso(receiptData.change ?? 0)}</Col></Row>
                </>
              )}
            </div>

            <div style={{ textAlign: 'center', borderTop: '1px dashed #ccc', marginTop: 8, paddingTop: 8, fontSize: 11, color: '#888' }}>
              Cashier: {receiptData.cashierName}<br />
              GL entries auto-posted ✓<br />
              Thank you!
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PharmacyPOSPage;
