import React, { useRef } from 'react';
import {
  Row, Col, Typography, Tag, Descriptions, Button, Space, Spin, Alert,
  Card, Table, Divider, Statistic,
} from 'antd';
import {
  PrinterOutlined, ArrowLeftOutlined, FileDoneOutlined,
  MedicineBoxOutlined, ExperimentOutlined, FileTextOutlined,
  DollarOutlined, HomeOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';

const { Title, Text, Paragraph } = Typography;

const formatPeso = (v: any) =>
  `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const NOTE_TYPE_COLOR: Record<string, string> = {
  PROGRESS: 'blue', ASSESSMENT: 'purple', NURSING: 'green',
  TRIAGE: 'orange', PROCEDURE: 'cyan', DISCHARGE: 'volcano',
  REFERRAL: 'gold', GENERAL: 'default',
};

const DischargeSummaryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['discharge-summary', id],
    queryFn: () => api.get(`/admissions/${id}/discharge-summary`).then((r) => r.data?.data),
    enabled: !!id,
  });

  const handlePrint = () => window.print();

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  );
  if (error || !data) return (
    <div style={{ padding: 24 }}>
      <Alert type="error" message="Unable to load discharge summary" showIcon />
    </div>
  );

  const { admission, stayDays, bill, clinicalNotes, labResults, prescriptions } = data;
  const patient    = admission.patient;
  const room       = admission.room;
  const roomType   = room?.roomType;

  const age = patient.dateOfBirth
    ? dayjs().diff(dayjs(patient.dateOfBirth), 'year')
    : null;

  return (
    <>
      {/* ── Screen controls (hidden on print) ── */}
      <div className="no-print" style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
              <Title level={4} style={{ margin: 0 }}>
                <FileDoneOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                Discharge Summary — {admission.admissionNo}
              </Title>
              <Tag color={admission.status === 'DISCHARGED' ? 'green' : 'blue'}>
                {admission.status}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Print / Save PDF
            </Button>
          </Col>
        </Row>
      </div>

      {/* ── Printable document ── */}
      <div
        ref={printRef}
        style={{ padding: '32px 48px', maxWidth: 900, margin: '0 auto', background: '#fff' }}
        id="discharge-summary-print"
      >
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '3px double #333', paddingBottom: 12, marginBottom: 20 }}>
          <Title level={2} style={{ margin: 0 }}>iHIMS Hospital</Title>
          <Text type="secondary">Discharge Summary</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="blue" style={{ fontSize: 13 }}>{admission.admissionNo}</Tag>
          </div>
        </div>

        {/* ── Patient & Admission Info ── */}
        <Row gutter={24} style={{ marginBottom: 20 }}>
          <Col span={14}>
            <Card size="small" title={<Space><HomeOutlined />Patient Information</Space>} style={{ height: '100%' }}>
              <Descriptions size="small" column={1} bordered={false}>
                <Descriptions.Item label="Full Name">
                  <Text strong style={{ fontSize: 15 }}>
                    {patient.lastName}, {patient.firstName} {patient.middleName || ''}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Patient No.">{patient.patientNo}</Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {patient.dateOfBirth
                    ? `${dayjs(patient.dateOfBirth).format('MMM D, YYYY')} (${age} y.o.)`
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Sex">{patient.sex || '—'}</Descriptions.Item>
                <Descriptions.Item label="Address">{patient.address || '—'}</Descriptions.Item>
                {patient.philhealthNo && (
                  <Descriptions.Item label="PhilHealth No.">{patient.philhealthNo}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>
          <Col span={10}>
            <Card size="small" title="Admission Details" style={{ height: '100%' }}>
              <Descriptions size="small" column={1} bordered={false}>
                <Descriptions.Item label="Admission Date">
                  {dayjs(admission.admittedAt).format('MMM D, YYYY h:mm A')}
                </Descriptions.Item>
                <Descriptions.Item label="Discharge Date">
                  {admission.dischargedAt
                    ? dayjs(admission.dischargedAt).format('MMM D, YYYY h:mm A')
                    : <Tag color="orange">Still Admitted</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Length of Stay">
                  <Text strong style={{ color: '#722ed1' }}>{stayDays} day{stayDays !== 1 ? 's' : ''}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Room / Ward">
                  {room ? `${room.roomNumber}${roomType ? ` — ${roomType.name}` : ''}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Attending Physician">
                  {admission.attendingDoctor || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Service Class">
                  {admission.serviceClass || '—'}
                </Descriptions.Item>
                {admission.dischargeType && (
                  <Descriptions.Item label="Discharge Type">
                    <Tag>{admission.dischargeType}</Tag>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>
        </Row>

        {/* ── Diagnosis ── */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>Admitting Diagnosis</Text>
              <Paragraph style={{ margin: 0, background: '#f5f5f5', padding: '6px 10px', borderRadius: 4, minHeight: 40 }}>
                {admission.chiefComplaint || admission.diagnosis || <Text type="secondary">Not recorded</Text>}
              </Paragraph>
            </Col>
            <Col span={12}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>Final / Discharge Diagnosis</Text>
              <Paragraph style={{ margin: 0, background: '#f5f5f5', padding: '6px 10px', borderRadius: 4, minHeight: 40 }}>
                {admission.diagnosis || <Text type="secondary">Not recorded</Text>}
              </Paragraph>
            </Col>
          </Row>
        </Card>

        {/* ── Discharge Summary Narrative ── */}
        {admission.dischargeSummary && (
          <Card
            size="small"
            title={<Space><FileTextOutlined />Discharge Summary / Clinical Course</Space>}
            style={{ marginBottom: 16 }}
          >
            <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.8 }}>
              {admission.dischargeSummary}
            </Paragraph>
          </Card>
        )}

        {/* ── Prescriptions at Discharge ── */}
        {prescriptions && prescriptions.length > 0 && (
          <Card
            size="small"
            title={<Space><MedicineBoxOutlined style={{ color: '#1890ff' }} />Medications at Discharge</Space>}
            style={{ marginBottom: 16 }}
          >
            {prescriptions.map((rx: any, rxIdx: number) => (
              <div key={rx.id} style={{ marginBottom: rxIdx < prescriptions.length - 1 ? 12 : 0 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Rx #{rxIdx + 1} — {rx.rxNo} — Prescribed by {rx.prescribedBy} on {dayjs(rx.prescribedAt).format('MMM D, YYYY')}
                </Text>
                <Table
                  dataSource={rx.items}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  showHeader={rxIdx === 0}
                  style={{ marginTop: 4 }}
                  columns={[
                    { title: 'Drug',         dataIndex: 'drugName',      key: 'drug' },
                    { title: 'Dosage',        dataIndex: 'dosage',        key: 'dose',  render: (v: any) => v || '—' },
                    { title: 'Frequency',     dataIndex: 'frequency',     key: 'freq',  render: (v: any) => v || '—' },
                    { title: 'Duration',      dataIndex: 'duration',      key: 'dur',   render: (v: any) => v || '—' },
                    { title: 'Qty',           dataIndex: 'quantity',      key: 'qty',   render: (v: any) => v ?? '—' },
                    { title: 'Instructions',  dataIndex: 'instructions',  key: 'inst',  render: (v: any) => v || '—' },
                  ]}
                />
              </div>
            ))}
          </Card>
        )}

        {/* ── Lab Results ── */}
        {labResults && labResults.length > 0 && (
          <Card
            size="small"
            title={<Space><ExperimentOutlined style={{ color: '#722ed1' }} />Laboratory Results (during admission)</Space>}
            style={{ marginBottom: 16 }}
          >
            <Table
              dataSource={labResults}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: 'Test',       dataIndex: 'testName',   key: 'test' },
                { title: 'Result',     dataIndex: 'result',     key: 'res',
                  render: (v: string, r: any) => (
                    <Text style={{ color: r.isAbnormal ? '#cf1322' : undefined, fontWeight: r.isAbnormal ? 700 : 400 }}>
                      {v || '—'} {r.isAbnormal && '⚠'}
                    </Text>
                  ),
                },
                { title: 'Normal Range', dataIndex: 'normalRange', key: 'range', render: (v: any) => v || '—' },
                { title: 'Date',         dataIndex: 'createdAt',   key: 'date',
                  render: (v: string) => dayjs(v).format('MMM D, YYYY'),
                },
              ]}
            />
          </Card>
        )}

        {/* ── Clinical Notes Summary ── */}
        {clinicalNotes && clinicalNotes.length > 0 && (
          <Card
            size="small"
            title={<Space><FileTextOutlined />Clinical Notes Summary</Space>}
            style={{ marginBottom: 16 }}
            className="no-print-expand"
          >
            {clinicalNotes.map((note: any) => (
              <div key={note.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>
                <Space style={{ marginBottom: 4 }}>
                  <Tag color={NOTE_TYPE_COLOR[note.noteType] || 'default'} style={{ fontSize: 11 }}>
                    {note.noteType}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {note.author?.displayName} · {dayjs(note.createdAt).format('MMM D, YYYY h:mm A')}
                  </Text>
                </Space>
                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>
                  {note.content}
                </Paragraph>
              </div>
            ))}
          </Card>
        )}

        {/* ── Bill Summary ── */}
        {bill && (
          <Card
            size="small"
            title={<Space><DollarOutlined style={{ color: '#fa8c16' }} />Bill Summary</Space>}
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={6}>
                <Statistic title="Bill No." value={bill.billNo} valueStyle={{ fontSize: 14 }} />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Total Amount"
                  value={formatPeso(bill.totalAmount)}
                  valueStyle={{ color: '#722ed1', fontSize: 16 }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Amount Paid"
                  value={formatPeso(bill.paidAmount)}
                  valueStyle={{ color: '#52c41a', fontSize: 16 }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Balance"
                  value={formatPeso(bill.balance)}
                  valueStyle={{ color: Number(bill.balance) > 0 ? '#cf1322' : '#52c41a', fontSize: 16 }}
                />
              </Col>
            </Row>
            <Table
              dataSource={bill.items || []}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: 'Description', dataIndex: 'description', key: 'desc' },
                { title: 'Qty',  dataIndex: 'quantity',  key: 'qty',   width: 60, align: 'center' as const },
                { title: 'Unit Price', dataIndex: 'unitPrice', key: 'price', width: 120,
                  render: (v: any) => formatPeso(v) },
                { title: 'Total', dataIndex: 'total', key: 'total', width: 120,
                  render: (v: any) => <Text strong>{formatPeso(v)}</Text> },
              ]}
            />
          </Card>
        )}

        {/* ── Coverage ── */}
        {(admission.hmoName || admission.philhealthNumber || admission.discountType) && (
          <Card size="small" title="Coverage & Discounts" style={{ marginBottom: 16 }}>
            <Row gutter={12}>
              {admission.hmoName && (
                <Col span={8}><Text strong>HMO: </Text>{admission.hmoName}{admission.hmoLOANumber && ` (LOA: ${admission.hmoLOANumber})`}</Col>
              )}
              {admission.philhealthNumber && (
                <Col span={8}><Text strong>PhilHealth: </Text>{admission.philhealthNumber}</Col>
              )}
              {admission.discountType && admission.discountType !== 'NONE' && (
                <Col span={8}><Text strong>Discount: </Text><Tag>{admission.discountType}</Tag></Col>
              )}
            </Row>
          </Card>
        )}

        {/* ── Instructions / Follow-up ── */}
        <Card size="small" title="Discharge Instructions & Follow-up" style={{ marginBottom: 20 }}>
          <div style={{ minHeight: 60, background: '#fafafa', padding: '8px 12px', borderRadius: 4 }}>
            {admission.notes
              ? <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{admission.notes}</Paragraph>
              : <Text type="secondary">No discharge instructions recorded.</Text>
            }
          </div>
        </Card>

        {/* ── Signatures ── */}
        <Row gutter={32} style={{ marginTop: 32 }}>
          {[
            { label: 'Attending Physician', name: admission.attendingDoctor },
            { label: "Patient / Guardian's Signature", name: '' },
            { label: 'Discharge Officer', name: '' },
          ].map((s) => (
            <Col span={8} key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: 8, marginTop: 40 }}>
                {s.name && <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>}
                <div style={{ fontSize: 12, color: '#666' }}>{s.label}</div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Footer */}
        <Divider style={{ marginTop: 32 }} />
        <div style={{ textAlign: 'center', fontSize: 11, color: '#aaa' }}>
          Generated: {dayjs().format('MMMM D, YYYY h:mm A')} · iHIMS Hospital Information System
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          #discharge-summary-print {
            padding: 16px 24px !important;
            max-width: 100% !important;
          }
          .ant-card { break-inside: avoid; }
        }
      `}</style>
    </>
  );
};

export default DischargeSummaryPage;
