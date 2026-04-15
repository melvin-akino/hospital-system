import React, { useState } from 'react';
import {
  Card, Form, Input, Button, Typography, Row, Col, Divider,
  Avatar, Tag, message, Space, Alert,
} from 'antd';
import {
  UserOutlined, MailOutlined, PhoneOutlined,
  LockOutlined, SaveOutlined, EditOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

const { Title, Text } = Typography;

const roleColors: Record<string, string> = {
  SUPER_ADMIN: '#f50',
  ADMIN: '#2db7f5',
  DOCTOR: '#87d068',
  NURSE: '#108ee9',
  BILLING: '#722ed1',
  RECEPTIONIST: '#13c2c2',
  PHARMACIST: '#fa8c16',
  LAB_TECH: '#52c41a',
  RADIOLOGY_TECH: '#1890ff',
};

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [editingProfile, setEditingProfile] = useState(false);
  const queryClient = useQueryClient();

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: (data: { email?: string; displayName?: string; phone?: string }) =>
      api.put('/auth/profile', data).then((r) => r.data.data),
    onSuccess: (updated) => {
      updateUser(updated);
      setEditingProfile(false);
      message.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.put('/auth/change-password', data).then((r) => r.data),
    onSuccess: () => {
      passwordForm.resetFields();
      message.success('Password changed. Other sessions have been signed out.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Failed to change password');
    },
  });

  const handleProfileSave = (values: { email: string; displayName?: string; phone?: string }) => {
    updateProfile.mutate(values);
  };

  const handlePasswordChange = (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('New passwords do not match');
      return;
    }
    changePassword.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  };

  if (!user) return null;

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>My Profile</Title>

      {/* Profile info card */}
      <Card
        extra={
          !editingProfile && (
            <Button icon={<EditOutlined />} onClick={() => setEditingProfile(true)}>
              Edit
            </Button>
          )
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={24} align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Avatar
              size={72}
              style={{ backgroundColor: roleColors[user.role] || '#1890ff', fontSize: 28 }}
              icon={<UserOutlined />}
            />
          </Col>
          <Col>
            <Space direction="vertical" size={2}>
              <Title level={4} style={{ margin: 0 }}>
                {user.displayName || user.username}
              </Title>
              <Text type="secondary">@{user.username}</Text>
              <Tag color={roleColors[user.role] || 'blue'}>
                {user.role.replace(/_/g, ' ')}
              </Tag>
            </Space>
          </Col>
        </Row>

        {editingProfile ? (
          <Form
            form={profileForm}
            layout="vertical"
            initialValues={{
              email: user.email,
              displayName: user.displayName || '',
              phone: user.phone || '',
            }}
            onFinish={handleProfileSave}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Display Name"
                  name="displayName"
                >
                  <Input prefix={<UserOutlined />} placeholder="Your full name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Email Address"
                  name="email"
                  rules={[
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'Enter a valid email' },
                  ]}
                >
                  <Input prefix={<MailOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Phone Number" name="phone">
                  <Input prefix={<PhoneOutlined />} placeholder="09XXXXXXXXX" />
                </Form.Item>
              </Col>
            </Row>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={updateProfile.isPending}
              >
                Save Changes
              </Button>
              <Button onClick={() => setEditingProfile(false)}>Cancel</Button>
            </Space>
          </Form>
        ) : (
          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Text type="secondary">Email</Text>
              <div><Text>{user.email}</Text></div>
            </Col>
            <Col xs={24} md={12}>
              <Text type="secondary">Phone</Text>
              <div>
                <Text>{user.phone || '—'}</Text>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <Text type="secondary">Display Name</Text>
              <div>
                <Text>{user.displayName || '—'}</Text>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <Text type="secondary">Username</Text>
              <div><Text>{user.username}</Text></div>
            </Col>
          </Row>
        )}
      </Card>

      {/* Change Password card */}
      <Card title={<><LockOutlined style={{ marginRight: 8 }} />Change Password</>}>
        <Alert
          message="Password requirements"
          description="Minimum 8 characters. Changing your password will sign out all other active sessions."
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
          style={{ maxWidth: 400 }}
        >
          <Form.Item
            label="Current Password"
            name="currentPassword"
            rules={[{ required: true, message: 'Enter your current password' }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />

          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[
              { required: true, message: 'Enter a new password' },
              { min: 8, message: 'At least 8 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={changePassword.isPending}
          >
            Change Password
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default ProfilePage;
