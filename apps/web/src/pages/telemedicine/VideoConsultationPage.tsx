/**
 * VideoConsultationPage — WebRTC peer-to-peer video consultation
 *
 * Architecture:
 *   - Signaling:  Socket.io via /socket.io (same server as queue updates)
 *   - ICE:        Google STUN servers (no TURN needed for LAN/test deployments)
 *   - Media:      getUserMedia (camera + mic) / getDisplayMedia (screen share)
 *   - Chat:       Socket.io relay (tele:chat events)
 *
 * Room join flow:
 *   1. Both participants open /telemedicine/room/:roomCode?sessionId=xxx
 *   2. Each emits tele:join → server adds to Socket.io room tele:{roomCode}
 *   3. Second joiner receives tele:peer-joined → creates RTCPeerConnection + offer
 *   4. Server relays offer → first joiner creates answer
 *   5. ICE candidates exchanged via server until P2P link established
 */

import React, {
  useEffect, useRef, useState, useCallback,
} from 'react';
import {
  Button, Typography, Input, Space, Tag, Spin, Tooltip, Badge,
} from 'antd';
import {
  AudioOutlined, AudioMutedOutlined, VideoCameraOutlined,
  StopOutlined, DesktopOutlined, PhoneOutlined, SendOutlined,
  UserOutlined, WifiOutlined, DisconnectOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTeleSession, useEndSession } from '../../hooks/useTelemedicine';
import { getSocket } from '../../lib/socket';

const { Text } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: number;
  text: string;
  displayName: string;
  fromId: string;
  fromMe: boolean;
  time: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

// ─────────────────────────────────────────────────────────────────────────────

