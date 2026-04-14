import React from 'react';
import {
  Card, Form, Input, Select, Button, Typography, Row, Col, Space, InputNumber, DatePicker,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useLogMaintenance, useAsset } from '../../hooks/useAssets';

const { Title, Text } = Typography;

const MaintenanceFormPage: React.FC = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { data: assetData } = useAsset(assetId || '');
  const logMaintenance = useLogMaintenance();
  const asset = assetData?.data;

  const handleSubmit = async (values: {
    type: string;
    description?: string;
    cost?: number;
    performedAt?: dayjs.Dayjs;
    nextDueDate?: dayjs.Dayjs;
    performedBy?: string;
  }) => {
    if (!assetId) return;
    await logMaintenance.mutateAsync({
      id: assetId,
      data: {
        type: values.type,
        description: values.description,
        cost: values.cost,
        performedAt: values.performedAt?.toISOString(),
        nextDueDate: values.nextDueDate?.toISOString(),
        performedBy: values.performedBy,
      },
    });
    navigate('/assets');
  };

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/assets')} style={{ marginRight: 12 }} />
          <Title level={4} style={{ margin: 0, display: 'inline' }}>Log Maintenance</Title>
        </Col>
      </Row>

      {asset && (
        <Card size="small" style={{ marginBottom: 16, background: '#f9f9f9' }}>
          <Text strong>{asset.assetName}</Text>
          <Text type="secondary" style={{ marginLeft: 12 }}>{asset.assetCode}</Text>
          {asset.category && <Text type="secondary" style={{ marginLeft: 12 }}>· {asset.category}</Text>}
        </Card>
      )}

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Maintenance Type"
                name="type"
                rules={[{ required: true, message: 'Please select type' }]}
              >
                <Select
                  options={[
                    { value: 'PREVENTIVE', label: 'Preventive' },
                    { value: 'CORRECTIVE', label: 'Corrective' },
                    { value: 'EMERGENCY', label: 'Emergency' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Date Performed" name="performedAt" initialValue={dayjs()}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Next Due Date" name="nextDueDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Please describe the maintenance' }]}>
                <Input.TextArea rows={3} placeholder="Describe what was done..." />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Cost (₱)" name="cost" initialValue={0}>
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={v => `₱ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number(v?.replace(/₱\s?|(,*)/g, ''))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Performed By" name="performedBy">
                <Input placeholder="Technician / vendor name" />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={logMaintenance.isPending}>
              Log Maintenance
            </Button>
            <Button onClick={() => navigate('/assets')}>Cancel</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default MaintenanceFormPage;
