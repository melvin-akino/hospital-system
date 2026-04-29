import React, { useState } from 'react';
import { Modal, Input, Table, Space, Typography, Tag } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const { Text } = Typography;

interface Patient {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  contactNumber?: string;
}

interface PatientSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (patient: Patient) => void;
}

const PatientSearchModal: React.FC<PatientSearchModalProps> = ({ open, onClose, onSelect }) => {
  const [search, setSearch] = useState('');

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patient-search', search],
    queryFn: () =>
      api.get('/patients', { params: { search, limit: 30 } })
        .then((r) => r.data?.data?.data || r.data?.data || []),
    enabled: open,
  });

  const columns = [
    {
      title: 'Patient',
      render: (_: any, r: Patient) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.firstName} {r.lastName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.patientNo}</Text>
        </Space>
      ),
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      render: (v: string) => v ? <Tag>{v}</Tag> : '—',
      width: 80,
    },
    {
      title: 'Contact',
      dataIndex: 'contactNumber',
      render: (v: string) => v || '—',
      width: 120,
    },
    {
      title: '',
      render: (_: any, r: Patient) => (
        <a onClick={() => { onSelect(r); onClose(); }}>Select</a>
      ),
      width: 70,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          Search Patient
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search by name or patient number..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
        autoFocus
        allowClear
      />
      <Table
        dataSource={patients || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 8, size: 'small' }}
        onRow={(r) => ({
          style: { cursor: 'pointer' },
          onClick: () => { onSelect(r); onClose(); },
        })}
      />
    </Modal>
  );
};

export default PatientSearchModal;
