import React, { useState } from 'react';
import {
  Card, Tabs, Form, Input, Button, Select, Switch, Space, Typography,
  Divider, Row, Col, message, Tag, InputNumber,
} from 'antd';
import {
  BankOutlined, SettingOutlined, SafetyOutlined, ApiOutlined, BellOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const SettingsPage: React.FC = () => {
  const [hospitalForm] = Form.useForm();
  const [systemForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [integrationForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const save = async (form: ReturnType<typeof Form.useForm>[0], section: string) => {
    try {
      await form.validateFields();
      setSaving(true);
      await new Promise((r) => setTimeout(r, 500));
      message.success(`${section} settings saved`);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    {
      key: 'hospital',
      label: (
        <span><BankOutlined /> Hospital Profile</span>
      ),
      children: (
        <Form form={hospitalForm} layout="vertical" initialValues={{
          hospitalName: 'iHIMS General Hospital',
          shortName: 'iHIMS',
          address: '123 Healthcare Ave, Manila, Philippines',
          city: 'Manila',
          province: 'Metro Manila',
          zipCode: '1000',
          phone: '+63 2 1234 5678',
          email: 'info@pibs-hospital.ph',
          website: 'www.pibs-hospital.ph',
          philhealthAccredNo: 'PH-ACC-00001',
          dotAccredNo: 'DOH-2024-0001',
          tinNo: '000-000-000-000',
        }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="Hospital Name" name="hospitalName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Short Name / Acronym" name="shortName">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Address" name="address">
            <TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="City / Municipality" name="city">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Province" name="province">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ZIP Code" name="zipCode">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Phone" name="phone">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Email" name="email">
                <Input type="email" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Website" name="website">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Divider>Government Accreditation</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="PhilHealth Accreditation No." name="philhealthAccredNo">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="DOH Accreditation No." name="dotAccredNo">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="TIN No." name="tinNo">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" loading={saving} onClick={() => save(hospitalForm, 'Hospital profile')}>
              Save Hospital Profile
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'system',
      label: (
        <span><SettingOutlined /> System Preferences</span>
      ),
      children: (
        <Form form={systemForm} layout="vertical" initialValues={{
          currency: 'PHP',
          dateFormat: 'MMMM D, YYYY',
          timezone: 'Asia/Manila',
          defaultSeniorDiscount: 20,
          defaultPwdDiscount: 20,
          billPrefix: 'BILL',
          patientNoPrefix: 'PT',
          consultationNoPrefix: 'CONS',
          admissionNoPrefix: 'ADM',
          sessionTimeout: 480,
          printCopies: 2,
        }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Currency" name="currency">
                <Select>
                  <Option value="PHP">PHP — Philippine Peso (₱)</Option>
                  <Option value="USD">USD — US Dollar ($)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Date Format" name="dateFormat">
                <Select>
                  <Option value="MMMM D, YYYY">April 15, 2026</Option>
                  <Option value="MM/DD/YYYY">04/15/2026</Option>
                  <Option value="DD/MM/YYYY">15/04/2026</Option>
                  <Option value="YYYY-MM-DD">2026-04-15</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Timezone" name="timezone">
                <Select>
                  <Option value="Asia/Manila">Asia/Manila (UTC+8)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Divider>Philippine Compliance — Discount Rates</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Senior Citizen Discount % (RA 9994)" name="defaultSeniorDiscount">
                <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="PWD Discount % (RA 10754)" name="defaultPwdDiscount">
                <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Session Timeout (minutes)" name="sessionTimeout">
                <InputNumber min={5} max={1440} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider>Document Number Prefixes</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Bill No. Prefix" name="billPrefix">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Patient No. Prefix" name="patientNoPrefix">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Consultation No. Prefix" name="consultationNoPrefix">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Admission No. Prefix" name="admissionNoPrefix">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" loading={saving} onClick={() => save(systemForm, 'System preferences')}>
              Save System Preferences
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'security',
      label: (
        <span><SafetyOutlined /> Security</span>
      ),
      children: (
        <Form form={securityForm} layout="vertical" initialValues={{
          requireStrongPassword: true,
          twoFactorAuth: false,
          maxLoginAttempts: 5,
          lockoutDuration: 15,
          passwordExpiry: 90,
          auditLogging: true,
          ipWhitelist: '',
        }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Require Strong Password" name="requireStrongPassword" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Enable Audit Logging" name="auditLogging" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Max Login Attempts" name="maxLoginAttempts">
                <InputNumber min={3} max={20} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Lockout Duration (minutes)" name="lockoutDuration">
                <InputNumber min={5} max={1440} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Password Expiry (days)" name="passwordExpiry">
                <InputNumber min={0} max={365} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="IP Whitelist (comma-separated, leave blank to allow all)" name="ipWhitelist">
            <TextArea rows={2} placeholder="192.168.1.0/24, 10.0.0.1" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={saving} onClick={() => save(securityForm, 'Security')}>
              Save Security Settings
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'integrations',
      label: (
        <span><ApiOutlined /> Integrations</span>
      ),
      children: (
        <Form form={integrationForm} layout="vertical" initialValues={{
          philhealthApiUrl: 'https://eclaims.philhealth.gov.ph/api',
          semaphoreApiKey: '',
          gcashMerchantId: '',
          mayaMerchantId: '',
          paymongoPublicKey: '',
          paymongoSecretKey: '',
        }}>
          <Divider orientation="left">
            <Tag color="green">PhilHealth</Tag> eClaims API
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="PhilHealth eClaims API URL" name="philhealthApiUrl">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="PhilHealth API Username" name="philhealthApiUser">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="PhilHealth API Password" name="philhealthApiPass">
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">
            <Tag color="blue">SMS</Tag> Semaphore
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Semaphore API Key" name="semaphoreApiKey">
                <Input.Password placeholder="Your Semaphore API key" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="SMS Sender Name" name="smsSenderId">
                <Input placeholder="iHIMS Hospital" maxLength={11} />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">
            <Tag color="orange">Payments</Tag> GCash / Maya / PayMongo
          </Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="GCash Merchant ID" name="gcashMerchantId">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Maya Merchant ID" name="mayaMerchantId">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="PayMongo Public Key" name="paymongoPublicKey">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="PayMongo Secret Key" name="paymongoSecretKey">
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" loading={saving} onClick={() => save(integrationForm, 'Integration')}>
              Save Integration Settings
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'notifications',
      label: (
        <span><BellOutlined /> Notifications</span>
      ),
      children: (
        <Form layout="vertical" initialValues={{
          lowStockAlert: true, appointmentReminder: true, billDueReminder: true,
          labResultReady: true, admissionAlert: true, criticalVitals: true,
          reminderHours: 24,
        }}>
          <Title level={5}>Email / SMS Alerts</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {[
                  { name: 'lowStockAlert', label: 'Low pharmacy stock alert' },
                  { name: 'appointmentReminder', label: 'Appointment reminder to patient' },
                  { name: 'billDueReminder', label: 'Bill due reminder' },
                ].map(({ name, label }) => (
                  <Form.Item key={name} name={name} valuePropName="checked" style={{ marginBottom: 8 }}>
                    <Switch checkedChildren="On" unCheckedChildren="Off" />
                    <Text style={{ marginLeft: 8 }}>{label}</Text>
                  </Form.Item>
                ))}
              </Space>
            </Col>
            <Col span={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {[
                  { name: 'labResultReady', label: 'Lab result ready notification' },
                  { name: 'admissionAlert', label: 'New admission alert to duty doctor' },
                  { name: 'criticalVitals', label: 'Critical vital signs alert' },
                ].map(({ name, label }) => (
                  <Form.Item key={name} name={name} valuePropName="checked" style={{ marginBottom: 8 }}>
                    <Switch checkedChildren="On" unCheckedChildren="Off" />
                    <Text style={{ marginLeft: 8 }}>{label}</Text>
                  </Form.Item>
                ))}
              </Space>
            </Col>
          </Row>
          <Form.Item label="Appointment Reminder Lead Time (hours)" name="reminderHours">
            <InputNumber min={1} max={72} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={() => message.success('Notification settings saved')}>
              Save Notification Settings
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Title level={3}><SettingOutlined /> Settings</Title>
      <Card>
        <Tabs items={tabs} />
      </Card>
    </div>
  );
};

export default SettingsPage;
