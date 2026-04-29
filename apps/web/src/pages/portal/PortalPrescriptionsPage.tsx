import React, { useState } from 'react';
import {
  Table, Card, Tag, Typography, Space, Modal, Descriptions,
  List, Empty, Tabs,
} from 'antd';
import { MedicineBoxOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import portalApi from '../../lib/portalApi';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'green', DISPENSED: 'blue', CANCELLED: 'red',
};

const PortalPrescriptionsPage: React.FC = () => {
  const [selected, setSelected] = useState<any>(null);

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['portal-prescriptions'],
    queryFn: () => portalApi.get('/patient-portal/prescriptions').then((r) => r.data?.data || []),
  });

  const active = prescriptions.filter((p: any) => p.status === 'ACTIVE');
  const past   = prescriptions.filter((p: any) => p.status !== 'ACTIVE');

  const columns = [
    {
      title: 'Rx Number',
      dataIndex: 'rxNo',
      render: (v: string) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'Medications',
      key: 'items',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={2}>
          {(r.items || []).slice(0, 2).map((item: any, i: number) => (
            <Text key={i} style={{ fontSize: 12 }}>
              {item.drugName}
              {item.dosage ? ` ${item.dosage}` : ''}
              {item.frequency ? ` — ${item.frequency}` : ''}
            </Text>
          ))}
          {r.items?.length > 2 && (
            <Text type="secondary" style={{ fontSize: 11 }}>+{r.items.length - 2} more</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Prescribed By',
      dataIndex: 'prescribedBy',
      render: (v?: string) => v || '—',
    },
    {
      title: 'Date',
      dataIndex: 'prescribedAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => <Tag color={STATUS_COLOR[s] || 'default'}>{s}</Tag>,
    },
    {
      title: '',
      key: 'action',
      render: (_: any, r: any) => (
        <EyeOutlined
          style={{ color: '#0d9488', cursor: 'pointer', fontSize: 16 }}
          onClick={() => setSelected(r)}
        />
      ),
    },
  ];

  const tabItems = [
    {
      key: 'active',
      label: <span style={{ color: active.length > 0 ? '#16a34a' : undefined }}>Active ({active.length})</span>,
      children: (
        <Table
          dataSource={active}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: <Empty description="No active prescriptions" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      ),
    },
    {
      key: 'past',
      label: `Past (${past.length})`,
      children: (
        <Table
          dataSource={past}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ margin: '0 0 20px', color: '#0f766e' }}>
        <MedicineBoxOutlined /> My Prescriptions
      </Title>

      <Card style={{ borderRadius: 12, border: 'none' }} loading={isLoading}>
        <Tabs items={tabItems} />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <MedicineBoxOutlined style={{ color: '#d97706' }} />
            Prescription — Rx #{selected?.rxNo}
          </Space>
        }
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        width={560}
      >
        {selected && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Rx Number" span={2}>
                <Text strong style={{ fontFamily: 'monospace' }}>{selected.rxNo}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR[selected.status]}>{selected.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Prescribed By">
                {selected.prescribedBy || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Date" span={2}>
                {dayjs(selected.prescribedAt).format('MMMM D, YYYY h:mm A')}
              </Descriptions.Item>
              {selected.notes && (
                <Descriptions.Item label="Notes" span={2}>{selected.notes}</Descriptions.Item>
              )}
            </Descriptions>

            <Title level={5} style={{ color: '#0f766e' }}>Medications</Title>
            <List
              dataSource={selected.items || []}
              renderItem={(item: any) => (
                <List.Item style={{ padding: '10px 0' }}>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Text strong>{item.drugName}</Text>
                    <Space wrap>
                      {item.dosage && <Tag>{item.dosage}</Tag>}
                      {item.frequency && <Tag color="blue">{item.frequency}</Tag>}
                      {item.duration && <Tag color="cyan">{item.duration}</Tag>}
                      {item.quantity && <Text type="secondary">Qty: {item.quantity}</Text>}
                    </Space>
                    {item.instructions && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Instructions: {item.instructions}
                      </Text>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default PortalPrescriptionsPage;
