import React from 'react';
import { Button, Result, Typography } from 'antd';
import { BugOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info });
    console.error('[ErrorBoundary] Caught render error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleLogout = () => {
    localStorage.removeItem('ihims_token');
    localStorage.removeItem('ihims_auth');
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f0f2f5',
            padding: 24,
          }}
        >
          <Result
            icon={<BugOutlined style={{ color: '#ff4d4f' }} />}
            status="error"
            title="Something went wrong"
            subTitle="An unexpected error occurred while rendering this page."
            extra={[
              <Button type="primary" key="home" onClick={this.handleGoHome}>
                Go to Dashboard
              </Button>,
              <Button key="reload" onClick={this.handleReload}>
                Reload Page
              </Button>,
              <Button key="logout" danger onClick={this.handleLogout}>
                Log Out
              </Button>,
            ]}
          >
            {this.state.error && (
              <div
                style={{
                  background: '#fff1f0',
                  border: '1px solid #ffccc7',
                  borderRadius: 6,
                  padding: '12px 16px',
                  maxWidth: 600,
                  margin: '0 auto',
                  textAlign: 'left',
                }}
              >
                <Paragraph>
                  <Text strong style={{ color: '#ff4d4f' }}>
                    {this.state.error.name}: {this.state.error.message}
                  </Text>
                </Paragraph>
                {this.state.error.stack && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', color: '#595959', fontSize: 12 }}>
                      Stack trace
                    </summary>
                    <pre
                      style={{
                        fontSize: 11,
                        color: '#8c8c8c',
                        overflow: 'auto',
                        marginTop: 8,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