const VideoConsultationPage: React.FC = () => {
  const navigate     = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || '';

  const { data: session } = useTeleSession(sessionId);
  const { mutateAsync: endSession } = useEndSession();

  // ── Media refs ──────────────────────────────────────────────────────────────
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // ── WebRTC refs ─────────────────────────────────────────────────────────────
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const mySocketId     = useRef<string>('');

  // ── State ───────────────────────────────────────────────────────────────────
  const [isMuted,        setIsMuted]        = useState(false);
  const [isCameraOff,    setIsCameraOff]    = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [elapsed,        setElapsed]        = useState(0);
  const [chatMessages,   setChatMessages]   = useState<ChatMessage[]>([]);
  const [chatInput,      setChatInput]      = useState('');
  const [ending,         setEnding]         = useState(false);
  const [peerConnected,  setPeerConnected]  = useState(false);
  const [peerDisplayName, setPeerDisplayName] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Derive display name from session data
  const displayName = session
    ? `Dr. ${session.doctor?.lastName ?? 'Doctor'}`
    : 'Participant';

  // ── Camera / mic init ───────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCameraAvailable(true);
      })
      .catch(() => {
        if (!active) return;
        // Try audio-only
        navigator.mediaDevices.getUserMedia({ video: false, audio: true })
          .then(stream => {
            if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
            localStreamRef.current = stream;
            setCameraAvailable(false);
          })
          .catch(() => { if (active) setCameraAvailable(false); });
      });

    return () => {
      active = false;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Elapsed timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Auto-scroll chat ────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── WebRTC peer connection factory ──────────────────────────────────────────
  const createPeerConnection = useCallback((socket: ReturnType<typeof getSocket>) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Receive remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setPeerConnected(true);
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('tele:ice-candidate', {
          roomCode,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'connected') {
        setPeerConnected(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setPeerConnected(false);
      }
    };

    return pc;
  }, [roomCode]);

  // ── Socket.io signaling ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return;

    const socket = getSocket();
    mySocketId.current = socket.id ?? '';

    const onConnect = () => {
      setSocketConnected(true);
      mySocketId.current = socket.id ?? '';
      socket.emit('tele:join', roomCode, displayName);
    };

    const onDisconnect = () => {
      setSocketConnected(false);
      setPeerConnected(false);
    };

    // ── Room info: tells us how many peers are already present ──────────────
    const onRoomInfo = ({ peerCount }: { peerCount: number }) => {
      if (peerCount > 0) {
        // We are the second to arrive → initiate offer
        const pc = createPeerConnection(socket);
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('tele:offer', { roomCode, offer: pc.localDescription! });
          })
          .catch(console.error);
      }
    };

    // ── Peer joined (we were first, they arrived) ──────────────────────────
    const onPeerJoined = ({ peerId, displayName: dn }: { peerId: string; displayName: string }) => {
      setPeerDisplayName(dn);
      // First peer waits for an offer — peer connection created when offer arrives
      console.log(`[Tele] Peer joined: ${dn} (${peerId})`);
    };

    // ── Received offer ─────────────────────────────────────────────────────
    const onOffer = async ({ offer, fromId }: { offer: RTCSessionDescriptionInit; fromId: string }) => {
      const pc = createPeerConnection(socket);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('tele:answer', { roomCode, answer: pc.localDescription!, targetId: fromId });
    };

    // ── Received answer ────────────────────────────────────────────────────
    const onAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    // ── ICE candidate ──────────────────────────────────────────────────────
    const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch { /* ignore */ }
      }
    };

    // ── Remote chat message ────────────────────────────────────────────────
    const onChat = (msg: { id: number; text: string; displayName: string; fromId: string; time: string }) => {
      setChatMessages(prev => [...prev, {
        ...msg,
        fromMe: msg.fromId === socket.id,
      }]);
    };

    // ── Peer left ─────────────────────────────────────────────────────────
    const onPeerLeft = () => {
      setPeerConnected(false);
      setPeerDisplayName(null);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      pcRef.current?.close();
      pcRef.current = null;
      setConnectionState('new');
    };

    // Register listeners
    socket.on('connect',             onConnect);
    socket.on('disconnect',          onDisconnect);
    socket.on('tele:room-info',      onRoomInfo);
    socket.on('tele:peer-joined',    onPeerJoined);
    socket.on('tele:offer',          onOffer);
    socket.on('tele:answer',         onAnswer);
    socket.on('tele:ice-candidate',  onIceCandidate);
    socket.on('tele:chat',           onChat);
    socket.on('tele:peer-left',      onPeerLeft);

    // Emit join if already connected
    if (socket.connected) {
      setSocketConnected(true);
      mySocketId.current = socket.id ?? '';
      socket.emit('tele:join', roomCode, displayName);
    }

    return () => {
      socket.emit('tele:leave', roomCode);
      socket.off('connect',             onConnect);
      socket.off('disconnect',          onDisconnect);
      socket.off('tele:room-info',      onRoomInfo);
      socket.off('tele:peer-joined',    onPeerJoined);
      socket.off('tele:offer',          onOffer);
      socket.off('tele:answer',         onAnswer);
      socket.off('tele:ice-candidate',  onIceCandidate);
      socket.off('tele:chat',           onChat);
      socket.off('tele:peer-left',      onPeerLeft);
      pcRef.current?.close();
      pcRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, displayName]);

  // ── Media controls ──────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(m => !m);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = isCameraOff; });
    setIsCameraOff(c => !c);
  }, [isCameraOff]);

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    if (isSharingScreen) {
      // Stop screen share — switch back to camera
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;

      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        await sender?.replaceTrack(videoTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsSharingScreen(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        await sender?.replaceTrack(screenTrack);

        // Show screen in local preview
        if (localVideoRef.current) {
          const combined = new MediaStream([
            screenTrack,
            ...(localStreamRef.current?.getAudioTracks() ?? []),
          ]);
          localVideoRef.current.srcObject = combined;
        }

        // Auto-stop when user clicks browser's "Stop sharing" button
        screenTrack.onended = () => {
          setIsSharingScreen(false);
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (camTrack) {
            pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(camTrack);
            if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
          }
        };

        setIsSharingScreen(true);
      } catch {
        // User cancelled or browser denied
      }
    }
  }, [isSharingScreen]);

  // ── End call ────────────────────────────────────────────────────────────────
  const handleEndCall = async () => {
    setEnding(true);
    try {
      await endSession({ id: sessionId, data: { duration: Math.ceil(elapsed / 60) } });
    } catch { /* end regardless */ }

    const socket = getSocket();
    socket.emit('tele:leave', roomCode);
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    navigate('/telemedicine');
  };

  // ── Chat send ───────────────────────────────────────────────────────────────
  const handleSendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    const socket = getSocket();
    socket.emit('tele:chat', { roomCode, text, displayName });
    setChatInput('');
  };

  // ── Connection status label ─────────────────────────────────────────────────
  const statusLabel = () => {
    if (!socketConnected) return { text: 'Connecting...', color: 'default' as const };
    if (peerConnected)    return { text: '🟢 Connected',  color: 'success' as const };
    if (peerDisplayName)  return { text: '⏳ Connecting to peer...', color: 'processing' as const };
    return { text: '⏳ Waiting for other party...', color: 'processing' as const };
  };
  const status = statusLabel();

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#1a1a1a', padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid #333',
      }}>
        <VideoCameraOutlined style={{ color: '#52c41a', fontSize: 18 }} />
        <Text style={{ color: '#fff', fontWeight: 600 }}>
          Video Consultation — Room: <span style={{ fontFamily: 'monospace', color: '#52c41a' }}>{roomCode}</span>
        </Text>
        {session && (
          <Text style={{ color: '#aaa', fontSize: 12 }}>
            {session.patient?.firstName} {session.patient?.lastName} with Dr. {session.doctor?.lastName}
          </Text>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge status={status.color} text={<span style={{ color: '#ccc', fontSize: 12 }}>{status.text}</span>} />
          {socketConnected
            ? <WifiOutlined style={{ color: '#52c41a', fontSize: 14 }} />
            : <DisconnectOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />}
          <Tag color="green" style={{ fontFamily: 'monospace', fontSize: 14, padding: '2px 12px' }}>
            {formatTime(elapsed)}
          </Tag>
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ── Video area ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', background: '#000' }}>
          {/* Remote video (full size) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%', height: '100%', objectFit: 'contain',
              display: peerConnected ? 'block' : 'none',
            }}
          />

          {/* Waiting placeholder */}
          {!peerConnected && (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              {peerDisplayName ? (
                <>
                  <Spin size="large" />
                  <Text style={{ color: '#888', fontSize: 15 }}>
                    {connectionState === 'connecting' || connectionState === 'new'
                      ? `Connecting to ${peerDisplayName}...`
                      : `${peerDisplayName} connected — establishing video...`}
                  </Text>
                </>
              ) : (
                <>
                  <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: 'rgba(82,196,26,0.15)',
                      animation: 'pulse 2s infinite',
                    }} />
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%', background: '#2a2a2a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', zIndex: 1,
                    }}>
                      <UserOutlined style={{ fontSize: 36, color: '#555' }} />
                    </div>
                  </div>
                  <Text style={{ color: '#666', fontSize: 15 }}>Waiting for other party to join...</Text>
                  <Spin size="small" />
                  <Text style={{ color: '#444', fontSize: 12 }}>
                    Share room code: <span style={{ fontFamily: 'monospace', color: '#666' }}>{roomCode}</span>
                  </Text>
                </>
              )}
            </div>
          )}

          {/* Peer name badge */}
          {peerConnected && peerDisplayName && (
            <div style={{
              position: 'absolute', top: 12, left: 12,
              background: 'rgba(0,0,0,0.6)', borderRadius: 6,
              padding: '4px 10px',
            }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>{peerDisplayName}</Text>
            </div>
          )}

          {/* Self video (picture-in-picture) */}
          <div style={{
            position: 'absolute', bottom: 24, right: 24,
            width: 200, height: 150, background: '#000',
            borderRadius: 8, overflow: 'hidden', border: '2px solid #333',
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
                width: '100%', height: '100%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 8,
              }}>
                <StopOutlined style={{ fontSize: 24, color: '#555' }} />
                <Text style={{ color: '#555', fontSize: 11 }}>
                  {cameraAvailable ? 'Camera Off' : 'No Camera'}
                </Text>
              </div>
            )}
            {/* Self label */}
            <div style={{
              position: 'absolute', bottom: 4, left: 4,
              background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 6px',
            }}>
              <Text style={{ color: '#fff', fontSize: 10 }}>You</Text>
            </div>
          </div>
        </div>

        {/* ── Chat panel ───────────────────────────────────────────────────── */}
        <div style={{
          width: 280, background: '#1a1a1a', borderLeft: '1px solid #333',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #333' }}>
            <Text style={{ color: '#fff', fontWeight: 600 }}>Chat</Text>
          </div>
          <div style={{
            flex: 1, overflowY: 'auto', padding: 12,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {chatMessages.length === 0 && (
              <Text style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
                No messages yet
              </Text>
            )}
            {chatMessages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: msg.fromMe ? 'flex-end' : 'flex-start',
              }}>
                {!msg.fromMe && (
                  <Text style={{ color: '#888', fontSize: 10, marginBottom: 2 }}>{msg.displayName}</Text>
                )}
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: 12,
                  background: msg.fromMe ? '#1677ff' : '#2a2a2a',
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

      {/* ── Control bar ────────────────────────────────────────────────────── */}
      <div style={{
        background: '#1a1a1a', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 12, borderTop: '1px solid #333',
      }}>
        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
          <Button
            shape="circle" size="large"
            icon={isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
            onClick={toggleMute}
            style={{ background: isMuted ? '#ff4d4f' : '#2a2a2a', border: 'none', color: '#fff' }}
          />
        </Tooltip>

        <Tooltip title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}>
          <Button
            shape="circle" size="large"
            icon={<VideoCameraOutlined />}
            onClick={toggleCamera}
            style={{ background: isCameraOff ? '#ff4d4f' : '#2a2a2a', border: 'none', color: '#fff' }}
          />
        </Tooltip>

        <Tooltip title={isSharingScreen ? 'Stop Screen Share' : 'Share Screen'}>
          <Button
            shape="circle" size="large"
            icon={<DesktopOutlined />}
            onClick={toggleScreenShare}
            style={{
              background: isSharingScreen ? '#1677ff' : '#2a2a2a',
              border: isSharingScreen ? '2px solid #1677ff' : 'none',
              color: '#fff',
            }}
          />
        </Tooltip>

        <Space style={{ marginLeft: 24 }}>
          <Button
            danger type="primary"
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
