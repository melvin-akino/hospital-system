import React, { useState } from 'react';
import {
  Table, Card, Tag, Typography, Space, Modal, Descriptions,
  Empty, Alert, Badge,
} from 'antd';
import { ExperimentOutlined, WarningOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { App } from 'antd';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import portalApi from '../../lib/portalApi';

const { Title, Text } = Typography;

const PortalLabResultsPage: React.FC = () => {
  const [selected, setSelected] = useState<any>(null);
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['portal-lab-results'],
    queryFn: () => portalApi.get('/patient-portal/lab-results').then((r) => r.data?.data || []),
  });

  const abnormalCount = results.filter((r: any) => r.isAbnormal).length;

  const columns = [
    {
      title: 'Test Name',
      key: 'test',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.requisition?.testName || 'Lab Test'}</Text>
          {r.requisition?.requisitionNo && (
            <Text type="secondary" style={{ fontSize: 11 }}>Req# {r.requisition.requisitionNo}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Result',
      key: 'result',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: r.isAbnormal ? '#dc2626' : undefined }}>
            {r.resultValue || '—'} {r.unit || ''}
          </Text>
          {r.referenceRange && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Normal: {r.referenceRange}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, r: any) =>
        r.isAbnormal
          ? <Tag icon={<WarningOutlined />} color="orange">Abnormal</Tag>
          : <Tag icon={<CheckCircleOutlined />} color="green">Normal</Tag>,
    },
    {
      title: 'Date',
      key: 'resultDate',
      render: (_: any, r: any) =>
        r.resultDate ? dayjs(r.resultDate).format('MMM D, YYYY') : '—',
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

  return (
    <div>
      <Space style={{ marginBottom: 20, width: '100%', justifyContent: 'space-between' }}>
        <Title level={4} style={{ margin: 0, color: '#0f766e' }}>
          <ExperimentOutlined /> My Lab Results
        </Title>
        {abnormalCount > 0 && (
          <Badge count={abnormalCount} offset={[6, 0]}>
            <Alert
              type="warning"
              showIcon
              message={`${abnormalCount} abnormal result(s) — please consult your doctor`}
              style={{ margin: 0 }}
            />
          </Badge>
        )}
      </Space>

      <Card style={{ borderRadius: 12, border: 'none' }}>
        <Table
          dataSource={results}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 15, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="No lab results yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          rowClassName={(r: any) => r.isAbnormal ? 'row-abnormal' : ''}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <ExperimentOutlined style={{ color: '#7c3aed' }} />
            {selected?.requisition?.testName || 'Lab Result Detail'}
          </Space>
        }
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        width={540}
      >
        {selected && (
          <>
            {selected.isAbnormal && (
              <Alert
                type="warning"
                showIcon
                message="This result is outside the normal reference range. Please consult your doctor."
                style={{ marginBottom: 16 }}
              />
            )}
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Test Name">
                {selected.requisition?.testName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Requisition #">
                {selected.requisition?.requisitionNo || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Result Value">
                <Text strong style={{ color: selected.isAbnormal ? '#dc2626' : undefined }}>
                  {selected.resultValue || '—'} {selected.unit || ''}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Reference Range">
                {selected.referenceRange || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {selected.isAbnormal
                  ? <Tag color="orange">Abnormal</Tag>
                  : <Tag color="green">Normal</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Result Date">
                {selected.resultDate ? dayjs(selected.resultDate).format('MMMM D, YYYY h:mm A') : '—'}
              </Descriptions.Item>
              {selected.remarks && (
                <Descriptions.Item label="Remarks">{selected.remarks}</Descriptions.Item>
              )}
              {selected.interpretation && (
                <Descriptions.Item label="Interpretation">{selected.interpretation}</Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Modal>
    </div>
  );
};

export default PortalLabResultsPage;
