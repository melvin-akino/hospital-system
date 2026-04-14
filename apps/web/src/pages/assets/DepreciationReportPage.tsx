import React, { useState } from 'react';
import {
  Table, Button, Typography, Row, Col, Card, Modal, Form, InputNumber, Select, Progress,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAssets, useDepreciate } from '../../hooks/useAssets';
import type { Asset } from '../../services/assetService';

const { Title, Text } = Typography;

const formatPeso = (v: number) => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const DepreciationReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [depreciateModal, setDepreciateModal] = useState<{ open: boolean; asset?: Asset }>({ open: false });
  const [depreciateForm] = Form.useForm();

  const { data, isLoading } = useAssets({ page, limit: 50, status: 'ACTIVE' });
  const depreciate = useDepreciate();

  const handleDepreciate = async (values: { depreciationRate: number; method: string }) => {
    if (!depreciateModal.asset) return;
    await depreciate.mutateAsync({
      id: depreciateModal.asset.id,
      data: { depreciationRate: values.depreciationRate, method: values.method },
    });
    setDepreciateModal({ open: false });
    depreciateForm.resetFields();
  };

  const columns = [
    {
      title: 'Asset Code',
      dataIndex: 'assetCode',
      render: (v: string) => <Text strong style={{ color: '#1890ff' }}>{v}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'assetName',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      render: (v: string) => v || '—',
    },
    {
      title: 'Purchase Cost',
      dataIndex: 'purchaseCost',
      render: (v: number) => formatPeso(Number(v)),
    },
    {
      title: 'Current Value',
      dataIndex: 'currentValue',
      render: (v: number) => <Text strong>{formatPeso(Number(v))}</Text>,
    },
    {
      title: 'Depreciation Amount',
      key: 'depreciationAmount',
      render: (_: unknown, row: Asset) => {
        const amount = Number(row.purchaseCost) - Number(row.currentValue);
        return <Text type="danger">{formatPeso(amount)}</Text>;
      },
    },
    {
      title: '% Depreciated',
      key: 'percentDepreciated',
      render: (_: unknown, row: Asset) => {
        const pct = Number(row.purchaseCost) > 0
          ? Math.round(((Number(row.purchaseCost) - Number(row.currentValue)) / Number(row.purchaseCost)) * 100)
          : 0;
        return (
          <div style={{ minWidth: 100 }}>
            <Progress
              percent={pct}
              size="small"
              strokeColor={pct > 80 ? '#ff4d4f' : pct > 50 ? '#faad14' : '#1890ff'}
            />
          </div>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, row: Asset) => (
        <Button
          size="small"
          type="primary"
          ghost
          onClick={() => { setDepreciateModal({ open: true, asset: row }); }}
        >
          Apply Depreciation
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/assets')} style={{ marginRight: 12 }} />
          <Title level={4} style={{ margin: 0, display: 'inline' }}>Depreciation Report</Title>
        </Col>
      </Row>

      <Card>
        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 50,
            total: data?.total || 0,
            onChange: setPage,
          }}
          summary={(pageData) => {
            const totalPurchase = pageData.reduce((s, r) => s + Number(r.purchaseCost), 0);
            const totalCurrent = pageData.reduce((s, r) => s + Number(r.currentValue), 0);
            const totalDepr = totalPurchase - totalCurrent;
            return (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>Page Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <Text strong>{formatPeso(totalPurchase)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <Text strong>{formatPeso(totalCurrent)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    <Text type="danger" strong>{formatPeso(totalDepr)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} colSpan={2} />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>

      {/* Depreciation Modal */}
      <Modal
        title={`Apply Depreciation — ${depreciateModal.asset?.assetName || ''}`}
        open={depreciateModal.open}
        onCancel={() => { setDepreciateModal({ open: false }); depreciateForm.resetFields(); }}
        onOk={() => depreciateForm.submit()}
        okText="Apply"
        confirmLoading={depreciate.isPending}
      >
        {depreciateModal.asset && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <Text strong>{depreciateModal.asset.assetName}</Text>
            <br />
            <Text type="secondary">
              Current Value: {formatPeso(Number(depreciateModal.asset.currentValue))}
            </Text>
            <br />
            <Text type="secondary">
              Purchase Cost: {formatPeso(Number(depreciateModal.asset.purchaseCost))}
            </Text>
          </div>
        )}
        <Form form={depreciateForm} layout="vertical" onFinish={handleDepreciate}>
          <Form.Item
            label="Depreciation Method"
            name="method"
            initialValue="STRAIGHT_LINE"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'STRAIGHT_LINE', label: 'Straight Line' },
                { value: 'DECLINING_BALANCE', label: 'Declining Balance' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Depreciation Rate (%)"
            name="depreciationRate"
            rules={[{ required: true, message: 'Please enter rate' }]}
            tooltip="e.g., 10 for 10% per year"
          >
            <InputNumber min={0.1} max={100} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepreciationReportPage;
