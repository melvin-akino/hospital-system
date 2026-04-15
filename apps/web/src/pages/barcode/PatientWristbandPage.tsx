import React, { useState } from 'react';
import {
  Card,
  Typography,
  AutoComplete,
  Button,
  Tag,
  Space,
  Row,
  Col,
  Alert,
  Divider,
} from 'antd';
import {
  BarcodeOutlined,
  PrinterOutlined,
  UserOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useGenerateWristband } from '../../hooks/useBarcode';
import { patientService } from '../../services/patientService';
import type { WristbandData } from '../../services/barcodeService';

const { Title, Text } = Typography;

interface Patient {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
}

const BLOOD_TYPE_LABELS: Record<string, string> = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
};

const WristbandPreview: React.FC<{ data: WristbandData }> = ({ data }) => {
  const allergies = data.allergies || [];
  const bloodLabel = data.bloodType ? (BLOOD_TYPE_LABELS[data.bloodType] ?? data.bloodType) : null;

  return (
    <div className="wristband" id="wristband-print">
      <div style={{ borderBottom: '2px solid #000', paddingBottom: 6, marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: '#666', fontWeight: 'bold', letterSpacing: 1 }}>
          iHIMS — PATIENT WRISTBAND
        </div>
      </div>

      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        {data.lastName}, {data.firstName}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 6, fontSize: 12 }}>
        <div>
          <span style={{ color: '#666' }}>MRN: </span>
          <strong>{data.patientNo}</strong>
        </div>
        <div>
          <span style={{ color: '#666' }}>DOB: </span>
          <strong>{dayjs(data.dateOfBirth).format('MMM D, YYYY')}</strong>
        </div>
        <div>
          <span style={{ color: '#666' }}>Sex: </span>
          <strong>{data.gender}</strong>
        </div>
        {bloodLabel && (
          <div>
            <span style={{ color: '#666' }}>Blood: </span>
            <strong style={{ color: '#dc2626' }}>{bloodLabel}</strong>
          </div>
        )}
      </div>

      {allergies.length > 0 && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #dc2626',
            borderRadius: 4,
            padding: '4px 8px',
            marginBottom: 6,
          }}
        >
          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 11 }}>
            ALLERGIES:{' '}
          </span>
          {allergies.map((a, i) => (
            <span key={i} style={{ fontSize: 11, marginRight: 8 }}>
              {a.allergen} ({a.severity})
            </span>
          ))}
        </div>
      )}

      {data.philhealthNo && (
        <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
          PhilHealth No.: <strong>{data.philhealthNo}</strong>
        </div>
      )}

      <Divider style={{ margin: '8px 0', borderColor: '#ccc' }} />

      <div style={{ fontFamily: 'monospace', fontSize: 14, letterSpacing: 2, fontWeight: 700 }}>
        {data.barcodeString}
      </div>
      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
        Generated: {dayjs(data.generatedAt).format('MMM D, YYYY h:mm A')}
      </div>
    </div>
  );
};

