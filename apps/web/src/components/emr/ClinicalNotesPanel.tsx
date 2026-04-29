import React, { useState } from 'react';
import {
  Card, Button, Space, Tag, Typography, Form, Input, Select, Modal,
  Timeline, Tooltip, Popconfirm, Empty, Spin, Badge, Row, Col,
} from 'antd';
import {
  PlusOutlined, PushpinOutlined, PushpinFilled, EditOutlined,
  DeleteOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import dayjs from 'dayjs';
import api from '../../lib/api';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const NOTE_TYPES = [
  { value: 'PROGRESS',   label: 'Progress Note',   color: 'blue' },
  { value: 'ASSESSMENT', label: 'Assessment',       color: 'purple' },
  { value: 'NURSING',    label: 'Nursing Note',     color: 'green' },
  { value: 'TRIAGE',     label: 'Triage',           color: 'orange' },
  { value: 'PROCEDURE',  label: 'Procedure Note',   color: 'cyan' },
  { value: 'DISCHARGE',  label: 'Discharge Note',   color: 'volcano' },
  { value: 'REFERRAL',   label: 'Referral',         color: 'gold' },
  { value: 'GENERAL',    label: 'General',          color: 'default' },
];

const typeColor = (t: string) => NOTE_TYPES.find((n) => n.value === t)?.color || 'default';
const typeLabel = (t: string) => NOTE_TYPES.find((n) => n.value === t)?.label || t;

interface Props {
  patientId: string;
  admissionId?: string;
  consultationId?: string;
}

const ClinicalNotesPanel: React.FC<Props> = ({ patientId, admissionId, consultationId }) => {
  const { message } = App.useApp();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<any>(null);
  const [form] = Form.useForm();

  const queryKey = ['clinical-notes', { patientId, admissionId, consultationId }];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params: Record<string, string> = { patientId };
      if (admissionId)    params['admissionId']    = admissionId;
      if (consultationId) params['consultationId'] = consultationId;
      return api.get('/clinical-notes', { params }).then((r) => r.data?.data || []);
    },
  });

  const notes: any[] = data || [];

  const createNote = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/clinical-notes', body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); message.success('Note added'); },
    onError:   (e: any) => message.error(e?.response?.data?.message || 'Failed to add note'),
  });

  const updateNote = useMutation({
    mutationFn: ({ id, data: body }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/clinical-notes/${id}`, body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); message.success('Note updated'); },
    onError:   (e: any) => message.error(e?.response?.data?.message || 'Failed to update note'),
  });

  const deleteNote = useMutation({
    mutationFn: (id: string) => api.delete(`/clinical-notes/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); message.success('Note deleted'); },
    onError:   (e: any) => message.error(e?.response?.data?.message || 'Cannot delete note'),
  });

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('noteType', 'PROGRESS');
    setModalOpen(true);
  };

  const openEdit = (note: any) => {
    setEditing(note);
    form.setFieldsValue({ noteType: note.noteType, content: note.content, isPinned: note.isPinned });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    if (editing) {
      await updateNote.mutateAsync({ id: editing.id, data: values });
    } else {
      await createNote.mutateAsync({
        patientId,
        admissionId:    admissionId    || undefined,
        consultationId: consultationId || undefined,
        ...values,
      });
    }
    setModalOpen(false);
  };

  const togglePin = (note: any) => {
    updateNote.mutate({ id: note.id, data: { isPinned: !note.isPinned } });
  };

  if (isLoading) return <Spin />;

  return (
    <App>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space>
            <FileTextOutlined />
            <Text strong>Clinical Notes</Text>
            <Badge count={notes.length} color="#1890ff" showZero />
          </Space>
        </Col>
        <Col>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAdd}>
            Add Note
          </Button>
        </Col>
      </Row>

      {notes.length === 0 ? (
        <Empty description="No clinical notes yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Timeline
          items={notes.map((note) => ({
            color: note.isPinned ? 'red' : 'blue',
            children: (
              <Card
                size="small"
                style={{
                  marginBottom: 8,
                  border: note.isPinned ? '1px solid #ff4d4f' : undefined,
                  background: note.isPinned ? '#fff1f0' : undefined,
                }}
                extra={
                  <Space>
                    <Tooltip title={note.isPinned ? 'Unpin' : 'Pin'}>
                      <Button
                        size="small" type="text"
                        icon={note.isPinned ? <PushpinFilled style={{ color: '#ff4d4f' }} /> : <PushpinOutlined />}
                        onClick={() => togglePin(note)}
                      />
                    </Tooltip>
                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(note)} />
                    <Popconfirm
                      title="Delete this note?"
                      onConfirm={() => deleteNote.mutate(note.id)}
                      okButtonProps={{ danger: true }}
                    >
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                }
              >
                <Space style={{ marginBottom: 6 }}>
                  <Tag color={typeColor(note.noteType)}>{typeLabel(note.noteType)}</Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {note.authorName} · {note.departmentName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(note.createdAt).format('MMM D, YYYY h:mm A')}
                  </Text>
                  {note.createdAt !== note.updatedAt && (
                    <Text type="secondary" style={{ fontSize: 10, fontStyle: 'italic' }}>edited</Text>
                  )}
                </Space>
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {note.content}
                </Paragraph>
              </Card>
            ),
          }))}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            {editing ? 'Edit Note' : 'Add Clinical Note'}
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Note'}
        okButtonProps={{ loading: createNote.isPending || updateNote.isPending }}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="noteType" label="Note Type" rules={[{ required: true }]}>
            <Select
              options={NOTE_TYPES.map((t) => ({
                value: t.value,
                label: <Space><Tag color={t.color}>{t.label}</Tag></Space>,
              }))}
            />
          </Form.Item>
          <Form.Item name="content" label="Note" rules={[{ required: true, message: 'Note content is required' }]}>
            <TextArea
              rows={8}
              placeholder={`Write your ${editing ? '' : 'progress/nursing/assessment '}note here…\n\nSubjective:\nObjective:\nAssessment:\nPlan:`}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </App>
  );
};

export default ClinicalNotesPanel;
