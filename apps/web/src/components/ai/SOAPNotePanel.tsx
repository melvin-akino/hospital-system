/**
 * SOAPNotePanel
 *
 * Generates an AI-assisted SOAP note for a patient encounter.
 * Requires ANTHROPIC_API_KEY on the server.
 */
import React, { useState } from 'react';
import {
  Card, Button, Tabs, Typography, Space, Alert, Spin, Tooltip,
  message, Divider, Tag
} from 'antd';
import {
  FileTextOutlined, RobotOutlined, CopyOutlined, ReloadOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { aiService } from '../../services/aiService';

const { Text, Paragraph, Title } = Typography;

interface SOAPNote {
  subjective:  string;
  objective:   string;
  assessment:  string;
  plan:        string;
  rawNote:     string;
  generatedAt: string;
  disclaimer:  string;
}

interface Props {
  patientId:      string;
  consultationId?: string;
  patientName?:   string;
}

const SOAPNotePanel: React.FC<Props> = ({ patientId, consultationId, patientName }) => {
  const [loading,  setLoading]  = useState(false);
  const [note,     setNote]     = useState<SOAPNote | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sections');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.generateSOAPNote(patientId, consultationId);
      setNote(result);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to generate SOAP note';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label = 'SOAP note') => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label} copied to clipboard`);
    } catch {
      message.error('Copy failed — please select and copy manually');
    }
  };

  const tabItems = note ? [
    {
      key: 'sections',
      label: 'Sections',
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {[
            { label: 'S — Subjective',  key: 'subjective',  content: note.subjective  },
            { label: 'O — Objective',   key: 'objective',   content: note.objective   },
            { label: 'A — Assessment',  key: 'assessment',  content: note.assessment  },
            { label: 'P — Plan',        key: 'plan',        content: note.plan        },
          ].map(({ label, key, content }) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text strong style={{ fontSize: 13 }}>{label}</Text>
                <Tooltip title="Copy section">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(content, label)}
                  />
                </Tooltip>
              </div>
              <Paragraph
                style={{
                  background: '#fafafa',
                  border: '1px solid #e8e8e8',
                  borderRadius: 6,
                  padding: '10px 14px',
                  marginBottom: 0,
                  whiteSpace: 'pre-wrap',
                  fontSize: 13,
                }}
              >
                {content}
              </Paragraph>
            </div>
          ))}
        </Space>
      ),
    },
    {
      key: 'raw',
      label: 'Full Note',
      children: (
        <div style={{ position: 'relative' }}>
          <Button
            size="small"
            icon={<CopyOutlined />}
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
            onClick={() => copyToClipboard(note.rawNote)}
          >
            Copy All
          </Button>
          <Paragraph
            style={{
              background: '#f6f6f6',
              border: '1px solid #e0e0e0',
              borderRadius: 6,
              padding: '14px 16px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: 13,
              marginBottom: 0,
              minHeight: 200,
            }}
          >
            {note.rawNote}
          </Paragraph>
        </div>
      ),
    },
  ] : [];

  return (
    <Card
      size="small"
      title={
        <Space>
          <RobotOutlined style={{ color: '#1677ff' }} />
          <span>AI SOAP Note Generator</span>
          <Tag color="blue" style={{ marginLeft: 4, fontSize: 11 }}>Claude AI</Tag>
        </Space>
      }
      extra={
        note && (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={generate}
            loading={loading}
          >
            Regenerate
          </Button>
        )
      }
      style={{ marginTop: 16 }}
    >
      {!note && !loading && (
        <Space direction="vertical" style={{ width: '100%' }} align="center">
          <FileTextOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
          <Text type="secondary">
            Generate a SOAP note from{' '}
            {patientName ? <strong>{patientName}'s</strong> : 'this patient\'s'} clinical data
          </Text>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={generate}
            size="large"
          >
            Generate SOAP Note
          </Button>
        </Space>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Claude AI is generating the SOAP note…</Text>
          </div>
        </div>
      )}

      {error && !loading && (
        <Alert
          type="error"
          showIcon
          message="Generation Failed"
          description={error}
          action={
            <Button size="small" onClick={generate}>Retry</Button>
          }
        />
      )}

      {note && !loading && (
        <>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="small"
          />
          <Divider style={{ margin: '12px 0 8px' }} />
          <Alert
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message={note.disclaimer}
            style={{ fontSize: 12 }}
          />
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
            Generated: {new Date(note.generatedAt).toLocaleString()}
          </Text>
        </>
      )}
    </Card>
  );
};

export default SOAPNotePanel;
