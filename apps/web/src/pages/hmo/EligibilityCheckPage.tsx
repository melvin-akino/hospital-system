import React, { useState } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  AutoComplete,
  Button,
  Tag,
  Table,
  Alert,
  Space,
  Descriptions,
} from 'antd';
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useHmoEligibility } from '../../hooks/useHMO';
import { patientService } from '../../services/patientService';

const { Title, Text } = Typography;

interface HmoRegistration {
  id: string;
  memberNo: string;
  groupNo?: string;
  plan?: string;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  isCurrentlyValid: boolean;
  hmoCompany?: { name: string; code: string };
}

interface Patient {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
}

const EligibilityCheckPage: React.FC = () => {
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string; patient: Patient }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [triggerQuery, setTriggerQuery] = useState('');

  const { data: eligibilityData, isLoading } = useHmoEligibility(triggerQuery);

  const handlePatientSearch = async (q: string) => {
    if (q.length < 2) return;
    const res = await patientService.search(q);
    const patients: Patient[] = res?.data || [];
    setPatientOptions(
      patients.map((p) => ({
        value: p.id,
        label: `${p.lastName}, ${p.firstName} (${p.patientNo})`,
        patient: p,
      }))
    );
  };

  const handleCheck = () => {
    setTriggerQuery(selectedPatientId);
  };

  const eligibility = eligibilityData?.data;
  const registrations: HmoRegistration[] = eligibility?.registrations || [];

  const columns = [
    {
      title: 'HMO Company',
      key: 'company',
      render: (_: unknown, row: HmoRegistration) => (
        <Space>
          <Text strong>{row.hmoCompany?.name}</Text>
          <Tag>{row.hmoCompany?.code}</Tag>
        </Space>
      ),
    },
    { title: 'Member No.', dataIndex: 'memberNo' },
    { title: 'Group No.', dataIndex: 'groupNo', render: (v?: string) => v || '—' },
    { title: 'Plan', dataIndex: 'plan', render: (v?: string) => v || '—' },
    {
      title: 'Valid From',
      dataIndex: 'validFrom',
      render: (v?: string) => v ? dayjs(v).format('MMM D, YYYY') : '—',
    },
    {
      title: 'Valid Until',
      dataIndex: 'validUntil',
      render: (v?: string, row?: HmoRegistration) => {
        if (!v) return '—';
        const daysLeft = dayjs(v).diff(dayjs(), 'day');
        return (
          <Space direction="vertical" size={0}>
            <Tag color={row?.isCurrentlyValid ? 'green' : 'red'}>
              {dayjs(v).format('MMM D, YYYY')}
            </Tag>
            {row?.isCurrentlyValid && (
              <Text style={{ fontSize: 11, color: '#16a34a' }}>{daysLeft} days remaining</Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Validity',
      key: 'validity',
      render: (_: unknown, row: HmoRegistration) => (
        row.isCurrentlyValid ? (
          <Space>
            <CheckCircleOutlined style={{ color: '#16a34a' }} />
            <Text style={{ color: '#16a34a' }}>Valid</Text>
          </Space>
        ) : (
          <Space>
            <CloseCircleOutlined style={{ color: '#dc2626' }} />
            <Text style={{ color: '#dc2626' }}>Expired</Text>
          </Space>
        )
      ),
    },
  ];

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 16 }}>HMO Eligibility Check</Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={8} align="middle">
          <Col flex="auto">
            <AutoComplete
              options={patientOptions}
              onSearch={handlePatientSearch}
              onSelect={(value) => setSelectedPatientId(value)}
              placeholder="Search patient by name or patient no..."
              style={{ width: '100%' }}
              allowClear
              onClear={() => { setSelectedPatientId(''); setTriggerQuery(''); }}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleCheck}
              loading={isLoading}
              disabled={!selectedPatientId}
            >
              Check Eligibility
            </Button>
          </Col>
        </Row>
      </Card>

      {eligibility && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Row align="middle" gutter={16}>
              <Col>
                {eligibility.isEligible ? (
                  <CheckCircleOutlined style={{ fontSize: 48, color: '#16a34a' }} />
                ) : (
                  <CloseCircleOutlined style={{ fontSize: 48, color: '#dc2626' }} />
                )}
              </Col>
              <Col flex="auto">
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Patient">
                    <Text strong>
                      {eligibility.patient.lastName}, {eligibility.patient.firstName}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Patient No.">
                    {eligibility.patient.patientNo}
                  </Descriptions.Item>
                  <Descriptions.Item label="HMO Eligibility" span={2}>
                    {eligibility.isEligible ? (
                      <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                        ELIGIBLE — Active HMO Coverage
                      </Tag>
                    ) : (
                      <Tag color="red" style={{ fontSize: 14, padding: '4px 12px' }}>
                        NOT ELIGIBLE — No Active HMO Coverage
                      </Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </Card>

          {registrations.length > 0 ? (
            <Card title={`HMO Registrations (${registrations.length})`}>
              <Table
                dataSource={registrations}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="small"
                rowClassName={(row) => row.isCurrentlyValid ? '' : 'ant-table-row-disabled'}
              />
            </Card>
          ) : (
            <Alert type="info" message="This patient has no HMO registrations on file." />
          )}
        </>
      )}

      {!triggerQuery && (
        <Card>
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
            Search for a patient and click "Check Eligibility" to verify their HMO coverage
          </div>
        </Card>
      )}
    </div>
  );
};

export default EligibilityCheckPage;
