import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type { Job, Worker, Metrics } from '../types/api.types';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  subscribeToQueue: (queueId: string) => void;
  unsubscribeFromQueue: (queueId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const wsUrl = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';
    const socketIo = io(wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      withCredentials: true,
    });

    socketIo.on('connect', () => {
      setConnected(true);
      const orgId = user.orgId || user.organization?.id;
      if (orgId) {
        socketIo.emit('subscribe:org', orgId);
      }
    });

    socketIo.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [user]);

  const subscribeToQueue = (queueId: string) => {
    if (socket && connected) {
      socket.emit('subscribe:queue', queueId);
    }
  };

  const unsubscribeFromQueue = (queueId: string) => {
    if (socket && connected) {
      socket.emit('unsubscribe:queue', queueId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, subscribeToQueue, unsubscribeFromQueue }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

// Custom hooks to easily listen to specific events
export function useJobUpdate(callback: (job: Job) => void) {
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on('job:update', callback);
    return () => { socket.off('job:update', callback); };
  }, [socket, callback]);
}

export function useWorkerUpdate(callback: (worker: Worker) => void) {
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on('worker:update', callback);
    return () => { socket.off('worker:update', callback); };
  }, [socket, callback]);
}

export function useMetricsUpdate(callback: (metrics: Metrics) => void) {
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on('metrics:update', callback);
    return () => { socket.off('metrics:update', callback); };
  }, [socket, callback]);
}
