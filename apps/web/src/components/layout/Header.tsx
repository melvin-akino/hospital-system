import React from 'react';
import { Layout, Button, Dropdown, Avatar, Space, Typography, Badge, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';
import { useAuthStore } from '../../store/authStore';
import { useLogout } from '../../hooks/useAuth';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
  siderWidth: number;
  onHelpOpen: () => void;
}

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

const Header: React.FC<HeaderProps> = ({ collapsed, onToggle, siderWidth, onHelpOpen }) => {
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'help',
      icon: <ReadOutlined />,
      label: 'Help Center',
      onClick: () => navigate('/help'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: () => logout(),
    },
  ];

  return (
    <AntHeader
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        left: collapsed ? 80 : siderWidth,
        zIndex: 99,
        padding: '0 24px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
        height: 64,
        transition: 'left 0.2s',
      }}
    >
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onToggle}
        style={{ fontSize: 18, width: 40, height: 40 }}
      />

      <Space align="center">
        <Badge count={0}>
          <Button type="text" icon={<BellOutlined />} style={{ fontSize: 18 }} />
        </Badge>

        <Tooltip title="Help (?)">
          <Button
            type="text"
            icon={<QuestionCircleOutlined />}
            style={{ fontSize: 18 }}
            onClick={onHelpOpen}
          />
        </Tooltip>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
          <Space style={{ cursor: 'pointer', padding: '8px 12px' }}>
            <Avatar
              style={{
                backgroundColor: roleColors[user?.role || ''] || '#1890ff',
                flexShrink: 0,
              }}
              icon={<UserOutlined />}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
              <Text strong style={{ fontSize: 14 }}>
                {user?.displayName || user?.username || 'User'}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {user?.role?.replace(/_/g, ' ') || ''}
              </Text>
            </div>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
};

export default Header;
