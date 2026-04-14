import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Row,
  Col,
  Spin,
  Alert,
  Checkbox,
  Descriptions,
  Tag,
  Table,
  Space,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useLabRequisition, useEnterResults } from '../../hooks/useLab';

const { Title, Text } = Typography;

interface RequisitionItem {
  id: string;
  testName: string;
  testCode?: string;
}

interface ResultEntry {
  testName: string;
  result: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  notes: string;
}

const LabResultEntryPage: React.FC = () => {
  const { requisitionId } = useParams<{ requisitionId: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [resultEntries, setResultEntries] = useState<Record<string, ResultEntry>>({});

  const { data: reqData, isLoading } = useLabRequisition(requisitionId!);
  const enterResults = useEnterResults();

  const requisition = reqData?.data;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!requisition) {
    return <Alert type="error" message="Requisition not found" />;
  }

  const updateEntry = (testName: string, field: keyof ResultEntry, value: string | boolean) => {
    setResultEntries((prev) => ({
      ...prev,
      [testName]: {
        testName,
        result: '',
        unit: '',
        referenceRange: '',
        isAbnormal: false,
        notes: '',
        ...(prev[testName] || {}),
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    const items: ResultEntry[] = requisition.items.map((item: RequisitionItem) => ({
      testName: item.testName,
      result: resultEntries[item.testName]?.result || '',
      unit: resultEntries[item.testName]?.unit || '',
      referenceRange: resultEntries[item.testName]?.referenceRange || '',
      isAbnormal: resultEntries[item.testName]?.isAbnormal || false,
      notes: resultEntries[item.testName]?.notes || '',
    }));

    await enterResults.mutateAsync({ requisitionId: requisitionId!, results: items });
    navigate('/lab/requisitions');
  };

  const statusColor: Record<string, string> = { PENDING: 'orange', IN_PROGRESS: 'blue', COMPLETED: 'green' };

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/lab/requisitions')} style={{ marginRight: 12 }}>
          Back
        </Button>
        <Title level={4} style={{ margin: 0 }}>Enter Lab Results — {requisition.requisitionNo}</Title>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="Patient">
            {requisition.patient
              ? `${requisition.patient.lastName}, ${requisition.patient.firstName} (${requisition.patient.patientNo})`
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Priority">
            <Tag color={requisition.priority === 'STAT' ? 'red' : requisition.priority === 'URGENT' ? 'orange' : 'default'}>
              {requisition.priority}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusColor[requisition.status] || 'default'}>{requisition.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Ordered At">
            {dayjs(requisition.orderedAt).format('MMM D, YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Ordered By">{requisition.orderedBy || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {requisition.status === 'COMPLETED' && (
        <Alert type="success" message="This requisition has already been completed." style={{ marginBottom: 16 }} />
      )}

      <Card title={`Test Results (${requisition.items?.length || 0} tests)`}>
        <Form form={form} layout="vertical">
          {(requisition.items || []).map((item: RequisitionItem, idx: number) => (
            <Card
              key={item.id}
              size="small"
              style={{ marginBottom: 12, background: '#fafafa' }}
              title={
                <Space>
                  <Text strong>{idx + 1}. {item.testName}</Text>
                  {item.testCode && <Tag>{item.testCode}</Tag>}
                  {resultEntries[item.testName]?.isAbnormal && (
                    <Tag color="red">ABNORMAL</Tag>
                  )}
                </Space>
              }
            >
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item label="Result" style={{ marginBottom: 8 }}>
                    <Input
                      value={resultEntries[item.testName]?.result || ''}
                      onChange={(e) => updateEntry(item.testName, 'result', e.target.value)}
                      placeholder="Enter result value"
                      style={{
                        borderColor: resultEntries[item.testName]?.isAbnormal ? '#ef4444' : undefined,
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item label="Unit" style={{ marginBottom: 8 }}>
                    <Input
                      value={resultEntries[item.testName]?.unit || ''}
                      onChange={(e) => updateEntry(item.testName, 'unit', e.target.value)}
                      placeholder="e.g. mg/dL"
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Reference Range" style={{ marginBottom: 8 }}>
                    <Input
                      value={resultEntries[item.testName]?.referenceRange || ''}
                      onChange={(e) => updateEntry(item.testName, 'referenceRange', e.target.value)}
                      placeholder="e.g. 70-110"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Notes" style={{ marginBottom: 8 }}>
                    <Input
                      value={resultEntries[item.testName]?.notes || ''}
                      onChange={(e) => updateEntry(item.testName, 'notes', e.target.value)}
                      placeholder="Additional notes"
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Checkbox
                    checked={resultEntries[item.testName]?.isAbnormal || false}
                    onChange={(e) => updateEntry(item.testName, 'isAbnormal', e.target.checked)}
                  >
                    <Text style={{ color: '#dc2626' }}>Mark as Abnormal</Text>
                  </Checkbox>
                </Col>
              </Row>
            </Card>
          ))}
        </Form>

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Space>
            <Button onClick={() => navigate('/lab/requisitions')}>Cancel</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={enterResults.isPending}
              onClick={handleSubmit}
              disabled={requisition.status === 'COMPLETED'}
            >
              Save Results & Complete
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default LabResultEntryPage;
