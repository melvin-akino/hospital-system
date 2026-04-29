import React, { useState } from 'react';
import {
  Card, Table, Button, Space, Tag, Typography, Row, Col, Statistic,
  DatePicker, Select, Tabs, Modal, Form, Input, Descriptions, Divider,
  Alert, Badge, Progress, message, Popconfirm,
} from 'antd';
import {
  DollarOutlined, BarChartOutlined, PrinterOutlined, StopOutlined,
  CheckCircleOutlined, FileTextOutlined, ArrowUpOutlined, ArrowDownOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePharmacySales, useZReport, useVoidSale } from '../../hooks/usePharmacyPOS';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const formatPeso = (v: number | string) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const SALE_TYPE_COLOR: Record<string, string> = {
  CASH: 'green', CHARGE_TO_BILL: 'blue', HMO: 'purple', PHILHEALTH: 'cyan',
};
const PAY_METHOD_COLOR: Record<string, string> = {
  CASH: 'green', GCASH: 'blue', CARD: 'geekblue', CHARGE: 'orange', HMO: 'purple', PHILHEALTH: 'cyan',
};
const STATUS_COLOR: Record<string, string> = { COMPLETED: 'success', VOIDED: 'error' };

const PharmacySalesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'BILLING_SUPERVISOR';

  const [page, setPage]         = useState(1);
  const [statusFilter, setStatus] = useState<string | undefined>();
  const [typeFilter, setType]   = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [zReportDate, setZDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

  const [detailSale, setDetailSale]     = useState<any>(null);
  const [detailModal, setDetailModal]   = useState(false);
  const [voidModal, setVoidModal]       = useState<any>(null);
  const [voidReason, setVoidReason]     = useState('');

  const { data: salesData, isLoading, refetch } = usePharmacySales({
    page,
    limit: 20,
    status:   statusFilter,
    type:     typeFilter,
    dateFrom: dateRange?.[0],
    dateTo:   dateRange?.[1],
  });

  const { data: zReport, isLoading: zLoading, refetch: refetchZ } = useZReport(zReportDate);
  const voidSale = useVoidSale();

  const sales  = salesData?.data  ?? [];
  const total  = salesData?.total ?? 0;

  const openDetail = (sale: any) => { setDetailSale(sale); setDetailModal(true); };

  const handleVoid = async () => {
    if (!voidModal || !voidReason.trim()) { message.warning('Please enter a void reason.'); return; }
    try {
      await voidSale.mutateAsync({ id: voidModal.id, voidReason });
      message.success(`Sale ${voidModal.saleNo} voided. GL reversals posted.`);
      setVoidModal(null);
      setVoidReason('');
      refetch();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Void failed.');
    }
  };

  const columns = [
    {
      title: 'Sale No.',
      dataIndex: 'saleNo',
      width: 165,
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: 'Date / Time',
      dataIndex: 'createdAt',
      width: 140,
      render: (v: string) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{dayjs(v).format('MMM D, YYYY')}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).format('h:mm A')}</Text>
        </Space>
      ),
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: any, r: any) => r.patient
        ? <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12 }}>{r.patient.lastName}, {r.patient.firstName}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.patient.patientNo}</Text>
          </Space>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 120,
      render: (v: string) => <Tag color={SALE_TYPE_COLOR[v] || 'default'} style={{ fontSize: 11 }}>{v.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Payment',
      dataIndex: 'paymentMethod',
      width: 100,
      render: (v: string) => <Tag color={PAY_METHOD_COLOR[v] || 'default'} style={{ fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: 'Items',
      key: 'items',
      width: 60,
      render: (_: any, r: any) => <Badge count={r.items?.length ?? 0} color="#722ed1" />,
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      width: 110,
      render: (v: number) => <Text strong>{formatPeso(v)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => <Badge status={STATUS_COLOR[v] as any} text={<Tag color={v === 'VOIDED' ? 'red' : 'green'} style={{ fontSize: 11 }}>{v}</Tag>} />,
    },
    {
      title: 'Cashier',
      dataIndex: 'cashierName',
      width: 120,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button size="small" icon={<FileTextOutlined />} onClick={() => openDetail(r)}>Detail</Button>
          {isAdmin && r.status === 'COMPLETED' && (
            <Button size="small" danger icon={<StopOutlined />} onClick={() => { setVoidModal(r); setVoidReason(''); }}>Void</Button>
          )}
        </Space>
      ),
    },
  ];

  const zData = zReport;

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <DollarOutlined style={{ color: '#722ed1' }} /> Pharmacy Sales
          </Title>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="sales"
        items={[
          {
            key: 'sales',
            label: <Space><FileTextOutlined />Sales History</Space>,
            children: (
              <>
                {/* Filters */}
                <Card style={{ marginBottom: 16 }}>
                  <Row gutter={12} wrap>
                    <Col xs={24} sm={10}>
                      <RangePicker
                        style={{ width: '100%' }}
                        onChange={(_, s) => setDateRange(s[0] && s[1] ? [s[0], s[1]] : null)}
                        placeholder={['From date', 'To date']}
                      />
                    </Col>
                    <Col xs={12} sm={5}>
                      <Select placeholder="Status" style={{ width: '100%' }} allowClear value={statusFilter} onChange={setStatus}>
                        <Select.Option value="COMPLETED">Completed</Select.Option>
                        <Select.Option value="VOIDED">Voided</Select.Option>
                      </Select>
                    </Col>
                    <Col xs={12} sm={5}>
                      <Select placeholder="Type" style={{ width: '100%' }} allowClear value={typeFilter} onChange={setType}>
                        <Select.Option value="CASH">Cash</Select.Option>
                        <Select.Option value="CHARGE_TO_BILL">Charge to Bill</Select.Option>
                        <Select.Option value="HMO">HMO</Select.Option>
                        <Select.Option value="PHILHEALTH">PhilHealth</Select.Option>
                      </Select>
                    </Col>
                  </Row>
                </Card>

                <Table
                  dataSource={sales}
                  columns={columns}
                  rowKey="id"
                  loading={isLoading}
                  size="small"
                  pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (t) => `${t} transactions` }}
                  rowClassName={(r) => r.status === 'VOIDED' ? 'ant-table-row-selected' : ''}
                />
              </>
            ),
          },
          {
            key: 'zreport',
            label: <Space><BarChartOutlined />Z-Report</Space>,
            children: (
              <>
                <Row gutter={12} align="middle" style={{ marginBottom: 16 }}>
                  <Col>
                    <DatePicker
                      value={dayjs(zReportDate)}
                      onChange={(d) => d && setZDate(d.format('YYYY-MM-DD'))}
                      allowClear={false}
                    />
                  </Col>
                  <Col>
                    <Button icon={<ReloadOutlined />} onClick={() => refetchZ()}>Refresh</Button>
                  </Col>
                  <Col>
                    <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print Z-Report</Button>
                  </Col>
                </Row>

                {zData ? (
                  <>
                    {/* Summary stats */}
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col xs={12} sm={6}>
                        <Card><Statistic title="Transactions" value={zData.totalTransactions} valueStyle={{ color: '#722ed1' }} /></Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card>
                          <Statistic title="Gross Sales" value={formatPeso(zData.totalSales)} valueStyle={{ color: '#52c41a', fontSize: 18 }} />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card>
                          <Statistic
                            title="COGS"
                            value={formatPeso(zData.totalCOGS)}
                            prefix={<ArrowDownOutlined />}
                            valueStyle={{ color: '#cf1322', fontSize: 18 }}
                          />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card>
                          <Statistic
                            title="Gross Profit"
                            value={formatPeso(zData.grossProfit)}
                            prefix={<ArrowUpOutlined />}
                            valueStyle={{ color: '#1890ff', fontSize: 18 }}
                          />
                          <Progress
                            percent={Math.round(zData.grossMarginPct)}
                            size="small"
                            strokeColor={zData.grossMarginPct >= 30 ? '#52c41a' : '#fa8c16'}
                            format={(p) => `${p}% margin`}
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      {/* Payment breakdown */}
                      <Col xs={24} md={10}>
                        <Card title="Breakdown by Payment Type" size="small">
                          {Object.entries(zData.byPaymentType || {}).map(([method, d]: [string, any]) => (
                            <Row key={method} justify="space-between" style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <Col>
                                <Tag color={PAY_METHOD_COLOR[method] || 'default'}>{method}</Tag>
                                <Text type="secondary" style={{ fontSize: 12 }}>{d.count} transactions</Text>
                              </Col>
                              <Col><Text strong>{formatPeso(d.amount)}</Text></Col>
                            </Row>
                          ))}
                          {zData.totalDiscounts > 0 && (
                            <Row justify="space-between" style={{ paddingTop: 8, marginTop: 4, borderTop: '1px solid #d9d9d9' }}>
                              <Col><Text type="secondary">Total Discounts Given</Text></Col>
                              <Col><Text type="danger">— {formatPeso(zData.totalDiscounts)}</Text></Col>
                            </Row>
                          )}
                        </Card>
                      </Col>

                      {/* Top items */}
                      <Col xs={24} md={14}>
                        <Card title="Top 10 Items by Revenue" size="small">
                          <Table
                            dataSource={zData.topItems || []}
                            rowKey="name"
                            size="small"
                            pagination={false}
                            columns={[
                              { title: 'Item', dataIndex: 'name', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                              { title: 'Qty Sold', dataIndex: 'qty', width: 80, align: 'center' as const },
                              { title: 'Revenue', dataIndex: 'revenue', width: 110, render: (v: number) => <Text strong>{formatPeso(v)}</Text> },
                            ]}
                          />
                        </Card>
                      </Col>
                    </Row>

                    {/* Hourly breakdown */}
                    <Card title="Hourly Sales" size="small" style={{ marginTop: 16 }}>
                      <Row gutter={4}>
                        {zData.hourlyBreakdown?.map((amt: number, h: number) => (
                          <Col key={h} style={{ textAlign: 'center', minWidth: 38 }}>
                            <div style={{
                              height: 60,
                              background: amt > 0 ? '#722ed1' : '#f0f0f0',
                              borderRadius: 4,
                              opacity: amt > 0 ? Math.min(1, 0.3 + (amt / (Math.max(...zData.hourlyBreakdown) || 1)) * 0.7) : 1,
                              marginBottom: 2,
                            }} />
                            <Text style={{ fontSize: 9, color: '#666' }}>{h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}</Text>
                          </Col>
                        ))}
                      </Row>
                    </Card>

                    <Alert
                      type="info"
                      showIcon
                      message={`All ${zData.totalTransactions} transaction(s) on ${dayjs(zReportDate).format('MMMM D, YYYY')} have been automatically posted to the General Ledger. Check the Income Statement and Trial Balance for real-time accounting data.`}
                      style={{ marginTop: 16 }}
                    />
                  </>
                ) : (
                  <Card loading={zLoading} />
                )}
              </>
            ),
          },
        ]}
      />

      {/* Sale Detail Modal */}
      <Modal
        title={<Space><FileTextOutlined />Sale Detail — {detailSale?.saleNo}</Space>}
        open={detailModal}
        onCancel={() => { setDetailModal(false); setDetailSale(null); }}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>,
          <Button key="close" type="primary" onClick={() => setDetailModal(false)}>Close</Button>,
        ]}
        width={560}
      >
        {detailSale && (
          <>
            <Descriptions size="small" bordered column={2} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Sale No." span={2}><Text code>{detailSale.saleNo}</Text></Descriptions.Item>
              <Descriptions.Item label="Date">{dayjs(detailSale.createdAt).format('MMM D, YYYY h:mm A')}</Descriptions.Item>
              <Descriptions.Item label="Cashier">{detailSale.cashierName}</Descriptions.Item>
              <Descriptions.Item label="Type"><Tag color={SALE_TYPE_COLOR[detailSale.type]}>{detailSale.type.replace('_', ' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="Payment"><Tag color={PAY_METHOD_COLOR[detailSale.paymentMethod]}>{detailSale.paymentMethod}</Tag></Descriptions.Item>
              {detailSale.patient && (
                <Descriptions.Item label="Patient" span={2}>
                  {detailSale.patient.lastName}, {detailSale.patient.firstName} — {detailSale.patient.patientNo}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Status" span={2}>
                <Badge status={detailSale.status === 'COMPLETED' ? 'success' : 'error'} text={detailSale.status} />
                {detailSale.status === 'VOIDED' && detailSale.voidReason && (
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>— {detailSale.voidReason}</Text>
                )}
              </Descriptions.Item>
              {detailSale.referenceNo && (
                <Descriptions.Item label="Ref No." span={2}>{detailSale.referenceNo}</Descriptions.Item>
              )}
            </Descriptions>

            <Divider orientation="left" style={{ margin: '8px 0 12px' }}>Items</Divider>
            <Table
              dataSource={detailSale.items || []}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: 'Item', key: 'item',
                  render: (_: any, r: any) => (
                    <Space direction="vertical" size={0}>
                      <Text style={{ fontSize: 12 }}>{r.itemName}</Text>
                      {r.genericName && <Text type="secondary" style={{ fontSize: 11 }}>{r.genericName}</Text>}
                    </Space>
                  ),
                },
                { title: 'Qty', dataIndex: 'quantity', width: 50, align: 'center' as const },
                { title: 'Price', dataIndex: 'unitPrice', width: 90, render: (v: number) => formatPeso(v) },
                { title: 'Disc', dataIndex: 'discount', width: 80, render: (v: number) => v > 0 ? <Text type="danger">— {formatPeso(v)}</Text> : '—' },
                { title: 'Total', dataIndex: 'total', width: 100, render: (v: number) => <Text strong>{formatPeso(v)}</Text> },
              ]}
            />

            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={8}>
              {detailSale.discountTotal > 0 && (
                <Col span={24}><Row justify="space-between"><Text type="secondary">Discount</Text><Text type="danger">— {formatPeso(detailSale.discountTotal)}</Text></Row></Col>
              )}
              <Col span={24}>
                <Row justify="space-between" style={{ fontSize: 16, fontWeight: 700 }}>
                  <Text strong>Total</Text>
                  <Text strong style={{ color: '#722ed1' }}>{formatPeso(detailSale.totalAmount)}</Text>
                </Row>
              </Col>
              {detailSale.amountTendered != null && (
                <>
                  <Col span={24}><Row justify="space-between"><Text type="secondary">Tendered</Text><Text>{formatPeso(detailSale.amountTendered)}</Text></Row></Col>
                  <Col span={24}><Row justify="space-between"><Text type="secondary">Change</Text><Text>{formatPeso(detailSale.changeGiven ?? 0)}</Text></Row></Col>
                </>
              )}
            </Row>

            {detailSale.glPosted && (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message="GL entries auto-posted to General Ledger"
                style={{ marginTop: 12, fontSize: 12 }}
              />
            )}
          </>
        )}
      </Modal>

      {/* Void Modal */}
      <Modal
        title={<Space><StopOutlined style={{ color: '#ff4d4f' }} />Void Sale — {voidModal?.saleNo}</Space>}
        open={!!voidModal}
        onCancel={() => { setVoidModal(null); setVoidReason(''); }}
        onOk={handleVoid}
        confirmLoading={voidSale.isPending}
        okText="Confirm Void"
        okButtonProps={{ danger: true }}
      >
        <Alert
          type="warning"
          showIcon
          message="Voiding this sale will restore inventory stock and post reversing GL entries. This action cannot be undone."
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical">
          <Form.Item label="Void Reason" required>
            <Input.TextArea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for voiding this sale…"
            />
          </Form.Item>
        </Form>
        {voidModal && (
          <Descriptions size="small">
            <Descriptions.Item label="Amount" span={3}>
              <Text strong style={{ color: '#ff4d4f' }}>{formatPeso(voidModal.totalAmount)}</Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default PharmacySalesPage;
