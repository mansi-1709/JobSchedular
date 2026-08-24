import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Job, Worker } from '@prisma/client';
import { logger } from '../utils/logger';

let socketService: SocketService | null = null;

export class SocketService {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket) => {
      logger.info({ socketId: socket.id }, 'Client connected via WebSocket');

      socket.on('subscribe:org', (orgId: string) => {
        socket.join(`org:${orgId}`);
        logger.debug({ socketId: socket.id, orgId }, 'Client subscribed to org');
      });

      socket.on('subscribe:queue', (queueId: string) => {
        socket.join(`queue:${queueId}`);
      });

      socket.on('disconnect', () => {
        logger.debug({ socketId: socket.id }, 'Client disconnected');
      });
    });
  }

  emitJobUpdate(job: Job): void {
    this.io.emit('job:update', job);
    this.io.to(`queue:${job.queueId}`).emit('queue:job:update', job);
  }

  emitWorkerUpdate(worker: Worker): void {
    this.io.emit('worker:update', worker);
  }

  emitMetricsUpdate(data: unknown): void {
    this.io.emit('metrics:update', data);
  }

  getIO(): SocketIOServer {
    return this.io;
  }
}

export function initSocketService(httpServer: HTTPServer): SocketService {
  socketService = new SocketService(httpServer);
  return socketService;
}

export function getSocketService(): SocketService | null {
  return socketService;
}
