import React from 'react';
import {
  Table,
  Typography,
  Row,
  Col,
  Card,
  Tag,
  Alert,
  Tabs,
  Button,
} from 'antd';
import { WarningOutlined, ClockCircleOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useLowStockAlerts, useExpiryAlerts } from '../../hooks/usePharmacy';

const { Title, Text } = Typography;

interface InventoryItem {
  id: string;
  itemName: string;
  itemCode: string;
  category?: string;
  unit?: string;
  currentStock: number;
  minimumStock: number;
  expiryDate?: string;
  supplier?: { name: string; phone?: string };
  medication?: { genericName: string; brandName?: string };
}

const InventoryAlertPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: lowStockData, isLoading: lowLoading } = useLowStockAlerts();
  const { data: expiryData, isLoading: expiryLoading } = useExpiryAlerts();

  const lowStockItems: InventoryItem[] = lowStockData?.data || [];
  const expiryItems: InventoryItem[] = expiryData?.data || [];

  const lowStockColumns = [
    {
      title: 'Item',
      key: 'item',
      render: (_: unknown, row: InventoryItem) => (
        <div>
          <Text strong>{row.itemName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{row.itemCode}</Text>
        </div>
      ),
    },
    { title: 'Category', dataIndex: 'category', render: (v?: string) => v || '—' },
    {
      title: 'Current Stock',
      key: 'stock',
      render: (_: unknown, row: InventoryItem) => (
        <Text style={{ color: row.currentStock === 0 ? '#dc2626' : '#d97706', fontWeight: 700 }}>
          {row.currentStock} {row.unit || 'units'}
        </Text>
      ),
    },
    {
      title: 'Minimum Stock',
      dataIndex: 'minimumStock',
      render: (v: number, row: InventoryItem) => `${v} ${row.unit || 'units'}`,
    },
    {
      title: 'Deficit',
      key: 'deficit',
      render: (_: unknown, row: InventoryItem) => {
        const deficit = row.minimumStock - row.currentStock;
        return <Tag color="red">-{deficit} {row.unit || 'units'}</Tag>;
      },
    },
    {
      title: 'Urgency',
      key: 'urgency',
      render: (_: unknown, row: InventoryItem) => {
        if (row.currentStock === 0) return <Tag color="red">Critical — Out of Stock</Tag>;
        const ratio = row.currentStock / row.minimumStock;
        if (ratio <= 0.25) return <Tag color="red">Critical</Tag>;
        if (ratio <= 0.5) return <Tag color="orange">High</Tag>;
        return <Tag color="gold">Moderate</Tag>;
      },
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_: unknown, row: InventoryItem) =>
        row.supplier ? `${row.supplier.name}${row.supplier.phone ? ` (${row.supplier.phone})` : ''}` : '—',
    },
  ];

  const expiryColumns = [
    {
      title: 'Item',
      key: 'item',
      render: (_: unknown, row: InventoryItem) => (
        <div>
          <Text strong>{row.itemName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{row.itemCode}</Text>
        </div>
      ),
    },
    { title: 'Category', dataIndex: 'category', render: (v?: string) => v || '—' },
    {
      title: 'Current Stock',
      key: 'stock',
      render: (_: unknown, row: InventoryItem) => `${row.currentStock} ${row.unit || 'units'}`,
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      render: (v: string) => {
        const daysLeft = dayjs(v).diff(dayjs(), 'day');
        return (
          <span>
            <Tag color={daysLeft <= 7 ? 'red' : daysLeft <= 14 ? 'orange' : 'gold'}>
              {dayjs(v).format('MMM D, YYYY')}
            </Tag>
          </span>
        );
      },
    },
    {
      title: 'Days Until Expiry',
      key: 'daysLeft',
      render: (_: unknown, row: InventoryItem) => {
        if (!row.expiryDate) return '—';
        const days = dayjs(row.expiryDate).diff(dayjs(), 'day');
        return (
          <Text style={{ color: days <= 7 ? '#dc2626' : days <= 14 ? '#d97706' : '#92400e', fontWeight: 700 }}>
            {days} day{days !== 1 ? 's' : ''}
          </Text>
        );
      },
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_: unknown, row: InventoryItem) => row.supplier?.name || '—',
    },
  ];

  const tabItems = [
    {
      key: 'low-stock',
      label: (
        <span style={{ color: lowStockItems.length > 0 ? '#dc2626' : undefined }}>
          <WarningOutlined /> Low Stock ({lowStockItems.length})
        </span>
      ),
      children: (
        <>
          {lowStockItems.length > 0 && (
            <Alert
              type="error"
              message={`${lowStockItems.length} item(s) below minimum stock level`}
              style={{ marginBottom: 12 }}
              showIcon
            />
          )}
          <Table
            dataSource={lowStockItems}
            columns={lowStockColumns}
            rowKey="id"
            loading={lowLoading}
            pagination={false}
            size="small"
          />
        </>
      ),
    },
    {
      key: 'expiring',
      label: (
        <span style={{ color: expiryItems.length > 0 ? '#d97706' : undefined }}>
          <ClockCircleOutlined /> Expiring Soon ({expiryItems.length})
        </span>
      ),
      children: (
        <>
          {expiryItems.length > 0 && (
            <Alert
              type="warning"
              message={`${expiryItems.length} item(s) expiring within 30 days`}
              style={{ marginBottom: 12 }}
              showIcon
            />
          )}
          <Table
            dataSource={expiryItems}
            columns={expiryColumns}
            rowKey="id"
            loading={expiryLoading}
            pagination={false}
            size="small"
          />
        </>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Stock Alerts</Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => navigate('/pharmacy/purchase-orders/new')}
          >
            Create Purchase Order
          </Button>
        </Col>
      </Row>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default InventoryAlertPage;
