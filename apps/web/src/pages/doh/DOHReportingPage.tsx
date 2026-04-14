import React, { useState } from 'react';
import {
  Card,
  Typography,
  Form,
  Button,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Select,
  DatePicker,
  Divider,
  Statistic,
  Modal,
  Descriptions,
  Alert,
  Input,
} from 'antd';
import {
  FileProtectOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  BugOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useFHSISReport,
  usePIDSRReport,
  useSubmissionHistory,
  useLogDohSubmission,
  useDiseaseCases,
} from '../../hooks/useDOH';
import type { FHSISReport, AgeGroupStat, DiagnosisStat, DiseaseEntry, DohSubmissionLog } from '../../services/dohService';

const { Title, Text } = Typography;
const { Option } = Select;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function generateCSVFromFHSIS(report: FHSISReport): string {
  const lines: string[] = [];
  lines.push(`FHSIS Monthly Report`);
  lines.push(`Reporting Period,${MONTHS[report.reportingPeriod.month - 1]} ${report.reportingPeriod.year}`);
  lines.push(`Generated At,${report.reportGeneratedAt}`);
  lines.push('');
  lines.push('OPD Summary');
  lines.push(`Total Visits,${report.opd.totalVisits}`);
  lines.push(`New Cases,${report.opd.newCases}`);
  lines.push(`Old Cases,${report.opd.oldCases}`);
  lines.push('');
  lines.push('OPD By Age Group');
  lines.push('Age Group,Male,Female,Total');
  for (const g of report.opd.byAgeGroup) {
    lines.push(`"${g.group}",${g.male},${g.female},${g.total}`);
  }
  lines.push('');
  lines.push('Admissions');
  lines.push(`Total Admissions,${report.admissions.total}`);
  lines.push('Diagnosis,Count');
  for (const d of report.admissions.byDiagnosis) {
    lines.push(`"${d.description}",${d.count}`);
  }
  return lines.join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const DOHReportingPage: React.FC = () => {
  const [fhsisMonth, setFhsisMonth] = useState(new Date().getMonth() + 1);
  const [fhsisYear, setFhsisYear] = useState(new Date().getFullYear());
  const [fhsisEnabled, setFhsisEnabled] = useState(false);

  const [pidsrDateFrom, setPidsrDateFrom] = useState('');
  const [pidsrDateTo, setPidsrDateTo] = useState('');
  const [pidsrEnabled, setPidsrEnabled] = useState(false);

  const [selectedDisease, setSelectedDisease] = useState<DiseaseEntry | null>(null);
  const [diseaseCasesVisible, setDiseaseCasesVisible] = useState(false);
  const [diseaseEnabled, setDiseaseEnabled] = useState(false);

  const [logForm] = Form.useForm();
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logReportType, setLogReportType] = useState('FHSIS');

  const { data: fhsisData, isLoading: fhsisLoading } = useFHSISReport(
    { month: fhsisMonth, year: fhsisYear },
    fhsisEnabled
  );
  const { data: pidsrData, isLoading: pidsrLoading } = usePIDSRReport(
    { dateFrom: pidsrDateFrom, dateTo: pidsrDateTo },
    pidsrEnabled
  );
  const { data: diseaseCasesData } = useDiseaseCases(
    {
      icdCode: selectedDisease?.icdCode ?? '',
      dateFrom: pidsrDateFrom,
      dateTo: pidsrDateTo,
    },
    diseaseEnabled
  );
  const { data: historyData } = useSubmissionHistory();
  const logMutation = useLogDohSubmission();

  const fhsisReport: FHSISReport | null = fhsisData?.data ?? null;
  const pidsrReport = pidsrData?.data ?? null;
  const submissionHistory: DohSubmissionLog[] = historyData?.data ?? [];
  const diseaseCases = diseaseCasesData?.data ?? null;

  const handleGenerateFHSIS = () => {
    setFhsisEnabled(true);
  };

  const handleDownloadCSV = () => {
    if (!fhsisReport) return;
    const csv = generateCSVFromFHSIS(fhsisReport);
    downloadCSV(csv, `FHSIS-${fhsisYear}-${String(fhsisMonth).padStart(2, '0')}.csv`);
  };

  const handleLogSubmission = async (values: { notes?: string }) => {
    await logMutation.mutateAsync({
      reportType: logReportType,
      period: logReportType === 'FHSIS'
        ? `${MONTHS[fhsisMonth - 1]} ${fhsisYear}`
        : `${pidsrDateFrom} to ${pidsrDateTo}`,
      notes: values.notes,
    });
    setLogModalVisible(false);
    logForm.resetFields();
  };

  const handleDiseaseRowClick = (record: DiseaseEntry) => {
    setSelectedDisease(record);
    setDiseaseEnabled(true);
    setDiseaseCasesVisible(true);
  };

  // Age group table
  const ageGroupColumns = [
    { title: 'Age Group', dataIndex: 'group', key: 'group' },
    { title: 'Male', dataIndex: 'male', key: 'male' },
    { title: 'Female', dataIndex: 'female', key: 'female' },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (v: number) => <Text strong>{v}</Text> },
  ];

  const diagnosisColumns = [
    { title: 'ICD Code', dataIndex: 'icdCode', key: 'icdCode' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      render: (v: number) => <Text strong>{v}</Text>,
    },
  ];

  const pidsrColumns = [
    {
      title: 'Disease',
      dataIndex: 'disease',
      key: 'disease',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    { title: 'ICD Code', dataIndex: 'icdCode', key: 'icdCode' },
    {
      title: 'Total Cases',
      dataIndex: 'cases',
      key: 'cases',
      render: (v: number) => (
        <Tag color={v > 0 ? 'red' : 'default'}>{v}</Tag>
      ),
    },
    { title: 'Deaths', dataIndex: 'deaths', key: 'deaths' },
    {
      title: 'This Week',
      dataIndex: 'thisWeek',
      key: 'thisWeek',
      render: (v: number) => (v > 0 ? <Tag color="orange">{v}</Tag> : 0),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, row: DiseaseEntry) =>
        row.cases > 0 ? (
          <Button size="small" onClick={() => handleDiseaseRowClick(row)}>
            View Cases
          </Button>
        ) : null,
    },
  ];

  const historyColumns = [
    { title: 'Report Type', dataIndex: 'reportType', key: 'reportType', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Period', dataIndex: 'period', key: 'period' },
    {
      title: 'Submitted At',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY h:mm A'),
    },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (v?: string) => v || '—' },
  ];

  const diseaseCaseColumns = [
    {
      title: 'Consultation No.',
      dataIndex: 'consultationNo',
      key: 'consultationNo',
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: unknown, row: Record<string, unknown>) => {
        const p = row['patient'] as { firstName: string; lastName: string; patientNo: string } | undefined;
        return p ? `${p.lastName}, ${p.firstName} (${p.patientNo})` : '—';
      },
    },
    {
      title: 'Date',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: 'Doctor',
      dataIndex: 'doctor',
      key: 'doctor',
    },
  ];

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 16 }}>
        <FileProtectOutlined style={{ marginRight: 8 }} />
        DOH Reporting
      </Title>

      {/* SECTION 1: FHSIS Monthly Report */}
      <Card
        title="FHSIS Monthly Report"
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            {fhsisReport && (
              <>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadCSV}
                  size="small"
                >
                  Download CSV
                </Button>
                <Button
                  icon={<CheckCircleOutlined />}
                  type="default"
                  size="small"
                  onClick={() => { setLogReportType('FHSIS'); setLogModalVisible(true); }}
                >
                  Log Submission
                </Button>
              </>
            )}
          </Space>
        }
      >
        <Row gutter={16} align="bottom" style={{ marginBottom: 16 }}>
          <Col>
            <div style={{ marginBottom: 4 }}><Text type="secondary">Month</Text></div>
            <Select
              value={fhsisMonth}
              onChange={(v) => { setFhsisMonth(v); setFhsisEnabled(false); }}
              style={{ width: 140 }}
            >
              {MONTHS.map((m, i) => (
                <Option key={i + 1} value={i + 1}>{m}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <div style={{ marginBottom: 4 }}><Text type="secondary">Year</Text></div>
            <Select
              value={fhsisYear}
              onChange={(v) => { setFhsisYear(v); setFhsisEnabled(false); }}
              style={{ width: 100 }}
            >
              {[2022, 2023, 2024, 2025, 2026].map((y) => (
                <Option key={y} value={y}>{y}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button
              type="primary"
              loading={fhsisLoading}
              onClick={handleGenerateFHSIS}
              icon={<FileProtectOutlined />}
            >
              Generate Report
            </Button>
          </Col>
        </Row>

        {fhsisReport && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="Total OPD Visits" value={fhsisReport.opd.totalVisits} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="New Cases" value={fhsisReport.opd.newCases} valueStyle={{ color: '#1677ff' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="Old Cases" value={fhsisReport.opd.oldCases} valueStyle={{ color: '#666' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="Total Admissions" value={fhsisReport.admissions.total} valueStyle={{ color: '#f97316' }} />
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Divider orientation="left">OPD Visits by Age Group</Divider>
                <Table
                  dataSource={fhsisReport.opd.byAgeGroup}
                  columns={ageGroupColumns}
                  rowKey="group"
                  size="small"
                  pagination={false}
                />
              </Col>
              <Col span={12}>
                <Divider orientation="left">Admissions by Diagnosis</Divider>
                {fhsisReport.admissions.byDiagnosis.length === 0 ? (
                  <Alert type="info" message="No admissions in this period." showIcon />
                ) : (
                  <Table
                    dataSource={fhsisReport.admissions.byDiagnosis}
                    columns={diagnosisColumns}
                    rowKey="description"
                    size="small"
                    pagination={false}
                  />
                )}
              </Col>
            </Row>
          </>
        )}

        {!fhsisReport && !fhsisLoading && (
          <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
            Select month and year, then click Generate Report
          </div>
        )}
      </Card>

      {/* SECTION 2: PIDSR Disease Surveillance */}
      <Card
        title={
          <Space>
            <BugOutlined />
            PIDSR Disease Surveillance
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          pidsrReport && (
            <Button
              icon={<CheckCircleOutlined />}
              size="small"
              onClick={() => { setLogReportType('PIDSR'); setLogModalVisible(true); }}
            >
              Log Submission
            </Button>
          )
        }
      >
        <Row gutter={16} align="bottom" style={{ marginBottom: 16 }}>
          <Col>
            <div style={{ marginBottom: 4 }}><Text type="secondary">Date From</Text></div>
            <DatePicker
              onChange={(d) => {
                setPidsrDateFrom(d ? d.format('YYYY-MM-DD') : '');
                setPidsrEnabled(false);
              }}
            />
          </Col>
          <Col>
            <div style={{ marginBottom: 4 }}><Text type="secondary">Date To</Text></div>
            <DatePicker
              onChange={(d) => {
                setPidsrDateTo(d ? d.format('YYYY-MM-DD') : '');
                setPidsrEnabled(false);
              }}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              loading={pidsrLoading}
              onClick={() => setPidsrEnabled(true)}
              icon={<BugOutlined />}
            >
              Generate PIDSR
            </Button>
          </Col>
        </Row>

        {pidsrReport ? (
          <Table
            dataSource={pidsrReport.diseases}
            columns={pidsrColumns}
            rowKey="icdCode"
            size="small"
            pagination={false}
            onRow={(record) => ({
              style: { cursor: record.cases > 0 ? 'pointer' : 'default' },
            })}
          />
        ) : (
          !pidsrLoading && (
            <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
              Select date range and click Generate PIDSR
            </div>
          )
        )}
      </Card>

      {/* SECTION 3: Submission History */}
      <Card title="Submission History">
        {submissionHistory.length === 0 ? (
          <Alert type="info" message="No submission history found." showIcon />
        ) : (
          <Table
            dataSource={submissionHistory}
            columns={historyColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* Log Submission Modal */}
      <Modal
        title={`Log ${logReportType} Submission`}
        open={logModalVisible}
        onCancel={() => { setLogModalVisible(false); logForm.resetFields(); }}
        onOk={() => logForm.submit()}
        confirmLoading={logMutation.isPending}
      >
        <Form form={logForm} layout="vertical" onFinish={handleLogSubmission}>
          <Descriptions size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Report Type">{logReportType}</Descriptions.Item>
            <Descriptions.Item label="Period">
              {logReportType === 'FHSIS'
                ? `${MONTHS[fhsisMonth - 1]} ${fhsisYear}`
                : `${pidsrDateFrom} to ${pidsrDateTo}`}
            </Descriptions.Item>
          </Descriptions>
          <Form.Item name="notes" label="Notes (optional)">
            <Input.TextArea rows={3} placeholder="Any additional notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Disease Cases Modal */}
      <Modal
        title={`Cases: ${selectedDisease?.disease} (${selectedDisease?.icdCode})`}
        open={diseaseCasesVisible}
        onCancel={() => { setDiseaseCasesVisible(false); setDiseaseEnabled(false); }}
        footer={null}
        width={700}
      >
        {diseaseCases ? (
          <>
            <Text type="secondary">
              Total: {(diseaseCases as Record<string, unknown>)['total'] as number} cases
            </Text>
            <Table
              dataSource={(diseaseCases as Record<string, unknown>)['cases'] as Record<string, unknown>[]}
              columns={diseaseCaseColumns}
              rowKey="consultationId"
              size="small"
              pagination={{ pageSize: 10 }}
              style={{ marginTop: 8 }}
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 32 }}>Loading...</div>
        )}
      </Modal>
    </div>
  );
};

export default DOHReportingPage;
