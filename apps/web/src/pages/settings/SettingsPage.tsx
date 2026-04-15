import React, { useState, useEffect } from 'react';
import {
  Card, Tabs, Form, Input, Button, Select, Switch, Space, Typography,
  Divider, Row, Col, message, Tag, InputNumber, Upload, ColorPicker,
  Avatar, Spin, Alert,
} from 'antd';
import {
  BankOutlined, SettingOutlined, SafetyOutlined, ApiOutlined, BellOutlined,
  FormatPainterOutlined, UploadOutlined, DeleteOutlined, EyeOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useBrandingStore } from '../../store/brandingStore';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ── Branding Tab ─────────────────────────────────────────────────────────────
const BrandingTab: React.FC = () => {
  const { systemName, systemSubtitle, logoUrl, primaryColor, sidebarColor, updateBranding, loadBranding } =
    useBrandingStore();
  const [previewLogo, setPreviewLogo] = useState<string | null>(logoUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [localPrimary, setLocalPrimary] = useState(primaryColor);
  const [localSidebar, setLocalSidebar] = useState(sidebarColor);

  // Sync preview when store updates
  useEffect(() => { setPreviewLogo(logoUrl); }, [logoUrl]);
  useEffect(() => { setLocalPrimary(primaryColor); }, [primaryColor]);
  useEffect(() => { setLocalSidebar(sidebarColor); }, [sidebarColor]);

  const [form] = Form.useForm();
  useEffect(() => {
    form.setFieldsValue({ systemName, systemSubtitle });
  }, [systemName, systemSubtitle, form]);

  // Save text + colours
  const saveBranding = useMutation({
    mutationFn: async (values: { systemName: string; systemSubtitle: string }) => {
      const payload: Record<string, string> = {
        system_name:     values.systemName,
        system_subtitle: values.systemSubtitle,
        primary_color:   localPrimary,
        sidebar_color:   localSidebar,
      };

      // Upload logo first if a new file was chosen
      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        const res = await api.post('/settings/logo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        payload.logo_url = res.data.data.logoUrl;
      }

      await api.put('/settings', payload);
      return payload;
    },
    onSuccess: async (saved) => {
      updateBranding({
        systemName:     saved.system_name,
        systemSubtitle: saved.system_subtitle,
        primaryColor:   saved.primary_color,
        sidebarColor:   saved.sidebar_color,
        ...(saved.logo_url ? { logoUrl: saved.logo_url } : {}),
      });
      await loadBranding(); // refresh from server
      setLogoFile(null);
      message.success('Branding saved — changes are now live');
    },
    onError: () => message.error('Failed to save branding'),
  });

  // Delete logo
  const removeLogo = useMutation({
    mutationFn: () => api.delete('/settings/logo'),
    onSuccess: () => {
      setPreviewLogo(null);
      setLogoFile(null);
      updateBranding({ logoUrl: null });
      message.success('Logo removed');
    },
  });

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) { message.error('Please upload an image file'); return Upload.LIST_IGNORE; }
      if (file.size > 2 * 1024 * 1024) { message.error('Image must be smaller than 2 MB'); return Upload.LIST_IGNORE; }
      // Preview locally
      const reader = new FileReader();
      reader.onload = (e) => setPreviewLogo(e.target?.result as string);
      reader.readAsDataURL(file);
      setLogoFile(file);
      return false; // prevent auto-upload
    },
    fileList: [],
    accept: 'image/png,image/jpeg,image/svg+xml,image/webp',
  };

  return (
    <Form form={form} layout="vertical" onFinish={(v) => saveBranding.mutate(v)}>
      <Row gutter={24}>
        {/* Left — controls */}
        <Col xs={24} lg={14}>
          <Divider orientation="left">System Identity</Divider>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="System Short Name"
                name="systemName"
                rules={[{ required: true, message: 'Required' }]}
                extra="Shown in sidebar logo and login page"
              >
                <Input placeholder="e.g. MedStar, CityHosp" maxLength={30} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="System Subtitle"
                name="systemSubtitle"
                extra="Shown under the name in sidebar and login"
              >
                <Input placeholder="e.g. Hospital Management System" maxLength={60} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Logo</Divider>
          <Row gutter={16} align="middle">
            <Col>
              <div style={{
                width: 80, height: 80, border: '1px dashed #d9d9d9',
                borderRadius: 8, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: '#fafafa', overflow: 'hidden',
              }}>
                {previewLogo ? (
                  <img src={previewLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <MedicineBoxOutlined style={{ fontSize: 32, color: localPrimary }} />
                )}
              </div>
            </Col>
            <Col>
              <Space direction="vertical" size={4}>
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>Upload Logo</Button>
                </Upload>
                <Text type="secondary" style={{ fontSize: 12 }}>PNG, JPG, SVG, WebP · Max 2 MB</Text>
                {(previewLogo || logoUrl) && (
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => { setPreviewLogo(null); setLogoFile(null); removeLogo.mutate(); }}
                    loading={removeLogo.isPending}
                  >
                    Remove Logo
                  </Button>
                )}
              </Space>
            </Col>
          </Row>

          <Divider orientation="left">Colour Scheme</Divider>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Primary / Accent Colour" extra="Buttons, links, highlights">
                <Space align="center">
                  <ColorPicker
                    value={localPrimary}
                    onChange={(c) => setLocalPrimary(c.toHexString())}
                    showText
                    presets={[{
                      label: 'Presets',
                      colors: ['#1890ff','#52c41a','#faad14','#f5222d','#722ed1',
                               '#13c2c2','#2f54eb','#eb2f96','#fa8c16','#a0d911'],
                    }]}
                  />
                  <Tag color={localPrimary}>Preview</Tag>
                </Space>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Sidebar Background Colour" extra="Navigation panel background">
                <Space align="center">
                  <ColorPicker
                    value={localSidebar}
                    onChange={(c) => setLocalSidebar(c.toHexString())}
                    showText
                    presets={[{
                      label: 'Presets',
                      colors: ['#001529','#0a0a0a','#141414','#1f1f1f','#003366',
                               '#002140','#120338','#0d1b2a','#1a2744','#1b1b2f'],
                    }]}
                  />
                  <div style={{
                    width: 40, height: 24, borderRadius: 4,
                    background: localSidebar, border: '1px solid #d9d9d9',
                  }} />
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Col>

        {/* Right — live preview */}
        <Col xs={24} lg={10}>
          <Divider orientation="left"><EyeOutlined /> Live Preview</Divider>
          <Card size="small" style={{ background: '#f0f2f5' }}>
            {/* Mini sidebar */}
            <div style={{
              background: localSidebar, borderRadius: 8, padding: '12px',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {previewLogo ? (
                <img src={previewLogo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4 }} />
              ) : (
                <MedicineBoxOutlined style={{ fontSize: 22, color: localPrimary }} />
              )}
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                  {form.getFieldValue('systemName') || 'System Name'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                  {form.getFieldValue('systemSubtitle') || 'Subtitle'}
                </div>
              </div>
            </div>
            {/* Mini login button */}
            <Button type="primary" block style={{ background: localPrimary, borderColor: localPrimary, marginBottom: 8 }}>
              Primary Button
            </Button>
            <Space>
              <Tag color={localPrimary}>Tag</Tag>
              <Text style={{ color: localPrimary }}>Link text</Text>
            </Space>
          </Card>

          <Alert
            style={{ marginTop: 12 }}
            message="Changes are applied instantly"
            description="The sidebar, login page, and all accent colours update as soon as you save."
            type="info"
            showIcon
          />
        </Col>
      </Row>

      <Divider />
      <Button
        type="primary"
        htmlType="submit"
        icon={<FormatPainterOutlined />}
        loading={saveBranding.isPending}
        size="large"
      >
        Save Branding
      </Button>
    </Form>
  );
};

// ── Main Settings Page ────────────────────────────────────────────────────────
const SettingsPage: React.FC = () => {
  const [hospitalForm] = Form.useForm();
  const [systemForm]   = Form.useForm();
  const [securityForm] = Form.useForm();
  const [integrationForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Load persisted settings from API
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['all-settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
  });

  useEffect(() => {
    if (!settingsData) return;
    hospitalForm.setFieldsValue({
      hospitalName:        settingsData.hospital_name || '',
      address:             settingsData.hospital_address || '',
      phone:               settingsData.hospital_phone || '',
      email:               settingsData.hospital_email || '',
      philhealthAccredNo:  settingsData.hospital_license || '',
    });
    systemForm.setFieldsValue({
      defaultSeniorDiscount: Number(settingsData.senior_discount || 20),
      defaultPwdDiscount:    Number(settingsData.pwd_discount || 20),
    });
  }, [settingsData, hospitalForm, systemForm]);

  const saveSection = async (
    form: ReturnType<typeof Form.useForm>[0],
    mapping: Record<string, string>,
    label: string
  ) => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: Record<string, string> = {};
      Object.entries(mapping).forEach(([formKey, configKey]) => {
        if (values[formKey] !== undefined) payload[configKey] = String(values[formKey]);
      });
      await api.put('/settings', payload);
      message.success(`${label} saved`);
    } catch {
      message.error('Please fix validation errors');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>;

  const tabs = [
    {
      key: 'branding',
      label: <span><FormatPainterOutlined /> Branding</span>,
      children: <BrandingTab />,
    },
    {
      key: 'hospital',
      label: <span><BankOutlined /> Hospital Profile</span>,
      children: (
        <Form form={hospitalForm} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="Hospital Name" name="hospitalName">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Address" name="address">
            <TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Phone" name="phone"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Email" name="email"><Input type="email" /></Form.Item>
            </Col>
          </Row>
          <Divider>Government Accreditation</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="PhilHealth Accreditation No." name="philhealthAccredNo">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" loading={saving} onClick={() => saveSection(hospitalForm, {
              hospitalName: 'hospital_name',
              address: 'hospital_address',
              phone: 'hospital_phone',
              email: 'hospital_email',
              philhealthAccredNo: 'hospital_license',
            }, 'Hospital profile')}>
              Save Hospital Profile
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'system',
      label: <span><SettingOutlined /> Preferences</span>,
      children: (
        <Form form={systemForm} layout="vertical" initialValues={{
          currency: 'PHP', defaultSeniorDiscount: 20, defaultPwdDiscount: 20,
        }}>
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
          </Row>
          <Form.Item>
            <Button type="primary" loading={saving} onClick={() => saveSection(systemForm, {
              defaultSeniorDiscount: 'senior_discount',
              defaultPwdDiscount: 'pwd_discount',
            }, 'System preferences')}>
              Save Preferences
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'security',
      label: <span><SafetyOutlined /> Security</span>,
      children: (
        <Form form={securityForm} layout="vertical" initialValues={{
          requireStrongPassword: true, auditLogging: true,
          maxLoginAttempts: 5, lockoutDuration: 15, passwordExpiry: 90,
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
              <Form.Item label="Lockout Duration (min)" name="lockoutDuration">
                <InputNumber min={5} max={1440} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Password Expiry (days)" name="passwordExpiry">
                <InputNumber min={0} max={365} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" loading={saving} onClick={() => message.success('Security settings saved')}>
              Save Security Settings
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'integrations',
      label: <span><ApiOutlined /> Integrations</span>,
      children: (
        <Form form={integrationForm} layout="vertical">
          <Divider orientation="left"><Tag color="blue">SMS</Tag> Semaphore</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Semaphore API Key" name="semaphoreApiKey"
                extra="Required for SMS notifications. Get your key at semaphore.co">
                <Input.Password placeholder="Your Semaphore API key" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="SMS Sender Name" name="smsSenderId">
                <Input placeholder="iHIMS" maxLength={11} />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left"><Tag color="orange">Payments</Tag> PayMongo</Divider>
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
          <Divider orientation="left"><Tag color="green">PhilHealth</Tag> eClaims</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="PhilHealth API Username" name="philhealthApiUser">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="PhilHealth API Password" name="philhealthApiPass">
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" loading={saving}
              onClick={() => message.success('Integration settings saved')}>
              Save Integration Settings
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'notifications',
      label: <span><BellOutlined /> Notifications</span>,
      children: (
        <Form layout="vertical" initialValues={{
          lowStockAlert: true, appointmentReminder: true, billDueReminder: true,
          labResultReady: true, admissionAlert: true, criticalVitals: true,
          reminderHours: 24,
        }}>
          <Row gutter={16}>
            <Col span={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {[
                  { name: 'lowStockAlert',       label: 'Low pharmacy stock alert' },
                  { name: 'appointmentReminder',  label: 'Appointment reminder to patient' },
                  { name: 'billDueReminder',      label: 'Bill due reminder' },
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
                  { name: 'labResultReady',  label: 'Lab result ready notification' },
                  { name: 'admissionAlert',  label: 'New admission alert to duty doctor' },
                  { name: 'criticalVitals',  label: 'Critical vital signs alert' },
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
        <Tabs items={tabs} defaultActiveKey="branding" />
      </Card>
    </div>
  );
};

export default SettingsPage;
