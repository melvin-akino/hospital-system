import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Typography,
  Input,
  Table,
  Tag,
  Space,
  Alert,
  Row,
  Col,
  Descriptions,
  Divider,
  Badge,
} from 'antd';
import {
  BarcodeOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  ToolOutlined,
  ExperimentOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useScanBarcode, useScanLog } from '../../hooks/useBarcode';
import type { BarcodeScanEntry } from '../../services/barcodeService';

const { Title, Text } = Typography;

interface ScanResult {
  resolved: boolean;
  type?: string | null;
  details?: Record<string, unknown> | null;
  barcodeString: string;
  scannedAt: string;
}

function TypeIcon({ type }: { type?: string | null }) {
  if (type === 'PATIENT') return <UserOutlined style={{ color: '#1677ff' }} />;
  if (type === 'MEDICATION') return <MedicineBoxOutlined style={{ color: '#16a34a' }} />;
  if (type === 'ASSET') return <ToolOutlined style={{ color: '#f97316' }} />;
  if (type === 'SPECIMEN') return <ExperimentOutlined style={{ color: '#7c3aed' }} />;
  return <BarcodeOutlined />;
}

function ResultCard({ result }: { result: ScanResult }) {
  const { type, details, resolved } = result;

  if (!resolved || !details) {
    return (
      <Alert
        type="error"
        icon={<CloseCircleOutlined />}
        showIcon
        message="Barcode Not Recognized"
        description={`Could not resolve barcode: "${result.barcodeString}"`}
      />
    );
  }

  if (type === 'PATIENT') {
    const allergies = (details['allergies'] as { allergen: string; severity: string }[]) || [];
    return (
      <Card
        size="small"
        title={
          <Space>
            <UserOutlined style={{ color: '#1677ff' }} />
            <Text strong>Patient Found</Text>
          </Space>
        }
        style={{ borderColor: '#1677ff', background: '#eff6ff' }}
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Name">
            <Text strong style={{ fontSize: 15 }}>
              {String(details['name'] ?? '')}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Patient No.">{String(details['patientNo'] ?? '')}</Descriptions.Item>
          <Descriptions.Item label="DOB">
            {details['dateOfBirth']
              ? dayjs(String(details['dateOfBirth'])).format('MMM D, YYYY')
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Gender">{String(details['gender'] ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Blood Type">
            {details['bloodType'] ? (
              <Tag color="red">{String(details['bloodType'])}</Tag>
            ) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="PhilHealth No.">{String(details['philhealthNo'] ?? '—')}</Descriptions.Item>
          {allergies.length > 0 && (
            <Descriptions.Item label="Allergies" span={2}>
              <Space wrap>
                {allergies.map((a, i) => (
                  <Tag key={i} color="red">
                    {a.allergen} ({a.severity})
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    );
  }

  if (type === 'MEDICATION') {
    const medication = details['medication'] as { genericName: string; brandName?: string; strength?: string } | null;
    const stock = details['currentStock'] as number;
    return (
      <Card
        size="small"
        title={
          <Space>
            <MedicineBoxOutlined style={{ color: '#16a34a' }} />
            <Text strong>Medication Found</Text>
          </Space>
        }
        style={{ borderColor: '#16a34a', background: '#f0fdf4' }}
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Item Name">
            <Text strong>{String(details['itemName'] ?? '')}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Item Code">{String(details['itemCode'] ?? '')}</Descriptions.Item>
          {medication && (
            <>
              <Descriptions.Item label="Generic Name">{medication.genericName}</Descriptions.Item>
              <Descriptions.Item label="Brand Name">{medication.brandName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Strength">{medication.strength || '—'}</Descriptions.Item>
            </>
          )}
          <Descriptions.Item label="Current Stock">
            <Tag color={stock > 0 ? 'green' : 'red'}>{stock} units</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Unit Price">
            ₱{Number(details['sellingPrice'] ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    );
  }

  if (type === 'ASSET') {
    return (
      <Card
        size="small"
        title={
          <Space>
            <ToolOutlined style={{ color: '#f97316' }} />
            <Text strong>Asset Found</Text>
          </Space>
        }
        style={{ borderColor: '#f97316', background: '#fff7ed' }}
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Asset Name">
            <Text strong>{String(details['assetName'] ?? '')}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Asset Code">{String(details['assetCode'] ?? '')}</Descriptions.Item>
          <Descriptions.Item label="Category">{String(details['category'] ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={String(details['status']) === 'ACTIVE' ? 'green' : 'orange'}>
              {String(details['status'] ?? '')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Location">{String(details['location'] ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Current Value">
            ₱{Number(details['currentValue'] ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    );
  }

  if (type === 'SPECIMEN') {
    return (
      <Card
        size="small"
        title={
          <Space>
            <ExperimentOutlined style={{ color: '#7c3aed' }} />
            <Text strong>Specimen / Lab Result Found</Text>
          </Space>
        }
        style={{ borderColor: '#7c3aed', background: '#faf5ff' }}
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Result No.">
            <Text strong>{String(details['resultNo'] ?? '')}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Test Name">{String(details['testName'] ?? '')}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag>{String(details['status'] ?? '')}</Tag>
          </Descriptions.Item>
          {details['performedAt'] && (
            <Descriptions.Item label="Performed At">
              {dayjs(String(details['performedAt'])).format('MMM D, YYYY')}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    );
  }

  return (
    <Alert type="warning" showIcon message="Unknown type" description={JSON.stringify(details)} />
  );
}

const BarcodeScannerPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scanMutation = useScanBarcode();
  const { data: scanLogData } = useScanLog();

  const scanLog: BarcodeScanEntry[] = scanLogData?.data ?? [];

  // Auto-focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async () => {
    const value = inputValue.trim();
    if (!value) return;

    const result = await scanMutation.mutateAsync({
      barcodeString: value,
      scannedAt: new Date().toISOString(),
      location: 'Scanner Terminal',
    });

    setLastScan({
      resolved: result.data?.resolved ?? false,
      type: result.data?.type ?? null,
      details: result.data?.details ?? null,
      barcodeString: value,
      scannedAt: result.data?.scannedAt ?? new Date().toISOString(),
    });

    setInputValue('');
    // Re-focus for next scan
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const logColumns = [
    {
      title: 'Barcode',
      dataIndex: 'barcodeString',
      key: 'barcodeString',
      render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (v?: string) => {
        if (!v) return <Tag color="red">UNRESOLVED</Tag>;
        const colors: Record<string, string> = {
          PATIENT: 'blue',
          MEDICATION: 'green',
          ASSET: 'orange',
          SPECIMEN: 'purple',
        };
        return <Tag color={colors[v] ?? 'default'} icon={<TypeIcon type={v} />}>{v}</Tag>;
      },
    },
    {
      title: 'Result',
      key: 'result',
      render: (_: unknown, row: BarcodeScanEntry) => {
        if (!row.resolved) return <Text type="danger">Not Found</Text>;
        const details = row.details ?? {};
        if (row.type === 'PATIENT') return <Text>{String(details['name'] ?? '')}</Text>;
        if (row.type === 'MEDICATION') return <Text>{String(details['itemName'] ?? '')}</Text>;
        if (row.type === 'ASSET') return <Text>{String(details['assetName'] ?? '')}</Text>;
        if (row.type === 'SPECIMEN') return <Text>{String(details['testName'] ?? '')}</Text>;
        return <Text>Resolved</Text>;
      },
    },
    {
      title: 'Time',
      dataIndex: 'scannedAt',
      key: 'scannedAt',
      render: (v: string) => dayjs(v).format('h:mm:ss A'),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (v?: string) => v || '—',
    },
  ];

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 16 }}>
        <BarcodeOutlined style={{ marginRight: 8 }} />
        Universal Barcode Scanner
      </Title>

      {/* Scanner Input */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="center">
          <Col span={16}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <BarcodeOutlined style={{ fontSize: 48, color: '#1677ff' }} />
            </div>
            <Input
              ref={inputRef as React.Ref<HTMLInputElement>}
              size="large"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={handleScan}
              placeholder="Scan Barcode / Enter Code — Press Enter to Submit"
              prefix={<BarcodeOutlined style={{ color: '#1677ff' }} />}
              style={{ fontSize: 16, textAlign: 'center' }}
              autoFocus
              allowClear
            />
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text type="secondary">
                Focus this field and scan with a barcode reader, or type a code and press Enter
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Scan Result */}
      {lastScan && (
        <Card style={{ marginBottom: 16 }}>
          <Row align="middle" style={{ marginBottom: 12 }}>
            <Col flex="auto">
              <Space>
                <TypeIcon type={lastScan.type} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {lastScan.barcodeString}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  — {dayjs(lastScan.scannedAt).format('h:mm:ss A')}
                </Text>
              </Space>
            </Col>
            <Col>
              {lastScan.resolved ? (
                <Badge status="success" text="Resolved" />
              ) : (
                <Badge status="error" text="Not Found" />
              )}
            </Col>
          </Row>
          <ResultCard result={lastScan} />
        </Card>
      )}

      {/* Scan History */}
      <Card title={`Scan History (last ${Math.min(scanLog.length, 20)})`}>
        {scanLog.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
            No scans yet. Scan a barcode to start.
          </div>
        ) : (
          <Table
            dataSource={scanLog.slice(0, 20)}
            columns={logColumns}
            rowKey="id"
            size="small"
            pagination={false}
          />
        )}
      </Card>

      <Divider />
      <Card size="small" style={{ background: '#f9fafb' }}>
        <Title level={5} style={{ marginBottom: 8 }}>Barcode Format Reference</Title>
        <Row gutter={16}>
          {[
            { type: 'PATIENT', format: 'PAT-{patientNo}-{checksum}', color: '#1677ff' },
            { type: 'MEDICATION', format: 'MED-{itemCode}-{checksum}', color: '#16a34a' },
            { type: 'ASSET', format: 'ASSET-{assetCode}-{checksum}', color: '#f97316' },
            { type: 'SPECIMEN', format: 'SPEC-{resultNo}-{checksum}', color: '#7c3aed' },
          ].map((b) => (
            <Col key={b.type} span={6}>
              <Tag color={b.color} style={{ marginBottom: 4 }}>{b.type}</Tag>
              <code style={{ fontSize: 11, display: 'block', color: '#666' }}>{b.format}</code>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default BarcodeScannerPage;
