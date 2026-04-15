import React, { useState } from 'react';
import {
  Table,
  Button,
  Typography,
  Row,
  Col,
  Card,
  Select,
  Space,
  Tag,
  Modal,
  AutoComplete,
  Checkbox,
  Statistic,
  Descriptions,
} from 'antd';
import {
  UserAddOutlined,
  CaretRightOutlined,
  CheckOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useDepartmentQueues,
  useQueueStatus,
  useAddToQueue,
  useCallNext,
  useCompleteEntry,
  useSkipEntry,
  useQueueAnalytics,
} from '../../hooks/useQueue';
import { useQueueSocket } from '../../hooks/useQueueSocket';
import { patientService } from '../../services/patientService';

const { Title, Text } = Typography;

interface QueueEntry {
  id: string;
  ticketNo: string;
  priority: number;
  status: string;
  createdAt: string;
  calledAt?: string;
  patient?: { firstName: string; lastName: string; patientNo: string; isSenior: boolean; isPwd: boolean };
}

interface Queue {
  id: string;
  name: string;
  departmentId: string;
  department?: { name: string; code: string };
  waitingCount: number;
}

const QueueManagementPage: React.FC = () => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isSeniorOrPwd, setIsSeniorOrPwd] = useState(false);

  const { data: queuesData } = useDepartmentQueues();
  // Real-time subscription — auto-invalidates query cache on any queue mutation
  useQueueSocket(selectedDeptId);
  const { data: statusData, isLoading: statusLoading } = useQueueStatus(selectedDeptId, 10000);
  const { data: analyticsData } = useQueueAnalytics(selectedDeptId);
  const addToQueue = useAddToQueue();
  const callNext = useCallNext();
  const completeEntry = useCompleteEntry();
  const skipEntry = useSkipEntry();

  const queues: Queue[] = queuesData?.data || [];
  const queueStatus = statusData?.data;
  const analytics = analyticsData?.data;
  const nowServing: QueueEntry | undefined = queueStatus?.nowServing;
  const waiting: QueueEntry[] = queueStatus?.waiting || [];

  const handlePatientSearch = async (q: string) => {
    if (q.length < 2) return;
    const res = await patientService.search(q);
    const patients = res?.data || [];
    setPatientOptions(
      patients.map((p: { id: string; lastName: string; firstName: string; patientNo: string }) => ({
        value: p.id,
        label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
      }))
    );
  };

  const handleAddToQueue = async () => {
    if (!selectedPatientId || !selectedDeptId) return;
    await addToQueue.mutateAsync({
      departmentId: selectedDeptId,
      data: { patientId: selectedPatientId, isSeniorOrPwd },
    });
    setAddModalOpen(false);
    setSelectedPatientId('');
    setIsSeniorOrPwd(false);
  };

  const getWaitMinutes = (createdAt: string) => {
    return dayjs().diff(dayjs(createdAt), 'minute');
  };

  const waitingColumns = [
    {
      title: 'Ticket #',
      dataIndex: 'ticketNo',
      render: (v: string) => <Text strong style={{ fontSize: 16, color: '#1890ff' }}>{v}</Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: QueueEntry) =>
        row.patient
          ? `${row.patient.lastName}, ${row.patient.firstName} (${row.patient.patientNo})`
          : '—',
    },
    {
      title: 'Priority',
      key: 'priority',
      render: (_: unknown, row: QueueEntry) => {
        if (!row.patient) return <Tag>Regular</Tag>;
        if (row.patient.isSenior && row.patient.isPwd) return <Tag color="gold">Senior + PWD</Tag>;
        if (row.patient.isSenior) return <Tag color="gold">Senior</Tag>;
        if (row.patient.isPwd) return <Tag color="purple">PWD</Tag>;
        if (row.priority > 0) return <Tag color="orange">Priority</Tag>;
        return <Tag>Regular</Tag>;
      },
    },
    {
      title: 'Wait Time',
      key: 'wait',
      render: (_: unknown, row: QueueEntry) => {
        const mins = getWaitMinutes(row.createdAt);
        return (
          <Text style={{ color: mins > 30 ? '#dc2626' : mins > 15 ? '#d97706' : undefined }}>
            {mins} min{mins !== 1 ? 's' : ''}
          </Text>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, row: QueueEntry) => (
        <Space>
          <Button
            size="small"
            icon={<CheckOutlined />}
            onClick={() => completeEntry.mutate(row.id)}
          >
            Complete
          </Button>
          <Button
            size="small"
            danger
            icon={<StopOutlined />}
            onClick={() => skipEntry.mutate(row.id)}
          >
            Skip
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Queue Management</Title></Col>
        <Col>
          <Select
            placeholder="Select Department"
            style={{ width: 240 }}
            onChange={(v) => setSelectedDeptId(v)}
            options={queues.map((q) => ({
              value: q.departmentId,
              label: q.department?.name || q.name,
            }))}
          />
        </Col>
      </Row>

      {selectedDeptId && (
        <>
          {/* Analytics Row */}
          {analytics && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="Currently Waiting" value={queueStatus?.waitingCount || 0} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Served Today" value={analytics.totalServedToday} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Avg. Wait Time" value={analytics.avgWaitTimeMinutes} suffix="min" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Skipped Today" value={analytics.skippedToday} />
                </Card>
              </Col>
            </Row>
          )}

          {/* Now Serving + Controls */}
          <Card style={{ marginBottom: 16 }}>
            <Row align="middle" gutter={16}>
              <Col flex="auto">
                {nowServing ? (
                  <Descriptions size="small">
                    <Descriptions.Item label="Now Serving">
                      <Text strong style={{ fontSize: 20, color: '#1890ff' }}>{nowServing.ticketNo}</Text>
                      {nowServing.patient && (
                        <Text style={{ marginLeft: 8 }}>
                          — {nowServing.patient.lastName}, {nowServing.patient.firstName}
                        </Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Called At">
                      {nowServing.calledAt ? dayjs(nowServing.calledAt).format('HH:mm') : '—'}
                    </Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Text type="secondary">No patient currently being served</Text>
                )}
              </Col>
              <Col>
                <Space>
                  {nowServing && (
                    <Button
                      icon={<CheckOutlined />}
                      onClick={() => completeEntry.mutate(nowServing.id)}
                      loading={completeEntry.isPending}
                    >
                      Complete Current
                    </Button>
                  )}
                  <Button
                    type="primary"
                    size="large"
                    icon={<CaretRightOutlined />}
                    onClick={() => callNext.mutate(selectedDeptId)}
                    loading={callNext.isPending}
                    style={{ background: '#16a34a', borderColor: '#16a34a' }}
                  >
                    Call Next
                  </Button>
                  <Button
                    icon={<UserAddOutlined />}
                    onClick={() => setAddModalOpen(true)}
                  >
                    Add Patient
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Waiting List */}
          <Card title={`Waiting Queue (${waiting.length})`}>
            <Table
              dataSource={waiting}
              columns={waitingColumns}
              rowKey="id"
              loading={statusLoading}
              pagination={false}
              size="small"
            />
          </Card>
        </>
      )}

      {!selectedDeptId && (
        <Card>
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
            Please select a department to manage its queue
          </div>
        </Card>
      )}

      {/* Add Patient Modal */}
      <Modal
        title="Add Patient to Queue"
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); setSelectedPatientId(''); setIsSeniorOrPwd(false); }}
        onOk={handleAddToQueue}
        confirmLoading={addToQueue.isPending}
        okButtonProps={{ disabled: !selectedPatientId }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>Search Patient</Text>
          </div>
          <AutoComplete
            options={patientOptions}
            onSearch={handlePatientSearch}
            onSelect={(value) => setSelectedPatientId(value)}
            placeholder="Search by name or patient no..."
            style={{ width: '100%' }}
          />
        </div>
        <Checkbox
          checked={isSeniorOrPwd}
          onChange={(e) => setIsSeniorOrPwd(e.target.checked)}
        >
          Senior Citizen / PWD (Priority Queue)
        </Checkbox>
      </Modal>
    </div>
  );
};

export default QueueManagementPage;
