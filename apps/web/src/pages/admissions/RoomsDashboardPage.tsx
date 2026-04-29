import React, { useState } from 'react';
import {
  Row, Col, Card, Typography, Tag, Button, Select, Statistic, Badge, Space, Spin,
  Popover, Tooltip, Modal, Form, Input, Popconfirm,
} from 'antd';
import {
  HomeOutlined, PlusOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClearOutlined, ToolOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRooms, useRoomTypes, useAdmissionStats } from '../../hooks/useAdmissions';
import type { Room } from '../../services/admissionService';
import api from '../../lib/api';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const HK_STATUS = {
  CLEAN: { color: '#52c41a', label: 'Clean', border: '#52c41a', bg: '#f6ffed' },
  CLEANING: { color: '#1890ff', label: 'Cleaning', border: '#91d5ff', bg: '#e6f7ff' },
  DIRTY: { color: '#ff4d4f', label: 'Needs Cleaning', border: '#ffccc7', bg: '#fff1f0' },
  MAINTENANCE: { color: '#fa8c16', label: 'Maintenance', border: '#ffd591', bg: '#fff7e6' },
};

const RoomsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterFloor, setFilterFloor] = useState<string | undefined>();
  const [filterHK, setFilterHK] = useState<string | undefined>();
  const [noteModal, setNoteModal] = useState<{ roomId: string; status: string } | null>(null);
  const [noteForm] = Form.useForm();

  const { data: statsData } = useAdmissionStats();
  const { data: roomTypesData } = useRoomTypes();
  const { data: roomsData, isLoading } = useRooms(
    Object.fromEntries(
      Object.entries({ roomTypeId: filterType, floor: filterFloor }).filter(([, v]) => v !== undefined)
    ) as Record<string, string>
  );

  const stats = statsData?.data;
  const allRooms: Room[] = roomsData?.data || [];
  const roomTypes = roomTypesData?.data || [];

  // Apply housekeeping filter client-side
  const rooms = filterHK
    ? allRooms.filter((r: any) => (r.housekeepingStatus || 'CLEAN') === filterHK)
    : allRooms;

  const floors = [...new Set(allRooms.map((r: Room) => r.floor).filter(Boolean))].sort();

  // Housekeeping stats
  const hkCounts = allRooms.reduce((acc: any, r: any) => {
    const s = r.housekeepingStatus || 'CLEAN';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const hkMutation = useMutation({
    mutationFn: ({ roomId, housekeepingStatus, housekeepingNote }: any) =>
      api.put(`/rooms/${roomId}/housekeeping`, { housekeepingStatus, housekeepingNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      setNoteModal(null);
      noteForm.resetFields();
    },
  });

  const setHKStatus = (roomId: string, status: string) => {
    if (status === 'CLEANING') {
      setNoteModal({ roomId, status });
    } else {
      hkMutation.mutate({ roomId, housekeepingStatus: status });
    }
  };

  const HKActionMenu = ({ room }: { room: any }) => {
    const currentStatus = room.housekeepingStatus || 'CLEAN';
    const actions = [
      { status: 'CLEAN', label: '✅ Mark Clean', show: currentStatus !== 'CLEAN' },
      { status: 'CLEANING', label: '🧹 Mark Cleaning in Progress', show: currentStatus !== 'CLEANING' },
      { status: 'DIRTY', label: '⚠️ Mark Dirty / Needs Cleaning', show: currentStatus !== 'DIRTY' },
      { status: 'MAINTENANCE', label: '🔧 Mark Under Maintenance', show: currentStatus !== 'MAINTENANCE' },
    ].filter((a) => a.show);

    return (
      <Space direction="vertical" size={4}>
        {actions.map((a) => (
          <Button
            key={a.status}
            type="text"
            size="small"
            style={{ textAlign: 'left', width: '100%' }}
            onClick={() => setHKStatus(room.id, a.status)}
            loading={hkMutation.isPending}
          >
            {a.label}
          </Button>
        ))}
        {room.lastCleanedAt && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            Last cleaned {dayjs(room.lastCleanedAt).fromNow()}
            {room.lastCleanedBy ? ` by ${room.lastCleanedBy}` : ''}
          </Text>
        )}
      </Space>
    );
  };

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <HomeOutlined style={{ marginRight: 8 }} />
            Room Status Board
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admissions/new')}>
            Admit Patient
          </Button>
        </Col>
      </Row>

      {/* Occupancy Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Total Rooms" value={stats?.totalRooms || 0} prefix={<HomeOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Occupied"
              value={(stats?.totalRooms || 0) - (stats?.availableRooms || 0)}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Available"
              value={stats?.availableRooms || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Occupancy Rate"
              value={stats?.occupancyRate || 0}
              suffix="%"
              valueStyle={{ color: (stats?.occupancyRate || 0) > 80 ? '#ff4d4f' : '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Housekeeping Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {Object.entries(HK_STATUS).map(([status, info]) => (
          <Col xs={12} sm={6} key={status}>
            <Card
              size="small"
              style={{
                borderLeft: `4px solid ${info.color}`,
                background: filterHK === status ? info.bg : '#fff',
                cursor: 'pointer',
              }}
              onClick={() => setFilterHK(filterHK === status ? undefined : status)}
            >
              <Statistic
                title={info.label}
                value={hkCounts[status] || 0}
                valueStyle={{ color: info.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Room Type"
            allowClear
            style={{ width: 180 }}
            onChange={setFilterType}
            options={roomTypes.map((rt: { id: string; name: string }) => ({ value: rt.id, label: rt.name }))}
          />
          <Select
            placeholder="Floor"
            allowClear
            style={{ width: 130 }}
            onChange={setFilterFloor}
            options={floors.map((f: unknown) => ({ value: f, label: `Floor ${f}` }))}
          />
          <Select
            placeholder="Housekeeping"
            allowClear
            style={{ width: 180 }}
            value={filterHK}
            onChange={setFilterHK}
            options={Object.entries(HK_STATUS).map(([v, info]) => ({ value: v, label: info.label }))}
          />
        </Space>
      </Card>

      {/* Room Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : (
        <Row gutter={[16, 16]}>
          {rooms.length === 0 ? (
            <Col span={24}>
              <Card>
                <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
                  No rooms found. {filterHK && 'Try clearing the housekeeping filter.'}
                </div>
              </Card>
            </Col>
          ) : (
            rooms.map((room: any) => {
              const activeAdmission = room.admissions && room.admissions[0];
              const patient = activeAdmission?.patient;
              const hkStatus = room.housekeepingStatus || 'CLEAN';
              const hkInfo = HK_STATUS[hkStatus as keyof typeof HK_STATUS] || HK_STATUS.CLEAN;

              return (
                <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    size="small"
                    style={{
                      borderLeft: `4px solid ${room.isOccupied ? '#ff4d4f' : hkInfo.color}`,
                      background: room.isOccupied ? '#fff' : hkInfo.bg,
                      cursor: 'pointer',
                    }}
                  >
                    {/* Room header */}
                    <Row justify="space-between" align="top">
                      <Col onClick={() => navigate('/admissions/list')}>
                        <Text strong style={{ fontSize: 16 }}>Room {room.roomNumber}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {room.roomType?.name || 'General'} · Floor {room.floor || '—'}
                        </Text>
                      </Col>
                      <Col>
                        <Space direction="vertical" size={2} align="end">
                          <Badge
                            status={room.isOccupied ? 'error' : 'success'}
                            text={<Text style={{ fontSize: 11 }}>{room.isOccupied ? 'OCCUPIED' : 'AVAILABLE'}</Text>}
                          />
                          {/* Housekeeping badge */}
                          <Popover
                            content={<HKActionMenu room={room} />}
                            title="Housekeeping Status"
                            trigger="click"
                            placement="bottomRight"
                          >
                            <Tag
                              color={hkStatus === 'CLEAN' ? 'success' : hkStatus === 'CLEANING' ? 'processing' : hkStatus === 'DIRTY' ? 'error' : 'warning'}
                              style={{ fontSize: 10, cursor: 'pointer' }}
                              icon={
                                hkStatus === 'CLEANING' ? <ClearOutlined /> :
                                hkStatus === 'MAINTENANCE' ? <ToolOutlined /> :
                                hkStatus === 'DIRTY' ? <ClockCircleOutlined /> : undefined
                              }
                            >
                              {hkInfo.label}
                            </Tag>
                          </Popover>
                        </Space>
                      </Col>
                    </Row>

                    {/* Patient info if occupied */}
                    {room.isOccupied && patient && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                        <Space>
                          <UserOutlined style={{ color: '#1890ff' }} />
                          <Text style={{ fontSize: 12 }}>
                            {patient.lastName}, {patient.firstName}
                          </Text>
                        </Space>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>{patient.patientNo}</Text>
                      </div>
                    )}

                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {room.beds} bed{room.beds !== 1 ? 's' : ''} · {room.building || 'Main Building'}
                      </Text>
                      {room.roomType && (
                        <Tag color="blue" style={{ float: 'right', fontSize: 10 }}>
                          ₱{Number(room.roomType.ratePerDay).toLocaleString('en-PH')}/day
                        </Tag>
                      )}
                    </div>

                    {/* Cleaning note */}
                    {room.housekeepingNote && (
                      <div style={{ marginTop: 4, fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                        {room.housekeepingNote}
                      </div>
                    )}
                    {room.lastCleanedAt && hkStatus === 'CLEAN' && (
                      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                        Cleaned {dayjs(room.lastCleanedAt).fromNow()}
                        {room.lastCleanedBy ? ` by ${room.lastCleanedBy}` : ''}
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })
          )}
        </Row>
      )}

      {/* Cleaning Note Modal */}
      <Modal
        title="Mark Room as Cleaning in Progress"
        open={!!noteModal}
        onCancel={() => { setNoteModal(null); noteForm.resetFields(); }}
        onOk={() => noteForm.submit()}
        confirmLoading={hkMutation.isPending}
      >
        <Form
          form={noteForm}
          layout="vertical"
          onFinish={(values) => hkMutation.mutate({
            roomId: noteModal?.roomId,
            housekeepingStatus: 'CLEANING',
            housekeepingNote: values.note,
          })}
        >
          <Form.Item name="note" label="Cleaning Note (optional)">
            <Input.TextArea rows={2} placeholder="e.g., Deep cleaning, post-discharge terminal cleaning..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoomsDashboardPage;
