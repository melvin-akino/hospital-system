import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import HelpDrawer from './HelpDrawer';

const { Content } = Layout;

const SIDER_WIDTH = 240;
const SIDER_COLLAPSED_WIDTH = 80;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const siderWidth = collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />

      <Layout
        style={{
          marginLeft: siderWidth,
          transition: 'margin-left 0.2s',
        }}
      >
        <Header
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          siderWidth={SIDER_WIDTH}
          onHelpOpen={() => setHelpOpen(true)}
        />

        <Content
          style={{
            marginTop: 64,
            overflow: 'auto',
            height: 'calc(100vh - 64px)',
            background: '#f0f2f5',
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Layout>
  );
};

export default MainLayout;
