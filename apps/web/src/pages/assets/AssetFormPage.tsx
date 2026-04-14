import React, { useEffect } from 'react';
import {
  Card, Form, Input, Select, Button, Typography, Row, Col, Space, InputNumber, DatePicker,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useCreateAsset, useUpdateAsset, useAsset } from '../../hooks/useAssets';

const { Title } = Typography;

const ASSET_CATEGORIES = ['Medical Equipment', 'Furniture', 'IT Equipment', 'Vehicles', 'Building'];

const AssetFormPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: assetData } = useAsset(id || '');
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();

  const asset = assetData?.data;

  useEffect(() => {
    if (asset && isEdit) {
      form.setFieldsValue({
        ...asset,
        purchaseDate: asset.purchaseDate ? dayjs(asset.purchaseDate) : null,
      });
    }
  }, [asset, isEdit, form]);

  // Auto-suggest asset code based on category
  const handleCategoryChange = (cat: string) => {
    if (!isEdit && !form.getFieldValue('assetCode')) {
      const prefix = cat.split(' ').map((w: string) => w[0]).join('').toUpperCase();
      const year = new Date().getFullYear();
      const rand = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
      form.setFieldValue('assetCode', `${prefix}-${year}-${rand}`);
    }
  };

  const handleSubmit = async (values: {
    assetCode: string;
    assetName: string;
    category?: string;
    departmentId?: string;
    purchaseDate?: dayjs.Dayjs;
    purchaseCost?: number;
    serialNo?: string;
    location?: string;
    notes?: string;
  }) => {
    const data = {
      ...values,
      purchaseDate: values.purchaseDate ? values.purchaseDate.toISOString() : undefined,
    };

    if (isEdit && id) {
      await updateAsset.mutateAsync({ id, data });
    } else {
      await createAsset.mutateAsync(data);
    }
    navigate('/assets');
  };

  const isLoading = createAsset.isPending || updateAsset.isPending;

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/assets')} style={{ marginRight: 12 }} />
          <Title level={4} style={{ margin: 0, display: 'inline' }}>
            {isEdit ? 'Edit Asset' : 'Register Asset'}
          </Title>
        </Col>
      </Row>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Asset Code"
                name="assetCode"
                rules={[{ required: true, message: 'Required' }]}
                tooltip="Auto-suggested when you select a category. Can be edited."
              >
                <Input placeholder="e.g., ME-2026-001" disabled={isEdit} />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item
                label="Asset Name"
                name="assetName"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="e.g., Ultrasound Machine, Hospital Bed..." />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Category" name="category">
                <Select
                  placeholder="Select category"
                  allowClear
                  onChange={handleCategoryChange}
                  options={ASSET_CATEGORIES.map(c => ({ value: c, label: c }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Serial Number" name="serialNo">
                <Input placeholder="Manufacturer serial number..." />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Location" name="location">
                <Input placeholder="e.g., Ward 2, Room 204, ICU..." />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Purchase Date" name="purchaseDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Purchase Cost (₱)" name="purchaseCost" initialValue={0}>
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={v => `₱ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number(v?.replace(/₱\s?|(,*)/g, ''))}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={3} placeholder="Additional notes, specifications..." />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              {isEdit ? 'Save Changes' : 'Register Asset'}
            </Button>
            <Button onClick={() => navigate('/assets')}>Cancel</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default AssetFormPage;
