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

    // Client subscribes to a department's queue
    socket.on('queue:subscribe', (departmentId: string) => {
      socket.join(`queue:${departmentId}`);
      console.log(`[Socket.io] ${socket.id} subscribed to queue:${departmentId}`);
    });

    socket.on('queue:unsubscribe', (departmentId: string) => {
      socket.leave(`queue:${departmentId}`);
    });

    socket.on('disconnect', () => {
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
