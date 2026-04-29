/**
 * LabInterpretationPanel
 *
 * AI-powered lab result interpretation contextualised to the patient's
 * clinical picture (known diagnoses, medications, vitals).
 */
import React, { useState } from 'react';
import {
  Card, Button, Typography, Space, Alert, Spin, Tag, List,
  Divider, message, Tooltip, Badge
} from 'antd';
import {
  ExperimentOutlined, RobotOutlined, ReloadOutlined,
  ExclamationCircleOutlined, CheckCircleOutlined, WarningOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { aiService } from '../../services/aiService';

const { Text, Paragraph } = Typography;

interface LabInterpretation {
  overallImpression:    string;
  criticalFindings:     string[];
  abnormalFindings:     string[];
  normalFindings:       string[];
  clinicalCorrelation:  string;
  suggestedActions:     string[];
  urgency:              'ROUTINE' | 'URGENT' | 'CRITICAL';
  labResultCount:       number;
  generatedAt:          string;
  disclaimer:           string;
}

interface Props {
  patientId:      string;
  labResultIds?:  string[];
  requisitionId?: string;
  patientName?:   string;
  onGenerated?:   (result: LabInterpretation) => void;
}

const urgencyConfig = {
  ROUTINE:  { color: 'success',  icon: <CheckCircleOutlined />, label: 'Routine'  },
  URGENT:   { color: 'warning',  icon: <WarningOutlined />,     label: 'Urgent'   },
  CRITICAL: { color: 'error',    icon: <AlertOutlined />,       label: 'Critical' },
} as const;

const LabInterpretationPanel: React.FC<Props> = ({
  patientId, labResultIds, requisitionId, patientName, onGenerated,
}) => {
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<LabInterpretation | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.interpretLabResults(patientId, { labResultIds, requisitionId });
      setResult(data);
      onGenerated?.(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to interpret lab results';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const urgency = result ? urgencyConfig[result.urgency] : null;

  return (
    <Card
      size="small"
      title={
        <Space>
          <RobotOutlined style={{ color: '#722ed1' }} />
          <span>AI Lab Interpretation</span>
          <Tag color="purple" style={{ marginLeft: 4, fontSize: 11 }}>Claude AI</Tag>
        </Space>
      }
      extra={
        result && (
          <Button size="small" icon={<ReloadOutlined />} onClick={generate} loading={loading}>
            Re-interpret
          </Button>
        )
      }
      style={{ marginTop: 16 }}
    >
      {!result && !loading && (
        <Space direction="vertical" style={{ width: '100%' }} align="center">
          <ExperimentOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
          <Text type="secondary">
            AI will interpret{' '}
            {patientName ? <strong>{patientName}'s</strong> : 'the'} lab results
            in context of their clinical picture
          </Text>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={generate}
            size="large"
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
          >
            Interpret Lab Results
          </Button>
        </Space>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Analysing results against clinical context…</Text>
          </div>
        </div>
      )}

      {error && !loading && (
        <Alert
          type="error"
          showIcon
          message="Interpretation Failed"
          description={error}
          action={<Button size="small" onClick={generate}>Retry</Button>}
        />
      )}

      {result && !loading && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Urgency badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag
              icon={urgency?.icon}
              color={urgency?.color}
              style={{ fontSize: 13, padding: '2px 10px' }}
            >
              {urgency?.label}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {result.labResultCount} result{result.labResultCount !== 1 ? 's' : ''} analysed
            </Text>
          </div>

          {/* Overall impression */}
          <div>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
              Overall Impression
            </Text>
            <Paragraph
              style={{
                background: '#f6f0ff',
                border: '1px solid #d3adf7',
                borderRadius: 6,
                padding: '10px 14px',
                marginBottom: 0,
                fontSize: 13,
              }}
            >
              {result.overallImpression}
            </Paragraph>
          </div>

          {/* Critical findings */}
          {result.criticalFindings.length > 0 && (
            <div>
              <Text strong style={{ color: '#cf1322', fontSize: 13, display: 'block', marginBottom: 4 }}>
                <AlertOutlined /> Critical Findings
              </Text>
              <List
                size="small"
                dataSource={result.criticalFindings}
                renderItem={item => (
                  <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                    <Badge color="red" text={<Text style={{ fontSize: 13 }}>{item}</Text>} />
                  </List.Item>
                )}
              />
            </div>
          )}

          {/* Abnormal findings */}
          {result.abnormalFindings.length > 0 && (
            <div>
              <Text strong style={{ color: '#d46b08', fontSize: 13, display: 'block', marginBottom: 4 }}>
                <WarningOutlined /> Abnormal Findings
              </Text>
              <List
                size="small"
                dataSource={result.abnormalFindings}
                renderItem={item => (
                  <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                    <Badge color="orange" text={<Text style={{ fontSize: 13 }}>{item}</Text>} />
                  </List.Item>
                )}
              />
            </div>
          )}

          {/* Clinical correlation */}
          <div>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
              Clinical Correlation
            </Text>
            <Paragraph
              style={{
                background: '#fafafa',
                border: '1px solid #e8e8e8',
                borderRadius: 6,
                padding: '10px 14px',
                marginBottom: 0,
                fontSize: 13,
                fontStyle: 'italic',
              }}
            >
              {result.clinicalCorrelation}
            </Paragraph>
          </div>

          {/* Suggested actions */}
          {result.suggestedActions.length > 0 && (
            <div>
              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                Suggested Actions
              </Text>
              <List
                size="small"
                dataSource={result.suggestedActions}
                renderItem={(item, idx) => (
                  <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                    <Text style={{ fontSize: 13 }}>
                      <Text type="secondary" style={{ marginRight: 6 }}>{idx + 1}.</Text>
                      {item}
                    </Text>
                  </List.Item>
                )}
              />
            </div>
          )}

          <Divider style={{ margin: '4px 0 8px' }} />
          <Alert
            type="info"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message={result.disclaimer}
            style={{ fontSize: 12 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Generated: {new Date(result.generatedAt).toLocaleString()}
          </Text>
        </Space>
      )}
    </Card>
  );
};

export default LabInterpretationPanel;
