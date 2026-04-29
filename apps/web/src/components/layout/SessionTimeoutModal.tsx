import React, { useEffect, useState } from 'react';
import { Modal, Button, Typography, Progress } from 'antd';
import { ClockCircleOutlined, LogoutOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface Props {
  open: boolean;
  secondsRemaining: number;
  onStay: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<Props> = ({
  open,
  secondsRemaining,
  onStay,
  onLogout,
}) => {
  const totalSeconds = 120; // 2-minute warning window
  const percent = Math.max(0, Math.round((secondsRemaining / totalSeconds) * 100));
  const strokeColor = secondsRemaining > 60 ? '#faad14' : '#ff4d4f';

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <Modal
      open={open}
      closable={false}
      maskClosable={false}
      footer={null}
      centered
      width={420}
    >
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <ClockCircleOutlined style={{ fontSize: 48, color: strokeColor, marginBottom: 16 }} />

        <Title level={4} style={{ marginBottom: 4 }}>
          Session Expiring Soon
        </Title>
        <Text type="secondary">
          You've been inactive. Your session will expire in:
        </Text>

        <div style={{ margin: '20px 0' }}>
          <Progress
            type="circle"
            percent={percent}
            strokeColor={strokeColor}
            format={() => (
              <span style={{ fontSize: 22, fontWeight: 700, color: strokeColor }}>
                {fmt(secondsRemaining)}
              </span>
            )}
            size={120}
          />
        </div>

        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Any unsaved work will be lost when the session expires.
        </Text>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button
            type="primary"
            size="large"
            onClick={onStay}
            style={{ minWidth: 160 }}
          >
            Stay Logged In
          </Button>
          <Button
            size="large"
            icon={<LogoutOutlined />}
            onClick={onLogout}
            danger
          >
            Logout Now
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SessionTimeoutModal;
