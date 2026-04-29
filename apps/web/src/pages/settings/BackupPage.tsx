/**
 * BackupPage.tsx
 *
 * Manual database backup UI (desktop / Tauri mode).
 * Calls Tauri's backup_database and list_backups commands.
 * Falls back to a notice in browser mode.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Button, Table, Typography, Space, Alert, Tag, Tooltip, message
} from 'antd';
import {
  DatabaseOutlined, DownloadOutlined, ReloadOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// Detect Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

const BackupPage: React.FC = () => {
  const [backups, setBackups]     = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);
  const [backing, setBacking]     = useState(false);

  const loadBackups = useCallback(async () => {
    if (!isTauri) return;
    setLoading(true);
    try {
      const list = await tauriInvoke<string[]>('list_backups');
      setBackups(list);
    } catch (err: any) {
      message.error(`Failed to list backups: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  const handleBackup = async () => {
    setBacking(true);
    try {
      const path = await tauriInvoke<string>('backup_database');
      message.success(`Backup saved: ${path.split(/[\\/]/).pop()}`);
      await loadBackups();
    } catch (err: any) {
      message.error(`Backup failed: ${err}`);
    } finally {
      setBacking(false);
    }
  };

  const columns = [
    {
      title: 'File',
      dataIndex: 'file',
      key: 'file',
      render: (f: string) => <Text code>{f.split(/[\\/]/).pop()}</Text>,
    },
    {
      title: 'Date / Time',
      dataIndex: 'datetime',
      key: 'datetime',
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag icon={<CheckCircleOutlined />} color="success">Complete</Tag>,
    },
  ];

  const tableData = backups.map((b, i) => {
    const name = b.split(/[\\/]/).pop() || '';
    // Extract timestamp from filename: pibs_db_YYYYMMDD_HHMMSS.sql
    const match = name.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
    const datetime = match
      ? dayjs(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`).format('YYYY-MM-DD HH:mm:ss')
      : 'Unknown';
    return { key: i, file: b, datetime };
  });

  if (!isTauri) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={3}><DatabaseOutlined /> Database Backup</Title>
        <Alert
          type="info"
          showIcon
          message="Desktop App Only"
          description="Automated backup is available in the iHIMS desktop app (Windows installer). In browser mode, use pg_dump manually or your database admin tool."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <Title level={3}><DatabaseOutlined /> Database Backup</Title>

      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text>
            Backups are saved as SQL dump files to{' '}
            <Text code>%APPDATA%\com.pibs.ihims\backups\</Text>.
            Each backup captures the full database — patients, billing, clinical records, and all configuration.
          </Text>
          <Alert
            type="warning"
            showIcon
            message="Recommendation"
            description="Take a backup before upgrading iHIMS and at least once daily in production. Copy backups to an external drive or cloud storage for off-site protection."
          />
          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={backing}
              onClick={handleBackup}
              size="large"
            >
              {backing ? 'Backing up…' : 'Backup Now'}
            </Button>
            <Tooltip title="Refresh list">
              <Button icon={<ReloadOutlined />} onClick={loadBackups} loading={loading} />
            </Tooltip>
          </Space>
        </Space>
      </Card>

      <Card title={`Backup History (${backups.length} files)`}>
        <Table
          columns={columns}
          dataSource={tableData}
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No backups yet — click "Backup Now" to create the first one.' }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default BackupPage;
