import React, { useState } from 'react';
import {
  Card, Typography, Select, Row, Col, Tag, Button, DatePicker, Space, Spin, Empty,
} from 'antd';
import { CalendarOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useDoctors } from '../../hooks/useDoctors';
import { useDoctorAvailability } from '../../hooks/useAppointments';

const { Title, Text } = Typography;

const DayColumn: React.FC<{
  date: string;
  doctorId: string;
  onSlotClick: (date: string, slot: string) => void;
}> = ({ date, doctorId, onSlotClick }) => {
  const { data: avail, isLoading } = useDoctorAvailability(doctorId, date);

  if (isLoading) return <Spin size="small" />;
  if (!avail)
    return <Text type="secondary" style={{ fontSize: 11 }}>No data</Text>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {avail.allSlots.map((slot) => {
        const isBooked = avail.bookedSlots.includes(slot);
        return (
          <Tag
            key={slot}
            color={isBooked ? 'red' : 'green'}
            style={{
              cursor: isBooked ? 'not-allowed' : 'pointer',
              fontSize: 11,
              textAlign: 'center',
              opacity: isBooked ? 0.7 : 1,
            }}
            onClick={() => {
              if (!isBooked) onSlotClick(date, slot);
            }}
          >
            {slot} {isBooked ? '(Booked)' : ''}
          </Tag>
        );
      })}
    </div>
  );
};

const AvailabilityCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [weekStart, setWeekStart] = useState<Dayjs>(dayjs().startOf('week'));

  const { data: doctorsData } = useDoctors({ limit: '100' });
  const doctors = (doctorsData as { data?: unknown[] })?.data || [];

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    weekStart.add(i, 'day').format('YYYY-MM-DD')
  );

  const handleSlotClick = (date: string, slot: string) => {
    const [h, m] = slot.split(':');
    const dt = dayjs(date).hour(parseInt(h)).minute(parseInt(m)).toISOString();
    navigate(
      `/appointments/new?doctorId=${selectedDoctorId}&scheduledAt=${encodeURIComponent(dt)}`
    );
  };

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <CalendarOutlined /> Doctor Availability
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/appointments/new')}
          >
            Book Appointment
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Select doctor"
            style={{ width: 280 }}
            showSearch
            filterOption={(input, option) =>
              String(option?.label || '').toLowerCase().includes(input.toLowerCase())
            }
            onChange={(v) => setSelectedDoctorId(v)}
            options={(doctors as Array<{ id: string; firstName: string; lastName: string; specialization?: string }>).map((d) => ({
              label: `Dr. ${d.firstName} ${d.lastName}${d.specialization ? ` — ${d.specialization}` : ''}`,
              value: d.id,
            }))}
          />
          <DatePicker
            picker="week"
            value={weekStart}
            onChange={(d) => {
              if (d) setWeekStart(d.startOf('week'));
            }}
          />
          <Button onClick={() => setWeekStart(dayjs().startOf('week'))}>This Week</Button>
        </Space>
      </Card>

      {!selectedDoctorId ? (
        <Empty description="Select a doctor to view availability" />
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <Row gutter={8} style={{ minWidth: 900 }}>
              {weekDays.map((date) => (
                <Col key={date} flex="1">
                  <div
                    style={{
                      background: dayjs(date).isSame(dayjs(), 'day') ? '#e6f7ff' : '#fafafa',
                      borderRadius: 8,
                      padding: 8,
                      minHeight: 300,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: 8,
                        textAlign: 'center',
                        fontSize: 12,
                      }}
                    >
                      <div>{dayjs(date).format('ddd')}</div>
                      <div style={{ fontSize: 16 }}>{dayjs(date).format('D')}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{dayjs(date).format('MMM')}</div>
                    </div>
                    <DayColumn
                      date={date}
                      doctorId={selectedDoctorId}
                      onSlotClick={handleSlotClick}
                    />
                  </div>
                </Col>
              ))}
            </Row>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
            <Tag color="green">Available (click to book)</Tag>
            <Tag color="red">Booked</Tag>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AvailabilityCalendarPage;
