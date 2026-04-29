import React from 'react';
import { Spin, Alert, Button, Space, Divider, Row, Col, Table, Tag } from 'antd';
import { PrinterOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useBill } from '../../hooks/useBilling';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useBrandingStore } from '../../store/brandingStore';

const formatPeso = (v: number | string) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CATEGORY_ORDER: Record<string, number> = {
  ROOM: 0, PROFESSIONAL_FEE: 1, PROCEDURE: 2, LAB: 3, RADIOLOGY: 4,
  PHARMACY: 5, OR: 6, SUPPLY: 7, OTHER: 8,
};

const CATEGORY_LABELS: Record<string, string> = {
  ROOM: 'Room Accommodation',
  PROFESSIONAL_FEE: 'Professional Fees',
  PROCEDURE: 'Procedures / Services',
  LAB: 'Laboratory',
  RADIOLOGY: 'Radiology / Imaging',
  PHARMACY: 'Pharmacy / Medicines',
  OR: 'Operating Room',
  SUPPLY: 'Supplies & Materials',
  OTHER: 'Other Charges',
};

const BillingSOAPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hospitalName, tagline } = useBrandingStore();

  const { data, isLoading, error } = useBill(id || '');
  const bill = data?.data;

  // Try to get admission for extra SOA context
  const { data: admissionData } = useQuery({
    queryKey: ['bill-admission', bill?.admissionId],
    queryFn: () => api.get(`/admissions/${bill!.admissionId}`).then((r) => r.data?.data),
    enabled: !!bill?.admissionId,
  });
  const admission = admissionData;

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>;
  if (error || !bill) return <div style={{ padding: 40 }}><Alert type="error" message="Bill not found" /></div>;

  // Group items by category
  const groupedItems: Record<string, any[]> = {};
  (bill.items || []).forEach((item: any) => {
    const cat = item.category || 'OTHER';
    if (!groupedItems[cat]) groupedItems[cat] = [];
    groupedItems[cat].push(item);
  });

  const sortedCategories = Object.keys(groupedItems).sort(
    (a, b) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99)
  );

  const payments = bill.payments || [];
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);

  const printSOA = () => window.print();

  const STATUS_COLOR: Record<string, string> = {
    DRAFT: '#1890ff', FINALIZED: '#722ed1', PAID: '#52c41a', PARTIAL: '#fa8c16', CANCELLED: '#ff4d4f',
  };

  return (
    <div>
      {/* Screen-only controls */}
      <div className="no-print" style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/billing/${id}`)}>Back to Bill</Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={printSOA}>Print / Save PDF</Button>
        </Space>
      </div>

      {/* SOA Document */}
      <div className="soa-document" style={{ maxWidth: 794, margin: '0 auto', padding: '32px 40px', background: '#fff', fontFamily: 'Arial, sans-serif' }}>

        {/* Hospital Header */}
        <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: '2px solid #1890ff', paddingBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1890ff', letterSpacing: 1 }}>
            {hospitalName || 'Hospital Information Management System'}
          </div>
          {tagline && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{tagline}</div>}
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12, letterSpacing: 2, color: '#333' }}>
            STATEMENT OF ACCOUNT
          </div>
        </div>

        {/* Bill Info + Patient Info */}
        <Row gutter={24} style={{ marginBottom: 20 }}>
          <Col span={14}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                <tr>
                  <td style={{ color: '#666', width: 140, paddingBottom: 4 }}>Patient Name:</td>
                  <td style={{ fontWeight: 700, fontSize: 14 }}>
                    {bill.patient?.lastName}, {bill.patient?.firstName} {bill.patient?.middleName || ''}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#666', paddingBottom: 4 }}>Patient No.:</td>
                  <td>{bill.patient?.patientNo}</td>
                </tr>
                {bill.patient?.dateOfBirth && (
                  <tr>
                    <td style={{ color: '#666', paddingBottom: 4 }}>Date of Birth:</td>
                    <td>{dayjs(bill.patient.dateOfBirth).format('MMMM D, YYYY')}</td>
                  </tr>
                )}
                {admission && (
                  <>
                    <tr>
                      <td style={{ color: '#666', paddingBottom: 4 }}>Admission No.:</td>
                      <td>{admission.admissionNo}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#666', paddingBottom: 4 }}>Attending Physician:</td>
                      <td>{admission.attendingDoctor || '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#666', paddingBottom: 4 }}>Admitted:</td>
                      <td>{dayjs(admission.admittedAt).format('MMMM D, YYYY')}</td>
                    </tr>
                    {admission.dischargedAt && (
                      <tr>
                        <td style={{ color: '#666', paddingBottom: 4 }}>Discharged:</td>
                        <td>{dayjs(admission.dischargedAt).format('MMMM D, YYYY')}</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </Col>
          <Col span={10}>
            <div style={{
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              padding: 12,
              background: '#fafafa',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#666', fontSize: 12 }}>Bill No.:</span>
                <span style={{ fontWeight: 700, color: '#1890ff' }}>{bill.billNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#666', fontSize: 12 }}>Date Issued:</span>
                <span style={{ fontSize: 12 }}>{dayjs(bill.createdAt).format('MMMM D, YYYY')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#666', fontSize: 12 }}>Status:</span>
                <span style={{ fontWeight: 700, color: STATUS_COLOR[bill.status] || '#333' }}>{bill.status}</span>
              </div>
              {bill.orNumber && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#666', fontSize: 12 }}>OR Number:</span>
                  <span style={{ fontSize: 12 }}>{bill.orNumber}</span>
                </div>
              )}
              {/* Coverage */}
              {(admission?.hmoName || admission?.philhealthNumber) && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  {admission?.hmoName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#666', fontSize: 12 }}>HMO:</span>
                      <span style={{ fontSize: 12 }}>{admission.hmoName}</span>
                    </div>
                  )}
                  {admission?.philhealthNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#666', fontSize: 12 }}>PhilHealth No.:</span>
                      <span style={{ fontSize: 12 }}>{admission.philhealthNumber}</span>
                    </div>
                  )}
                  {admission?.discountType && admission.discountType !== 'NONE' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#666', fontSize: 12 }}>Discount:</span>
                      <span style={{ fontSize: 12 }}>{admission.discountType}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </Col>
        </Row>

        {/* Bill Items grouped by category */}
        <div style={{ marginBottom: 20 }}>
          {sortedCategories.map((cat) => {
            const items = groupedItems[cat];
            const catTotal = items.reduce((s: number, i: any) => s + Number(i.total), 0);
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                {/* Category header */}
                <div style={{
                  background: '#f0f5ff',
                  padding: '6px 12px',
                  fontWeight: 700,
                  fontSize: 12,
                  color: '#1890ff',
                  borderLeft: '3px solid #1890ff',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span>{CATEGORY_LABELS[cat] || cat}</span>
                  <span>{formatPeso(catTotal)}</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                      <th style={{ padding: '4px 12px', textAlign: 'left', color: '#666', fontWeight: 400 }}>Description</th>
                      <th style={{ padding: '4px 8px', textAlign: 'center', color: '#666', fontWeight: 400, width: 50 }}>Qty</th>
                      <th style={{ padding: '4px 8px', textAlign: 'right', color: '#666', fontWeight: 400, width: 100 }}>Unit Price</th>
                      <th style={{ padding: '4px 8px', textAlign: 'right', color: '#666', fontWeight: 400, width: 80 }}>Discount</th>
                      <th style={{ padding: '4px 12px', textAlign: 'right', color: '#666', fontWeight: 400, width: 110 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                        <td style={{ padding: '5px 12px' }}>{item.description || item.serviceName || '—'}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>{item.quantity || 1}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>{formatPeso(item.unitPrice)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#ff4d4f' }}>
                          {Number(item.discount) > 0 ? `- ${formatPeso(item.discount)}` : '—'}
                        </td>
                        <td style={{ padding: '5px 12px', textAlign: 'right', fontWeight: 500 }}>{formatPeso(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div style={{ borderTop: '2px solid #1890ff', paddingTop: 12, marginBottom: 20 }}>
          <table style={{ width: '100%', fontSize: 12 }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 0', color: '#666' }}>Subtotal:</td>
                <td style={{ textAlign: 'right', padding: '3px 0' }}>{formatPeso(Number(bill.subtotal))}</td>
              </tr>
              {Number(bill.discountAmount) > 0 && (
                <tr>
                  <td style={{ padding: '3px 0', color: '#666' }}>
                    {bill.discountType && bill.discountType !== 'NONE' ? `${bill.discountType} Discount (${bill.discountPercent}%)` : 'Discount'}:
                  </td>
                  <td style={{ textAlign: 'right', padding: '3px 0', color: '#ff4d4f' }}>- {formatPeso(Number(bill.discountAmount))}</td>
                </tr>
              )}
              {Number(bill.philhealthDeduction) > 0 && (
                <tr>
                  <td style={{ padding: '3px 0', color: '#666' }}>PhilHealth Deduction:</td>
                  <td style={{ textAlign: 'right', padding: '3px 0', color: '#ff4d4f' }}>- {formatPeso(Number(bill.philhealthDeduction))}</td>
                </tr>
              )}
              {Number(bill.hmoDeduction) > 0 && (
                <tr>
                  <td style={{ padding: '3px 0', color: '#666' }}>HMO Deduction ({admission?.hmoName || 'HMO'}):</td>
                  <td style={{ textAlign: 'right', padding: '3px 0', color: '#ff4d4f' }}>- {formatPeso(Number(bill.hmoDeduction))}</td>
                </tr>
              )}
              <tr style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 0', fontWeight: 700, fontSize: 14 }}>TOTAL AMOUNT DUE:</td>
                <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 700, fontSize: 16, color: '#1890ff' }}>
                  {formatPeso(Number(bill.totalAmount))}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0', color: '#52c41a' }}>Amount Paid:</td>
                <td style={{ textAlign: 'right', padding: '3px 0', color: '#52c41a' }}>- {formatPeso(totalPaid)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #333' }}>
                <td style={{ padding: '8px 0', fontWeight: 700, fontSize: 14, color: Number(bill.balance) > 0 ? '#ff4d4f' : '#52c41a' }}>
                  {Number(bill.balance) > 0 ? 'BALANCE DUE:' : 'FULLY PAID ✓'}
                </td>
                <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 700, fontSize: 16, color: Number(bill.balance) > 0 ? '#ff4d4f' : '#52c41a' }}>
                  {formatPeso(Math.abs(Number(bill.balance)))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#52c41a', borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
              PAYMENT HISTORY
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f6ffed', borderBottom: '1px solid #f0f0f0' }}>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600 }}>Method</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600 }}>Reference</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600 }}>Received By</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '4px 8px' }}>{dayjs(p.paidAt || p.createdAt).format('MMM D, YYYY h:mm A')}</td>
                    <td style={{ padding: '4px 8px' }}>{p.method}</td>
                    <td style={{ padding: '4px 8px' }}>{p.referenceNo || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>{p.receivedBy || '—'}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', color: '#52c41a', fontWeight: 500 }}>{formatPeso(p.amount)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '1px solid #ccc' }}>
                  <td colSpan={4} style={{ padding: '5px 8px', fontWeight: 700 }}>Total Payments:</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#52c41a' }}>
                    {formatPeso(totalPaid)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #d9d9d9', paddingTop: 20, marginTop: 8 }}>
          <Row gutter={24}>
            <Col span={8} style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', marginTop: 40, paddingTop: 4, fontSize: 11, color: '#666' }}>
                Patient / Guardian Signature
              </div>
            </Col>
            <Col span={8} style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', marginTop: 40, paddingTop: 4, fontSize: 11, color: '#666' }}>
                Cashier / Billing Officer
              </div>
            </Col>
            <Col span={8} style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', marginTop: 40, paddingTop: 4, fontSize: 11, color: '#666' }}>
                Authorized Representative
              </div>
            </Col>
          </Row>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: '#999' }}>
            This document is computer-generated and is valid without signature unless otherwise stated.
            <br />
            Generated: {dayjs().format('MMMM D, YYYY h:mm A')}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .soa-document {
            max-width: 100% !important;
            padding: 20px !important;
            margin: 0 !important;
          }
          body { margin: 0; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
    </div>
  );
};

export default BillingSOAPage;
