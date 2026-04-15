import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';

export interface QueueEntry {
  id: string;
  ticketNo: string;
  priority: number;
  status: string;
  createdAt: string;
  calledAt?: string;
  patient?: { firstName: string; lastName: string; patientNo: string; isSenior?: boolean; isPwd?: boolean };
}

export interface QueueSocketState {
  queue?: { id: string; name: string; department?: { name: string; code: string } };
  nowServing: QueueEntry | null;
  waiting: QueueEntry[];
  waitingCount: number;
  updatedAt?: string;
  connected: boolean;
}

/**
 * Subscribes to real-time queue updates for the given departmentId via Socket.io.
 * Falls back gracefully if Socket.io is unavailable.
 */
export function useQueueSocket(departmentId: string): QueueSocketState {
  const qc = useQueryClient();
  const [state, setState] = useState<QueueSocketState>({
    nowServing: null,
    waiting: [],
    waitingCount: 0,
    connected: false,
  });

  const deptRef = useRef(departmentId);
  deptRef.current = departmentId;

  useEffect(() => {
    if (!departmentId) return;

    const socket = getSocket();

    // Subscribe to this department's queue room
    socket.emit('queue:subscribe', departmentId);

    const handleUpdate = (payload: Omit<QueueSocketState, 'connected'>) => {
      setState({ ...payload, connected: true });
      // Also invalidate React Query cache so QueueManagementPage stays consistent
      qc.invalidateQueries({ queryKey: ['queue-status', departmentId] });
      qc.invalidateQueries({ queryKey: ['department-queues'] });
    };

    const handleConnect = () => {
      // Re-subscribe after reconnection
      socket.emit('queue:subscribe', deptRef.current);
      setState((prev) => ({ ...prev, connected: true }));
    };

    const handleDisconnect = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };

    socket.on('queue:update', handleUpdate);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Set initial connected state
    setState((prev) => ({ ...prev, connected: socket.connected }));

    return () => {
      socket.emit('queue:unsubscribe', departmentId);
      socket.off('queue:update', handleUpdate);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [departmentId, qc]);

  return state;
}
