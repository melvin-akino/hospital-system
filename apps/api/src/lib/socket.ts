import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from './prisma';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer, allowedOrigins: string[]): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // ── Queue subscriptions ─────────────────────────────────────────────────
    socket.on('queue:subscribe', (departmentId: string) => {
      socket.join(`queue:${departmentId}`);
    });

    socket.on('queue:unsubscribe', (departmentId: string) => {
      socket.leave(`queue:${departmentId}`);
    });

    // ── Telemedicine WebRTC signaling ───────────────────────────────────────
    // Each telemedicine room is identified by its roomCode.
    // We support exactly 2 participants per room (doctor + patient).

    socket.on('tele:join', (roomCode: string, displayName: string) => {
      const room = `tele:${roomCode}`;
      socket.join(room);

      // Tell everyone else in the room that a new participant arrived
      socket.to(room).emit('tele:peer-joined', {
        peerId: socket.id,
        displayName,
      });

      // Tell the joining user how many peers are already in the room
      const roomSockets = io!.sockets.adapter.rooms.get(room);
      const peerCount = roomSockets ? roomSockets.size - 1 : 0; // subtract self
      socket.emit('tele:room-info', { peerCount, room });

      console.log(`[Tele] ${socket.id} (${displayName}) joined room ${room} (${peerCount + 1} total)`);
    });

    // Caller → Server → Callee: SDP offer
    socket.on('tele:offer', (data: { roomCode: string; offer: RTCSessionDescriptionInit; targetId?: string }) => {
      const room = `tele:${data.roomCode}`;
      if (data.targetId) {
        io!.to(data.targetId).emit('tele:offer', { offer: data.offer, fromId: socket.id });
      } else {
        socket.to(room).emit('tele:offer', { offer: data.offer, fromId: socket.id });
      }
    });

    // Callee → Server → Caller: SDP answer
    socket.on('tele:answer', (data: { roomCode: string; answer: RTCSessionDescriptionInit; targetId: string }) => {
      io!.to(data.targetId).emit('tele:answer', { answer: data.answer, fromId: socket.id });
    });

    // Either side → Server → Other: ICE candidate
    socket.on('tele:ice-candidate', (data: { roomCode: string; candidate: RTCIceCandidateInit; targetId?: string }) => {
      const room = `tele:${data.roomCode}`;
      if (data.targetId) {
        io!.to(data.targetId).emit('tele:ice-candidate', { candidate: data.candidate, fromId: socket.id });
      } else {
        socket.to(room).emit('tele:ice-candidate', { candidate: data.candidate, fromId: socket.id });
      }
    });

    // Chat message relay
    socket.on('tele:chat', (data: { roomCode: string; text: string; displayName: string }) => {
      const room = `tele:${data.roomCode}`;
      const msg = {
        id:          Date.now(),
        text:        data.text,
        displayName: data.displayName,
        fromId:      socket.id,
        time:        new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      };
      // Echo to sender too so they see their own message stamped with server time
      io!.to(room).emit('tele:chat', msg);
    });

    // Peer leaving (explicit)
    socket.on('tele:leave', (roomCode: string) => {
      const room = `tele:${roomCode}`;
      socket.to(room).emit('tele:peer-left', { peerId: socket.id });
      socket.leave(room);
    });

    // ── Disconnect cleanup ──────────────────────────────────────────────────
    socket.on('disconnect', () => {
      // Notify all tele rooms this socket was in
      socket.rooms.forEach((room) => {
        if (room.startsWith('tele:')) {
          socket.to(room).emit('tele:peer-left', { peerId: socket.id });
        }
      });
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

// ── Emit full queue state to all subscribers of a department ──────────────────
export async function emitQueueUpdate(departmentId: string): Promise<void> {
  if (!io) return;

  try {
    const queue = await prisma.queue.findFirst({
      where: { departmentId, isActive: true },
      include: {
        department: { select: { name: true, code: true } },
        entries: {
          where: { status: { in: ['WAITING', 'IN_SERVICE'] } },
          include: {
            patient: { select: { firstName: true, lastName: true, patientNo: true, isSenior: true, isPwd: true } },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!queue) return;

    const nowServing = queue.entries.find((e) => e.status === 'IN_SERVICE') ?? null;
    const waiting = queue.entries.filter((e) => e.status === 'WAITING');

    const payload = {
      queue: { id: queue.id, name: queue.name, department: queue.department },
      nowServing,
      waiting,
      waitingCount: waiting.length,
      updatedAt: new Date().toISOString(),
    };

    io.to(`queue:${departmentId}`).emit('queue:update', payload);
  } catch (err) {
    console.error('[Socket.io] emitQueueUpdate error:', err);
  }
}
