import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Typography, Input, Space, Tag, Spin } from 'antd';
import {
  AudioOutlined,
  AudioMutedOutlined,
  VideoCameraOutlined,
  StopOutlined,
  DesktopOutlined,
  PhoneOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTeleSession, useEndSession } from '../../hooks/useTelemedicine';

const { Text, Title } = Typography;

interface ChatMessage {
  id: number;
  text: string;
  from: 'me' | 'them';
  time: string;
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

const VideoConsultationPage: React.FC = () => {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || '';

  const { data: session } = useTeleSession(sessionId);
  const { mutateAsync: endSession } = useEndSession();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [ending, setEnding] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Start camera
  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setCameraAvailable(true);
      })
      .catch(() => {
        if (active) setCameraAvailable(false);
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const toggleMute = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(m => !m);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach(t => { t.enabled = isCameraOff; });
    setIsCameraOff(c => !c);
  }, [isCameraOff]);

  const handleEndCall = async () => {
    setEnding(true);
    try {
      await endSession({
        id: sessionId,
        data: { duration: Math.ceil(elapsed / 60) },
      });
    } catch {
      // End call regardless
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    navigate('/telemedicine');
  };

  const handleSendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { id: Date.now(), text, from: 'me', time: timeStr }]);
    setChatInput('');
  };

  return (
    <div style={{ height: '100vh', background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#1a1a1a', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid #333' }}>
        <VideoCameraOutlined style={{ color: '#52c41a', fontSize: 18 }} />
        <Text style={{ color: '#fff', fontWeight: 600 }}>
          Video Consultation — Room: <span style={{ fontFamily: 'monospace', color: '#52c41a' }}>{roomCode}</span>
        </Text>
        {session && (
          <Text style={{ color: '#aaa', fontSize: 12 }}>
            {session.patient?.firstName} {session.patient?.lastName} with Dr. {session.doctor?.lastName}
          </Text>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <Tag color="green" style={{ fontFamily: 'monospace', fontSize: 14, padding: '2px 12px' }}>
            {formatTime(elapsed)}
          </Tag>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video area */}
        <div style={{ flex: 1, position: 'relative', background: '#1a1a1a' }}>
          {/* Remote video placeholder */}
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(82,196,26,0.15)',
                animation: 'pulse 2s infinite',
              }} />
              <div style={{
                width: 80, height: 80, borderRadius: '50%', background: '#2a2a2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1,
              }}>
                <UserOutlined style={{ fontSize: 36, color: '#555' }} />
              </div>
            </div>
            <Text style={{ color: '#666', fontSize: 15 }}>Waiting for other party to join...</Text>
            <Spin size="small" />
          </div>

          {/* Self video (bottom right) */}
          <div style={{
            position: 'absolute', bottom: 24, right: 24, width: 200, height: 150,
            background: '#000', borderRadius: 8, overflow: 'hidden', border: '2px solid #333',
          }}>
            {cameraAvailable && !isCameraOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexDirection: 'column', gap: 8,
              }}>
                <StopOutlined style={{ fontSize: 24, color: '#555' }} />
                <Text style={{ color: '#555', fontSize: 11 }}>{cameraAvailable ? 'Camera Off' : 'No Camera'}</Text>
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div style={{
          width: 280, background: '#1a1a1a', borderLeft: '1px solid #333',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #333' }}>
            <Text style={{ color: '#fff', fontWeight: 600 }}>Chat</Text>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatMessages.length === 0 && (
              <Text style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
                No messages yet
              </Text>
            )}
            {chatMessages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.from === 'me' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: 12,
                  background: msg.from === 'me' ? '#1677ff' : '#2a2a2a',
                }}>
                  <Text style={{ color: '#fff', fontSize: 13 }}>{msg.text}</Text>
                </div>
                <Text style={{ color: '#555', fontSize: 10, marginTop: 2 }}>{msg.time}</Text>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: 12, borderTop: '1px solid #333', display: 'flex', gap: 8 }}>
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onPressEnter={handleSendChat}
              placeholder="Type a message..."
              style={{ background: '#2a2a2a', border: '1px solid #444', color: '#fff' }}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={handleSendChat} />
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div style={{
        background: '#1a1a1a', padding: '12px 24px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        borderTop: '1px solid #333',
      }}>
        <Button
          shape="circle"
          size="large"
          icon={isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
          onClick={toggleMute}
          style={{
            background: isMuted ? '#ff4d4f' : '#2a2a2a',
            border: 'none',
            color: '#fff',
          }}
          title={isMuted ? 'Unmute' : 'Mute'}
        />
        <Button
          shape="circle"
          size="large"
          icon={<VideoCameraOutlined />}
          onClick={toggleCamera}
          style={{
            background: isCameraOff ? '#ff4d4f' : '#2a2a2a',
            border: 'none',
            color: '#fff',
          }}
          title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
        />
        <Button
          shape="circle"
          size="large"
          icon={<DesktopOutlined />}
          style={{ background: '#2a2a2a', border: 'none', color: '#fff' }}
          title="Share Screen (not available)"
          disabled
        />
        <Space style={{ marginLeft: 24 }}>
          <Button
            danger
            type="primary"
            icon={<PhoneOutlined rotate={135} />}
            size="large"
            loading={ending}
            onClick={handleEndCall}
          >
            End Call
          </Button>
        </Space>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.4); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
};

export default VideoConsultationPage;
