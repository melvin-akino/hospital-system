import React, { useState } from 'react';
import {
  Row, Col, Card, Typography, Tag, Button, Modal, Form, Select, DatePicker, Space,
  Alert, Statistic, AutoComplete, Spin,
} from 'antd';
import { PlusOutlined, AlertOutlined, UserAddOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useBloodInventory, useExpiryAlerts, useCollectUnit } from '../../hooks/useBloodBank';
import type { BloodInventoryItem, BloodUnit } from '../../services/bloodbankService';
import api from '../../lib/api';

const { Title, Text } = Typography;

const BLOOD_TYPES = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'];

const formatBloodType = (bt: string) =>
  bt.replace('_POSITIVE', '+').replace('_NEGATIVE', '-').replace('_', ' ');

const getInventoryColor = (available: number) => {
  if (available < 2) return '#ff4d4f';
  if (available < 5) return '#faad14';
  return '#52c41a';
};

interface DonorOption {
  value: string;
  label: string;
  id: string;
  bloodType: string;
}

const BloodInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [collectModal, setCollectModal] = useState(false);
  const [collectForm] = Form.useForm();
  const [donorOptions, setDonorOptions] = useState<DonorOption[]>([]);
  const [donorSearching, setDonorSearching] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState<string>('');

  const { data: inventoryData, isLoading: inventoryLoading } = useBloodInventory();
  const { data: expiryData } = useExpiryAlerts();
  const collectUnit = useCollectUnit();

  const inventory: BloodInventoryItem[] = inventoryData?.data || [];
  const expiryAlerts: BloodUnit[] = expiryData?.data || [];

  const searchDonors = async (value: string) => {
    if (value.length < 2) return;
    setDonorSearching(true);
    try {
      const res = await api.get('/blood-donors', { params: { search: value, limit: 10 } });
      setDonorOptions(
        (res.data?.data || []).map((d: { id: string; firstName: string; lastName: string; bloodType: string }) => ({
          value: `${d.lastName}, ${d.firstName}`,
          label: `${d.lastName}, ${d.firstName} — ${formatBloodType(d.bloodType)}`,
          id: d.id,
          bloodType: d.bloodType,
        }))
      );
    } finally {
      setDonorSearching(false);
    }
  };

  const handleCollect = async (values: {
    donorDisplay: string;
    bloodType: string;
    collectedAt: dayjs.Dayjs;
    expiryDate?: dayjs.Dayjs;
  }) => {
    await collectUnit.mutateAsync({
      donorId: selectedDonorId || undefined,
      bloodType: values.bloodType,
      collectedAt: values.collectedAt.toISOString(),
      expiryDate: values.expiryDate ? values.expiryDate.toISOString() : undefined,
    });
    setCollectModal(false);
    collectForm.resetFields();
    setSelectedDonorId('');
  };

  const totalAvailable = inventory.reduce((s, i) => s + i.available, 0);
  const criticalTypes = inventory.filter(i => i.available < 2);

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Blood Bank Inventory</Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<UserAddOutlined />} onClick={() => navigate('/bloodbank/donors')}>
              Register Donor
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCollectModal(true)}>
              Collect Unit
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Total Available Units" value={totalAvailable} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Expiring Soon (7 days)"
              value={expiryAlerts.length}
              valueStyle={{ color: expiryAlerts.length > 0 ? '#faad14' : '#52c41a' }}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Critical Stock Types"
              value={criticalTypes.length}
              valueStyle={{ color: criticalTypes.length > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Blood Types Tracked" value={inventory.length} />
          </Card>
        </Col>
      </Row>

      {criticalTypes.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Critical Blood Stock: ${criticalTypes.map(t => formatBloodType(t.bloodType)).join(', ')}`}
          description="These blood types have fewer than 2 units available. Immediate action required."
        />
      )}

      {/* Blood Type Inventory Grid */}
      <Title level={5} style={{ marginBottom: 12 }}>Blood Type Inventory</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {inventoryLoading
          ? Array(8).fill(0).map((_, i) => <Col key={i} xs={12} sm={8} md={6}><Card loading /></Col>)
          : BLOOD_TYPES.map(bt => {
              const item = inventory.find(i => i.bloodType === bt) || {
                bloodType: bt, available: 0, reserved: 0, total: 0, expiringSoon: 0,
              };
              const color = getInventoryColor(item.available);
              return (
                <Col key={bt} xs={12} sm={8} md={6}>
                  <Card
                    style={{ borderTop: `4px solid ${color}`, textAlign: 'center' }}
                    size="small"
                  >
                    <div style={{ fontSize: 24, fontWeight: 700, color }}>
                      {formatBloodType(bt)}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1.2 }}>
                      {item.available}
                    </div>
                    <div style={{ color: '#999', fontSize: 12 }}>available units</div>
                    <div style={{ marginTop: 4 }}>
                      <Tag color={color === '#ff4d4f' ? 'red' : color === '#faad14' ? 'warning' : 'success'}>
                        {item.available < 2 ? 'CRITICAL' : item.available < 5 ? 'LOW' : 'OK'}
                      </Tag>
                    </div>
                    {item.expiringSoon > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <Tag color="orange" style={{ fontSize: 10 }}>
                          {item.expiringSoon} expiring soon
                        </Tag>
                      </div>
                    )}
                    {item.reserved > 0 && (
                      <div style={{ marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{item.reserved} reserved</Text>
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })
        }
      </Row>

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <>
          <Title level={5} style={{ marginBottom: 12 }}>
            <AlertOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Units Expiring Within 7 Days
          </Title>
          <Row gutter={[12, 12]}>
            {expiryAlerts.map((unit: BloodUnit) => {
              const daysLeft = Math.ceil((new Date(unit.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <Col key={unit.id} xs={24} sm={12} md={8}>
                  <Card
                    size="small"
                    style={{ borderLeft: `4px solid ${daysLeft <= 2 ? '#ff4d4f' : '#faad14'}` }}
                  >
                    <Text strong>{unit.unitCode}</Text>
                    <Tag color={formatBloodType(unit.bloodType).includes('+') ? 'red' : 'blue'} style={{ marginLeft: 8 }}>
                      {formatBloodType(unit.bloodType)}
                    </Tag>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Expires: {dayjs(unit.expiryDate).format('MMM D, YYYY')}
                    </Text>
                    <Tag color={daysLeft <= 2 ? 'red' : 'orange'} style={{ float: 'right', fontSize: 10 }}>
                      {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                    </Tag>
                    {unit.donor && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Donor: {unit.donor.lastName}, {unit.donor.firstName}
                        </Text>
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      )}

      {/* Collect Unit Modal */}
      <Modal
        title="Collect Blood Unit"
        open={collectModal}
        onCancel={() => { setCollectModal(false); collectForm.resetFields(); setSelectedDonorId(''); }}
        onOk={() => collectForm.submit()}
        okText="Collect"
        confirmLoading={collectUnit.isPending}
      >
        <Form form={collectForm} layout="vertical" onFinish={handleCollect}>
          <Form.Item label="Donor (optional)" name="donorDisplay">
            <AutoComplete
              options={donorOptions}
              onSearch={searchDonors}
              onSelect={(_v, opt: DonorOption) => {
                setSelectedDonorId(opt.id);
                if (opt.bloodType) collectForm.setFieldValue('bloodType', opt.bloodType);
              }}
              placeholder="Search donor by name..."
              notFoundContent={donorSearching ? <Spin size="small" /> : 'No donors found'}
              allowClear
            />
          </Form.Item>
          <Form.Item
            label="Blood Type"
            name="bloodType"
            rules={[{ required: true, message: 'Please select blood type' }]}
          >
            <Select
              options={BLOOD_TYPES.map(bt => ({ value: bt, label: formatBloodType(bt) }))}
              placeholder="Select blood type"
            />
          </Form.Item>
          <Form.Item
            label="Collection Date"
            name="collectedAt"
            initialValue={dayjs()}
            rules={[{ required: true, message: 'Please select collection date' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Expiry Date (default: +35 days)" name="expiryDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BloodInventoryPage;