const PatientWristbandPage: React.FC = () => {
  const [patientOptions, setPatientOptions] = useState<
    { value: string; label: string; patient: Patient }[]
  >([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [wristbandData, setWristbandData] = useState<WristbandData | null>(null);

  const generateMutation = useGenerateWristband();

  const handlePatientSearch = async (q: string) => {
    if (q.length < 2) return;
    const res = await patientService.search(q);
    const patients: Patient[] = res?.data || [];
    setPatientOptions(
      patients.map((p) => ({
        value: p.id,
        label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
        patient: p,
      }))
    );
  };

  const handleGenerate = async () => {
    if (!selectedPatientId) return;
    const result = await generateMutation.mutateAsync(selectedPatientId);
    setWristbandData(result.data ?? null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #wristband-print, #wristband-print * { visibility: visible; }
          #wristband-print {
            position: fixed;
            left: 0;
            top: 0;
          }
          .wristband {
            border: 1px solid black !important;
            padding: 8px !important;
            width: 4in !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="page-container no-print">
        <Title level={4} style={{ marginBottom: 16 }}>
          <BarcodeOutlined style={{ marginRight: 8 }} />
          Patient Wristband Generator
        </Title>

        <Card style={{ marginBottom: 16 }} className="no-print">
          <Row gutter={16} align="bottom">
            <Col flex="auto">
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">Search Patient</Text>
              </div>
              <AutoComplete
                options={patientOptions}
                onSearch={handlePatientSearch}
                onSelect={(value) => setSelectedPatientId(value)}
                placeholder="Type patient name or patient number..."
                style={{ width: '100%' }}
                allowClear
                onClear={() => { setSelectedPatientId(''); setWristbandData(null); }}
              />
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<UserOutlined />}
                onClick={handleGenerate}
                loading={generateMutation.isPending}
                disabled={!selectedPatientId}
              >
                Generate Wristband
              </Button>
            </Col>
          </Row>
        </Card>

        {wristbandData && (
          <Row gutter={24}>
            <Col span={12}>
              <Card
                title="Wristband Preview"
                extra={
                  <Button
                    type="primary"
                    icon={<PrinterOutlined />}
                    onClick={handlePrint}
                  >
                    Print Wristband
                  </Button>
                }
              >
                <div
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: 8,
                    padding: 16,
                    background: '#fff',
                    maxWidth: 400,
                  }}
                >
                  <WristbandPreview data={wristbandData} />
                </div>

                {wristbandData.allergies.length > 0 && (
                  <Alert
                    type="warning"
                    icon={<AlertOutlined />}
                    showIcon
                    style={{ marginTop: 12 }}
                    message={`${wristbandData.allergies.length} known allerg${wristbandData.allergies.length === 1 ? 'y' : 'ies'} — printed on wristband`}
                    description={
                      <Space wrap>
                        {wristbandData.allergies.map((a, i) => (
                          <Tag key={i} color="red">{a.allergen} — {a.severity}</Tag>
                        ))}
                      </Space>
                    }
                  />
                )}
              </Card>
            </Col>

            <Col span={12}>
              <Card title="Wristband Data" size="small">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {[
                      { label: 'Full Name', value: wristbandData.name },
                      { label: 'Patient No.', value: wristbandData.patientNo },
                      { label: 'Date of Birth', value: dayjs(wristbandData.dateOfBirth).format('MMMM D, YYYY') },
                      { label: 'Gender', value: wristbandData.gender },
                      {
                        label: 'Blood Type',
                        value: wristbandData.bloodType
                          ? BLOOD_TYPE_LABELS[wristbandData.bloodType] ?? wristbandData.bloodType
                          : 'Not recorded',
                      },
                      {
                        label: 'PhilHealth No.',
                        value: wristbandData.philhealthNo ?? 'Not registered',
                      },
                      { label: 'Barcode', value: wristbandData.barcodeString },
                    ].map((row) => (
                      <tr key={row.label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td
                          style={{
                            padding: '6px 8px',
                            color: '#666',
                            whiteSpace: 'nowrap',
                            width: '40%',
                          }}
                        >
                          {row.label}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {row.label === 'Barcode' ? (
                            <code
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 13,
                                fontWeight: 700,
                                letterSpacing: 1,
                              }}
                            >
                              {row.value}
                            </code>
                          ) : (
                            <strong>{row.value}</strong>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card title="Print Instructions" size="small" style={{ marginTop: 16 }}>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#666' }}>
                  <li>Use a wristband printer or standard label paper</li>
                  <li>Recommended size: 4in x 1in (wristband strip)</li>
                  <li>Verify patient identity before attaching wristband</li>
                  <li>Check all details match the patient's record</li>
                  <li>Red allergy section must be clearly visible</li>
                </ul>
              </Card>
            </Col>
          </Row>
        )}

        {!wristbandData && (
          <Card>
            <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
              <BarcodeOutlined style={{ fontSize: 64, marginBottom: 16, display: 'block', color: '#d9d9d9' }} />
              Search for a patient and click "Generate Wristband" to create a patient wristband
            </div>
          </Card>
        )}
      </div>
    </>
  );
};

export default PatientWristbandPage;
