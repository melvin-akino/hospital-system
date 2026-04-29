import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Layout } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import HelpDrawer from './HelpDrawer';
import SessionTimeoutModal from './SessionTimeoutModal';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import { useAuthStore } from '../../store/authStore';

const { Content } = Layout;

const SIDER_WIDTH           = 240;
const SIDER_COLLAPSED_WIDTH = 80;
const IDLE_TIMEOUT_MS       = 30 * 60 * 1000;  // 30 minutes
const WARN_BEFORE_MS        = 2  * 60 * 1000;  // warn 2 min before

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed]       = useState(false);
  const [helpOpen, setHelpOpen]         = useState(false);
  const [warnOpen, setWarnOpen]         = useState(false);
  const [secsLeft, setSecsLeft]         = useState(120);
  const countdownRef                    = useRef<ReturnType<typeof setInterval> | null>(null);

  const navigate  = useNavigate();
  const { logout, isAuthenticated } = useAuthStore();

  const siderWidth = collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH;

  // ── Countdown ticker ────────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    setSecsLeft(Math.round(WARN_BEFORE_MS / 1000));
    setWarnOpen(true);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setWarnOpen(false);
    setSecsLeft(Math.round(WARN_BEFORE_MS / 1000));
  }, []);

  // ── Force logout ─────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    stopCountdown();
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate, stopCountdown]);

  const { extendSession } = useIdleTimer({
    timeout:    IDLE_TIMEOUT_MS,
    warnBefore: WARN_BEFORE_MS,
    enabled:    isAuthenticated,
    onWarn:     startCountdown,
    onLogout:   handleLogout,
  });

  // Auto-logout when countdown hits 0
  useEffect(() => {
    if (secsLeft === 0 && warnOpen) handleLogout();
  }, [secsLeft, warnOpen, handleLogout]);

  // Cleanup on unmount
  useEffect(() => () => stopCountdown(), [stopCountdown]);

  const handleStay = useCallback(() => {
    stopCountdown();
    extendSession();
  }, [stopCountdown, extendSession]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />

      <Layout style={{ marginLeft: siderWidth, transition: 'margin-left 0.2s' }}>
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

      <SessionTimeoutModal
        open={warnOpen}
        secondsRemaining={secsLeft}
        onStay={handleStay}
        onLogout={handleLogout}
      />
    </Layout>
  );
};

export default MainLayout;
