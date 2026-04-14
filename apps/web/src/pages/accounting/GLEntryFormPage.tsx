import React, { useState } from 'react';
import {
  Card,
  Form,
  Button,
  Typography,
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Table,
  Space,
  Alert,
  DatePicker,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useCreateGLEntry, useChartOfAccounts } from '../../hooks/useAccounting';

const { Title, Text } = Typography;

const formatPeso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

interface JournalLine {
  key: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

const GLEntryFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const createGLEntry = useCreateGLEntry();

  const { data: coaData } = useChartOfAccounts();
  const accounts = coaData?.data?.accounts ?? [];

  const [lines, setLines] = useState<JournalLine[]>([
    { key: '1', accountId: '', description: '', debit: 0, credit: 0 },
    { key: '2', accountId: '', description: '', debit: 0, credit: 0 },
  ]);

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001;

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { key: String(Date.now()), accountId: '', description: '', debit: 0, credit: 0 },
    ]);
  };

  const removeLine = (key: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const updateLine = (key: string, field: keyof JournalLine, value: string | number) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
    );
  };

  const handleSubmit = async (values: {
    description: string;
    entryDate: dayjs.Dayjs;
    referenceNo?: string;
  }) => {
    if (!isBalanced) return;

    const validLines = lines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) return;

    await createGLEntry.mutateAsync({
      description: values.description,
      entryDate: values.entryDate.toISOString(),
      referenceNo: values.referenceNo,
      lines: validLines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit || 0,
        credit: l.credit || 0,
        description: l.description,
      })),
    });

    navigate('/accounting/chart-of-accounts');
  };

  const columns = [
    {
      title: 'Account',
      key: 'accountId',
      width: '35%',
      render: (_: unknown, record: JournalLine) => (
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="Select account..."
          value={record.accountId || undefined}
          onChange={(v) => updateLine(record.key, 'accountId', v)}
          filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
          }
          options={accounts.map((a) => ({
            value: a.id,
            label: `${a.accountCode} – ${a.accountName}`,
          }))}
        />
      ),
    },
    {
      title: 'Description',
      key: 'description',
      width: '25%',
      render: (_: unknown, record: JournalLine) => (
        <Input
          placeholder="Line description..."
          value={record.description}
          onChange={(e) => updateLine(record.key, 'description', e.target.value)}
        />
      ),
    },
    {
      title: 'Debit (₱)',
      key: 'debit',
      width: '17%',
      render: (_: unknown, record: JournalLine) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          value={record.debit || undefined}
          onChange={(v) => {
            updateLine(record.key, 'debit', v ?? 0);
            if (v && v > 0) updateLine(record.key, 'credit', 0);
          }}
          placeholder="0.00"
        />
      ),
    },
    {
      title: 'Credit (₱)',
      key: 'credit',
      width: '17%',
      render: (_: unknown, record: JournalLine) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          value={record.credit || undefined}
          onChange={(v) => {
            updateLine(record.key, 'credit', v ?? 0);
            if (v && v > 0) updateLine(record.key, 'debit', 0);
          }}
          placeholder="0.00"
        />
      ),
    },
    {
      title: '',
      key: 'remove',
      width: '6%',
      render: (_: unknown, record: JournalLine) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeLine(record.key)}
          disabled={lines.length <= 2}
        />
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/accounting/chart-of-accounts')}
            style={{ marginRight: 12 }}
          >
            Back
          </Button>
        </Col>
        <Col>
          <Title level={4} style={{ margin: 0 }}>New Journal Entry</Title>
        </Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="entryDate"
                label="Entry Date"
                initialValue={dayjs()}
                rules={[{ required: true, message: 'Required' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="referenceNo" label="Reference Number">
                <Input placeholder="e.g., INV-2024-001" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="description"
                label="Description"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="Journal entry description..." />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title="Journal Lines"
          extra={
            <Button icon={<PlusOutlined />} onClick={addLine}>
              Add Line
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Table
            dataSource={lines}
            columns={columns}
            rowKey="key"
            pagination={false}
            size="small"
          />

          <Divider />

          {/* Totals */}
          <Row justify="end" gutter={16}>
            <Col>
              <Space direction="vertical" align="end">
                <Row gutter={24}>
                  <Col>
                    <Text type="secondary">Total Debit:</Text>
                  </Col>
                  <Col style={{ minWidth: 140, textAlign: 'right' }}>
                    <Text strong style={{ color: '#1890ff' }}>{formatPeso(totalDebit)}</Text>
                  </Col>
                </Row>
                <Row gutter={24}>
                  <Col>
                    <Text type="secondary">Total Credit:</Text>
                  </Col>
                  <Col style={{ minWidth: 140, textAlign: 'right' }}>
                    <Text strong style={{ color: '#52c41a' }}>{formatPeso(totalCredit)}</Text>
                  </Col>
                </Row>
                <Row gutter={24}>
                  <Col>
                    <Text type="secondary">Difference:</Text>
                  </Col>
                  <Col style={{ minWidth: 140, textAlign: 'right' }}>
                    <Text
                      strong
                      style={{ color: isBalanced ? '#52c41a' : '#ff4d4f', fontSize: 16 }}
                    >
                      {formatPeso(difference)}
                    </Text>
                  </Col>
                </Row>
              </Space>
            </Col>
          </Row>

          {!isBalanced && (
            <Alert
              type="error"
              message={`Entry is not balanced. Difference: ${formatPeso(difference)}. Debits must equal Credits.`}
              style={{ marginTop: 12 }}
            />
          )}
          {isBalanced && totalDebit > 0 && (
            <Alert
              type="success"
              message="Entry is balanced. Ready to post."
              style={{ marginTop: 12 }}
            />
          )}
        </Card>

        <Row justify="end">
          <Space>
            <Button onClick={() => navigate('/accounting/chart-of-accounts')}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={createGLEntry.isPending}
              disabled={!isBalanced || totalDebit === 0}
            >
              Post Journal Entry
            </Button>
          </Space>
        </Row>
      </Form>
    </div>
  );
};

export default GLEntryFormPage;
