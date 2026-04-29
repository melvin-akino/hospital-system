import React, { useState } from 'react';
import {
  Drawer, Form, Select, Button, Space, Tag, Typography, Input, List,
  Avatar, Tooltip, Popconfirm, Empty, Spin,
} from 'antd';
import {
  PushpinOutlined, PushpinFilled, EditOutlined, DeleteOutlined,
  UserOutlined, PlusOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const NOTE_TYPE_COLORS: Record<string, string> = {
  TRIAGE: 'red', ASSESSMENT: 'orange', PROGRESS: 'blue',
  NURSING: 'cyan', DISCHARGE: 'purple', PROCEDURE: 'geekblue',
  REFERRAL: 'volcano', GENERAL: 'default',
};

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  admissionId?: string;
  consultationId?: string;
  patientName: string;
}

const ClinicalNotesPanel: React.FC<Props> = ({
  open, onClose, patientId, admissionId, consultationId, patientName,
}) => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const qKey = ['clinical-notes', patientId, admissionId, consultationId];

  const { data: notes, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () =>
      api.get('/clinical-notes', {
        params: { patientId, ...(admissionId && { admissionId }), ...(consultationId && { consultationId }) },
      }).then((r) => r.data?.data || []),
    enabled: open && !!patientId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/clinical-notes', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); form.resetFields(); setShowForm(false); setEditingId(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/clinical-notes/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); form.resetFields(); setShowForm(false); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clinical-notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      api.put(`/clinical-notes/${id}`, { isPinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  });

  const handleSubmit = (values: any) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...values });
    } else {
      createMutation.mutate({
        patientId,
        admissionId: admissionId || null,
        consultationId: consultationId || null,
        ...values,
      });
    }
  };

  const startEdit = (note: any) => {
    setEditingId(note.id);
    form.setFieldsValue({ noteType: note.noteType, content: note.content });
    setShowForm(true);
  };

  const noteList: any[] = notes || [];

  return (
    <Drawer
      title={
        <Space>
          <span>Clinical Notes</span>
          <Text type="secondary" style={{ fontSize: 13 }}>— {patientName}</Text>
        </Space>
      }
      open={open}
      onClose={() => { onClose(); setShowForm(false); setEditingId(null); form.resetFields(); }}
      width={560}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setShowForm(!showForm); setEditingId(null); form.resetFields(); }}>
          Add Note
        </Button>
      }
    >
      {showForm && (
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginBottom: 24 }}>
          <Form.Item name="noteType" label="Note Type" initialValue="GENERAL" rules={[{ required: true }]}>
            <Select
              options={Object.keys(NOTE_TYPE_COLORS).map((k) => ({ value: k, label: k }))}
            />
          </Form.Item>
          <Form.Item name="content" label="Note" rules={[{ required: true, message: 'Write something' }]}>
            <TextArea rows={5} placeholder="Write your clinical note here..." />
          </Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'Update' : 'Save Note'}
            </Button>
            <Button onClick={() => { setShowForm(false); setEditingId(null); form.resetFields(); }}>Cancel</Button>
          </Space>
        </Form>
      )}

      {isLoading ? (
        <Spin style={{ display: 'block', textAlign: 'center', padding: 40 }} />
      ) : noteList.length === 0 ? (
        <Empty description="No notes yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={noteList}
          renderItem={(note: any) => (
            <List.Item
              style={{
                background: note.isPinned ? '#fffbe6' : undefined,
                borderRadius: 8,
                marginBottom: 8,
                padding: '12px 16px',
                border: '1px solid #f0f0f0',
              }}
              actions={[
                <Tooltip title={note.isPinned ? 'Unpin' : 'Pin'}>
                  <Button
                    size="small"
                    type="text"
                    icon={note.isPinned ? <PushpinFilled style={{ color: '#faad14' }} /> : <PushpinOutlined />}
                    onClick={() => pinMutation.mutate({ id: note.id, isPinned: !note.isPinned })}
                  />
                </Tooltip>,
                note.authorId === user?.id && (
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => startEdit(note)} />
                ),
                note.authorId === user?.id && (
                  <Popconfirm title="Delete this note?" onConfirm={() => deleteMutation.mutate(note.id)}>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ),
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} size="small" />}
                title={
                  <Space wrap>
                    <Tag color={NOTE_TYPE_COLORS[note.noteType] || 'default'} style={{ fontSize: 11 }}>
                      {note.noteType}
                    </Tag>
                    <Text strong style={{ fontSize: 13 }}>
                      {note.authorName || note.author?.displayName || note.author?.username}
                    </Text>
                    {note.departmentName && (
                      <Text type="secondary" style={{ fontSize: 11 }}>({note.departmentName})</Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(note.createdAt).format('MMM D, h:mm A')}
                    </Text>
                  </Space>
                }
                description={
                  <Paragraph
                    style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}
                    ellipsis={{ rows: 4, expandable: true, symbol: 'more' }}
                  >
                    {note.content}
                  </Paragraph>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
};

export default ClinicalNotesPanel;
