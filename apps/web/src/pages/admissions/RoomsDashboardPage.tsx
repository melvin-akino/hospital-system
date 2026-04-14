import React, { useState } from 'react';
import {
  Row, Col, Card, Typography, Tag, Button, Select, Statistic, Badge, Space, Spin,
} from 'antd';
import {
  HomeOutlined, PlusOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useRooms, useRoomTypes, useAdmissionStats } from '../../hooks/useAdmissions';
import type { Room } from '../../services/admissionService';

const { Title, Text } = Typography;

const RoomsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterFloor, setFilterFloor] = useState<string | undefined>();

  const { data: statsData } = useAdmissionStats();
  const { data: roomTypesData } = useRoomTypes();
  const { data: roomsData, isLoading } = useRooms(
    Object.fromEntries(
      Object.entries({ roomTypeId: filterType, floor: filterFloor }).filter(([, v]) => v !== undefined)
    ) as Record<string, string>
  );

  const stats = statsData?.data;
  const rooms: Room[] = roomsData?.data || [];
  const roomTypes = roomTypesData?.data || [];

  const floors = [...new Set(rooms.map((r: Room) => r.floor).filter(Boolean))].sort();

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

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Rooms"
              value={stats?.totalRooms || 0}
              prefix={<HomeOutlined />}
            />
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

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Filter by Room Type"
            allowClear
            style={{ width: 200 }}
            onChange={setFilterType}
            options={roomTypes.map((rt: { id: string; name: string }) => ({ value: rt.id, label: rt.name }))}
          />
          <Select
            placeholder="Filter by Floor"
            allowClear
            style={{ width: 160 }}
            onChange={setFilterFloor}
            options={floors.map((f: unknown) => ({ value: f, label: `Floor ${f}` }))}
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
                  No rooms found. Create rooms to get started.
                </div>
              </Card>
            </Col>
          ) : (
            rooms.map((room: Room) => {
              const activeAdmission = room.admissions && room.admissions[0];
              const patient = activeAdmission?.patient;

              return (
                <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    size="small"
                    style={{
                      borderLeft: `4px solid ${room.isOccupied ? '#ff4d4f' : '#52c41a'}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate('/admissions/list')}
                  >
                    <Row justify="space-between" align="top">
                      <Col>
                        <Text strong style={{ fontSize: 16 }}>Room {room.roomNumber}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {room.roomType?.name || 'General'} · Floor {room.floor || '—'}
                        </Text>
                      </Col>
                      <Col>
                        <Badge
                          status={room.isOccupied ? 'error' : 'success'}
                          text={room.isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
                        />
                      </Col>
                    </Row>

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
                  </Card>
                </Col>
              );
            })
          )}
        </Row>
      )}
    </div>
  );
};

export default RoomsDashboardPage;
