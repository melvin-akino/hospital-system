import React from 'react';
import { Result, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const { Text } = Typography;

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Result
        status="403"
        title="Access Denied"
        subTitle={
          <div>
            <p>You don't have permission to view this page.</p>
            {user && (
              <Text type="secondary">
                Your current role is <strong>{user.role.replace(/_/g, ' ')}</strong>.
                Contact your administrator if you need access.
              </Text>
            )}
          </div>
        }
        extra={[
          <Button type="primary" key="dashboard" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>,
        ]}
      />
    </div>
  );
};

export default UnauthorizedPage;
