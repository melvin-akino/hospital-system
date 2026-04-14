import React, { useState } from 'react';
import {
  Row, Col, Card, Typography, Tag, Alert, Space, Button, Badge,
  List, Checkbox, Tabs,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useAssignedPatients, useNurseTasks, useCompleteTask } from '../../hooks/useNurse';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

interface AssignedPatient {
  id: string;
  firstName: string;
  lastName: string;
  roomNo?: string;
  bloodType?: string;
  allergies?: string[];
  medications?: Array<{ name: string }>;
}

interface NurseTask {
  id: string;
  type: string;
  priority: 'URGENT' | 'ROUTINE';
  status: 'PENDING' | 'COMPLETED';
  patientName?: string;
  description?: string;
  dueAt?: string;
}

const getShiftName = () => {
  const h = dayjs().hour();
  if (h >= 6 && h < 14) return 'MORNING SHIFT';
  if (h >= 14 && h < 22) return 'AFTERNOON SHIFT';
  return 'NIGHT SHIFT';
};

const taskTypeIcon = (type: string) => {
  if (type === 'VITALS') return '🩺';
  if (type === 'LAB_COLLECT') return '🧪';
  return '📋';
};

const NurseDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [taskFilter, setTaskFilter] = useState<string>('All');

  const { data: patientsData } = useAssignedPatients();
  const { data: tasksData } = useNurseTasks();
  const { mutate: completeTask } = useCompleteTask();

  const patients: AssignedPatient[] = Array.isArray(patientsData) ? patientsData : (patientsData?.data || []);
  const allTasks: NurseTask[] = Array.isArray(tasksData) ? tasksData : (tasksData?.data || []);

  const filteredTasks = allTasks.filter(t => {
    if (taskFilter === 'Urgent') return t.priority === 'URGENT';
    if (taskFilter === 'Routine') return t.priority === 'ROUTINE';
    return true;
  });

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 16 }}>Nurse Dashboard</Title>

      <Row gutter={16}>
        {/* Left: Assigned Patients */}
        <Col span={14}>
          <div style={{ marginBottom: 12 }}>
            <Space>
              <Text strong style={{ fontSize: 15 }}>Admitted Patients</Text>
              <Badge count={patients.length} showZero style={{ backgroundColor: '#1677ff' }} />
            </Space>
          </div>

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {patients.length === 0 && (
              <Text type="secondary">No patients assigned.</Text>
            )}
            {patients.map(patient => {
              const meds = patient.medications || [];
              const visibleMeds = meds.slice(0, 3);
              const extraMeds = meds.length - 3;

              return (
                <Card
                  key={patient.id}
                  size="small"
                  hoverable
                  title={
                    <Space>
                      <Text strong>{patient.lastName}, {patient.firstName}</Text>
                      {patient.roomNo && <Tag>Room {patient.roomNo}</Tag>}
                      {patient.bloodType && <Tag color="red">{patient.bloodType}</Tag>}
                    </Space>
                  }
                  extra={
                    <Space>
                      <Button size="small" onClick={() => navigate(`/nurses/vitals?patientId=${patient.id}`)}>
                        Record Vitals
                      </Button>
                      <Button size="small" type="link" onClick={() => navigate(`/emr/${patient.id}`)}>
                        View EMR
                      </Button>
                    </Space>
                  }
                >
                  {patient.allergies && patient.allergies.length > 0 && (
                    <Alert
                      type="error"
                      message={`⚠️ ALLERGY: ${patient.allergies.join(', ')}`}
                      style={{ marginBottom: 8 }}
                      banner
                    />
                  )}

                  {meds.length > 0 && (
                    <Space wrap size={4}>
                      {visibleMeds.map((m, i) => (
                        <Tag key={i} style={{ fontSize: 11 }}>💊 {m.name}</Tag>
                      ))}
                      {extraMeds > 0 && <Tag>+{extraMeds} more</Tag>}
                    </Space>
                  )}
                </Card>
              );
            })}
          </Space>
        </Col>

        {/* Right: Task List */}
        <Col span={10}>
          <Card
            title={
              <Space direction="vertical" size={0}>
                <Text strong>{getShiftName()}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{dayjs().format('MMM D, YYYY — h:mm A')}</Text>
              </Space>
            }
          >
            <Tabs
              size="small"
              activeKey={taskFilter}
              onChange={setTaskFilter}
              items={[
                { key: 'All', label: `All (${allTasks.length})` },
                { key: 'Urgent', label: `Urgent (${allTasks.filter(t => t.priority === 'URGENT').length})` },
                { key: 'Routine', label: `Routine (${allTasks.filter(t => t.priority === 'ROUTINE').length})` },
              ]}
            />

            <List
              dataSource={filteredTasks}
              locale={{ emptyText: 'No tasks' }}
              renderItem={(task: NurseTask) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <Space align="start" style={{ width: '100%' }}>
                    <Checkbox
                      checked={task.status === 'COMPLETED'}
                      disabled={task.status === 'COMPLETED'}
                      onChange={() => {
                        if (task.status !== 'COMPLETED') {
                          completeTask(task.id);
                        }
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <Space size={4} wrap>
                        <Tag color={task.priority === 'URGENT' ? 'red' : 'blue'} style={{ fontSize: 10 }}>
                          {task.priority}
                        </Tag>
                        <Text style={{ fontSize: 13 }}>
                          {taskTypeIcon(task.type)} <strong>{task.patientName}</strong>
                        </Text>
                      </Space>
                      {task.description && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{task.description}</Text>
                        </div>
                      )}
                      {task.dueAt && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {dayjs(task.dueAt).fromNow()}
                          </Text>
                        </div>
                      )}
                    </div>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default NurseDashboardPage;
