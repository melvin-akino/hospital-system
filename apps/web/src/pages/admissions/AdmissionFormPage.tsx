import React, { useState } from 'react';
import {
  Card, Form, Input, Select, Button, Typography, Row, Col, Space, AutoComplete, Spin,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCreateAdmission, useRooms, useRoomTypes } from '../../hooks/useAdmissions';
import api from '../../lib/api';
import type { Room } from '../../services/admissionService';

const { Title } = Typography;

interface PatientOption {
  value: string;
  label: string;
  id: string;
}

const AdmissionFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const createAdmission = useCreateAdmission();
  const { data: roomTypesData } = useRoomTypes();
  const { data: roomsData } = useRooms({ isOccupied: 'false' } as Record<string, string>);

  const availableRooms: Room[] = (roomsData?.data || []).filter((r: Room) => !r.isOccupied && r.isActive);
  const roomTypes = roomTypesData?.data || [];

  const handlePatientSearch = async (value: string) => {
    if (value.length < 2) return;
    setPatientSearching(true);
    try {
      const res = await api.get('/patients', { params: { search: value, limit: 10 } });
      const patients = res.data?.data || [];
      setPatientOptions(
        patients.map((p: { id: string; firstName: string; lastName: string; patientNo: string }) => ({
          value: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
          label: `${p.lastName}, ${p.firstName} — ${p.patientNo}`,
          id: p.id,
        }))
      );
    } catch {
      setPatientOptions([]);
    } finally {
      setPatientSearching(false);
    }
  };

  const handlePatientSelect = (_value: string, option: PatientOption) => {
    setSelectedPatientId(option.id);
    form.setFieldValue('patientDisplay', option.value);
  };

  const handleSubmit = async (values: {
    patientDisplay: string;
    roomId?: string;
    attendingDoctor?: string;
    diagnosis?: string;
    notes?: string;
  }) => {
    if (!selectedPatientId) {
      form.setFields([{ name: 'patientDisplay', errors: ['Please select a valid patient'] }]);
      return;
    }
    await createAdmission.mutateAsync({
      patientId: selectedPatientId,
      roomId: values.roomId,
      attendingDoctor: values.attendingDoctor,
      diagnosis: values.diagnosis,
      notes: values.notes,
    });
    navigate('/admissions/list');
  };

  const getRoomLabel = (room: Room) => {
    const rate = room.roomType?.ratePerDay
      ? ` — ₱${Number(room.roomType.ratePerDay).toLocaleString('en-PH')}/day`
      : '';
    return `Room ${room.roomNumber} (${room.roomType?.name || 'General'}, Floor ${room.floor || '?'})${rate}`;
  };

  return (
    <div className="page-container">
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admissions/list')} style={{ marginRight: 12 }} />
          <Title level={4} style={{ margin: 0, display: 'inline' }}>Admit Patient</Title>
        </Col>
      </Row>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Patient"
                name="patientDisplay"
                rules={[{ required: true, message: 'Please select a patient' }]}
              >
                <AutoComplete
                  options={patientOptions}
                  onSearch={handlePatientSearch}
                  onSelect={handlePatientSelect}
                  placeholder="Search patient by name or patient number..."
                  notFoundContent={patientSearching ? <Spin size="small" /> : 'No patients found'}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Room" name="roomId">
                <Select
                  placeholder="Select available room..."
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  options={availableRooms.map((r: Room) => ({
                    value: r.id,
                    label: getRoomLabel(r),
                  }))}
                  notFoundContent="No available rooms"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Attending Doctor" name="attendingDoctor">
                <Input placeholder="Enter attending doctor name..." />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Diagnosis" name="diagnosis">
                <Input placeholder="Primary diagnosis..." />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={3} placeholder="Admission notes..." />
              </Form.Item>
            </Col>
          </Row>

          <Row>
            <Col>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createAdmission.isPending}
                >
                  Admit Patient
                </Button>
                <Button onClick={() => navigate('/admissions/list')}>Cancel</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {availableRooms.length === 0 && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ textAlign: 'center', color: '#ff4d4f' }}>
            No rooms are currently available. All rooms are occupied or no rooms have been configured.
          </div>
        </Card>
      )}

      {roomTypes.length === 0 && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ textAlign: 'center', color: '#faad14' }}>
            Tip: Configure room types first to assign rates to rooms.
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdmissionFormPage;
