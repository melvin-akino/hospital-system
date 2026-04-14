import React, { useState } from 'react';
import {
  Card, Row, Col, Typography, Statistic, Tabs, Table, Tag, Button, Input,
  Select, Form, DatePicker, Space, Modal, Popconfirm, Badge,
} from 'antd';
import {
  MessageOutlined, SendOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useSmsStats, useSmsTemplates, useSmsLogs,
  useSendSms, useCreateTemplate, useUpdateTemplate, useDeleteTemplate,
} from '../../hooks/useSMS';
import type { SmsTemplate } from '../../services/smsService';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const statusColor: Record<string, string> = { SENT: 'green', FAILED: 'red', PENDING: 'orange' };
const statusIcon: Record<string, React.ReactNode> = {
  SENT: <CheckCircleOutlined />,
  FAILED: <CloseCircleOutlined />,
  PENDING: <ClockCircleOutlined />,
};

const SMSDashboardPage: React.FC = () => {
  const [sendForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  const [logFilters, setLogFilters] = useState<Record<string, string>>({});
  const [templateModal, setTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [charCount, setCharCount] = useState(0);

  const { data: stats } = useSmsStats();
  const { data: templates = [] } = useSmsTemplates();
  const { data: logs = [] } = useSmsLogs(logFilters);
  const sendSms = useSendSms();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const handleSend = async (values: { recipient: string; message: string; templateId?: string }) => {
    await sendSms.mutateAsync(values);
    sendForm.resetFields();
    setCharCount(0);
  };

  const handleSaveTemplate = async (values: { name: string; template: string; category: string }) => {
    if (editingTemplate) {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, data: values });
    } else {
      await createTemplate.mutateAsync(values);
    }
    setTemplateModal(false);
    setEditingTemplate(null);
    templateForm.resetFields();
  };

  const openEditTemplate = (t: SmsTemplate) => {
    setEditingTemplate(t);
    templateForm.setFieldsValue(t);
    setTemplateModal(true);
  };

  const logCols = [
    { title: 'Recipient', dataIndex: 'recipient', width: 140 },
    {
      title: 'Message',
      dataIndex: 'message',
      render: (v: string) => <Text ellipsis={{ tooltip: v }} style={{ maxWidth: 220 }}>{v}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => (
        <Badge
          color={statusColor[v]}
          text={<Tag color={statusColor[v]} icon={statusIcon[v]}>{v}</Tag>}
        />
      ),
    },
    {
      title: 'Sent At',
      dataIndex: 'sentAt',
      width: 160,
      render: (v: string) => v ? dayjs(v).format('MMM D, YYYY HH:mm') : '—',
    },
    {
      title: 'Message ID',
      dataIndex: 'messageId',
      width: 160,
      render: (v: string) => v || '—',
    },
  ];

  const templateCols = [
    { title: 'Name', dataIndex: 'name', width: 200 },
    { title: 'Category', dataIndex: 'category', width: 120 },
    {
      title: 'Template',
      dataIndex: 'template',
      render: (v: string) => <Text ellipsis={{ tooltip: v }} style={{ maxWidth: 320 }}>{v}</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_: unknown, row: SmsTemplate) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditTemplate(row)} />
          <Popconfirm
            title="Delete this template?"
            onConfirm={() => deleteTemplate.mutate(row.id)}
            okText="Delete"
            okType="danger"
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'send',
      label: 'Send SMS',
      children: (
        <Card>
          <Form form={sendForm} layout="vertical" onFinish={handleSend} style={{ maxWidth: 600 }}>
            <Form.Item name="recipient" label="Recipient Phone" rules={[{ required: true }]}>
              <Input placeholder="+63 9XX XXX XXXX" prefix={<MessageOutlined />} />
            </Form.Item>
            <Form.Item name="templateId" label="Use Template (optional)">
              <Select
                allowClear
                placeholder="Select a template"
                options={templates.map((t) => ({ label: `${t.name} (${t.category})`, value: t.id }))}
                onChange={(val) => {
                  const t = templates.find((tmpl) => tmpl.id === val);
                  if (t) {
                    sendForm.setFieldValue('message', t.template);
                    setCharCount(t.template.length);
                  }
                }}
              />
            </Form.Item>
            <Form.Item
              name="message"
              label={
                <span>
                  Message{' '}
                  <Text type={charCount > 160 ? 'danger' : 'secondary'}>
                    ({charCount}/160)
                  </Text>
                </span>
              }
              rules={[{ required: true }]}
            >
              <TextArea
                rows={4}
                maxLength={160}
                showCount
                onChange={(e) => setCharCount(e.target.value.length)}
                placeholder="Type your message here..."
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={sendSms.isPending}
            >
              Send SMS
            </Button>
          </Form>
        </Card>
      ),
    },
    {
      key: 'logs',
      label: 'SMS Logs',
      children: (
        <Card>
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              placeholder="Filter by status"
              allowClear
              style={{ width: 140 }}
              onChange={(v) => setLogFilters((f) => ({ ...f, status: v || '' }))}
              options={[
                { label: 'Sent', value: 'SENT' },
                { label: 'Failed', value: 'FAILED' },
                { label: 'Pending', value: 'PENDING' },
              ]}
            />
            <Input
              placeholder="Filter by recipient"
              allowClear
              style={{ width: 200 }}
              onChange={(e) =>
                setLogFilters((f) => ({ ...f, recipient: e.target.value }))
              }
            />
            <RangePicker
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setLogFilters((f) => ({
                    ...f,
                    dateFrom: dates[0]!.toISOString(),
                    dateTo: dates[1]!.toISOString(),
                  }));
                } else {
                  setLogFilters((f) => {
                    const copy = { ...f };
                    delete copy.dateFrom;
                    delete copy.dateTo;
                    return copy;
                  });
                }
              }}
            />
          </Space>
          <Table
            dataSource={logs}
            columns={logCols}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20 }}
          />
        </Card>
      ),
    },
    {
      key: 'templates',
      label: 'Templates',
      children: (
        <Card
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTemplate(null);
                templateForm.resetFields();
                setTemplateModal(true);
              }}
            >
              Add Template
            </Button>
          }
        >
          <Table
            dataSource={templates}
            columns={templateCols}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </Card>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 16 }}>
        <MessageOutlined /> SMS Notifications
      </Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Total Sent" value={stats?.totalSent || 0} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Delivered Today" value={stats?.todayCount || 0} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Failed" value={stats?.failed || 0} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Templates" value={stats?.templateCount || 0} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>

      <Tabs items={tabItems} />

      <Modal
        title={editingTemplate ? 'Edit Template' : 'Add Template'}
        open={templateModal}
        onCancel={() => {
          setTemplateModal(false);
          setEditingTemplate(null);
          templateForm.resetFields();
        }}
        onOk={() => templateForm.submit()}
        confirmLoading={createTemplate.isPending || updateTemplate.isPending}
      >
        <Form form={templateForm} layout="vertical" onFinish={handleSaveTemplate}>
          <Form.Item name="name" label="Template Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. APPOINTMENT_REMINDER" />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Appointment', value: 'APPOINTMENT' },
                { label: 'Billing', value: 'BILLING' },
                { label: 'Laboratory', value: 'LABORATORY' },
                { label: 'Pharmacy', value: 'PHARMACY' },
                { label: 'General', value: 'GENERAL' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="template"
            label="Template Text"
            extra="Use {{variableName}} for placeholders, e.g. {{patientName}}, {{date}}"
            rules={[{ required: true }]}
          >
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SMSDashboardPage;
