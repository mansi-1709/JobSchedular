import http from 'http';
import app from './app';
import { config } from './config/env';
import { prisma } from './config/prisma';
import { logger } from './utils/logger';
import { initSocketService } from './services/socket.service';
import { startScheduler, stopScheduler } from './services/scheduler.service';

async function main() {
  // Test database connection
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to database');
    process.exit(1);
  }

  // Create HTTP server and attach Socket.IO
  const httpServer = http.createServer(app);
  initSocketService(httpServer);
  logger.info('Socket.IO initialized');

  // Start the scheduler
  await startScheduler();

  // Start listening
  httpServer.listen(config.port, () => {
    logger.info(`API server running on port ${config.port} [${config.nodeEnv}]`);
    logger.info(`Swagger docs: http://localhost:${config.port}/api/docs`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    stopScheduler();
    httpServer.close(async () => {
      await prisma.$disconnect();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Startup error');
  process.exit(1);
});
