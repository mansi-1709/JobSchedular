import os from 'os';
import { registerWorker, deregisterWorker } from './services/apiClient';
import { HeartbeatSender } from './heartbeat/heartbeat';
import { QueuePoller } from './queue/poller';
import { createLogger } from './utils/logger';

// Allow setting a human-readable worker ID via environment variable
const WORKER_LABEL = process.env.WORKER_ID ?? `worker-${os.hostname()}-${process.pid}`;
const logger = createLogger(WORKER_LABEL);

async function main() {
  logger.info(`Starting worker: ${WORKER_LABEL}`);

  // Register with API
  let workerId: string;
  try {
    const reg = await registerWorker(os.hostname(), process.pid);
    workerId = reg.id;
    logger.info({ workerId, hostname: os.hostname(), pid: process.pid }, 'Worker registered');
  } catch (err) {
    logger.fatal({ err }, 'Failed to register worker. Is the API server running?');
    process.exit(1);
  }

  // Start heartbeat
  const heartbeat = new HeartbeatSender(
    workerId,
    logger,
    parseInt(process.env.WORKER_HEARTBEAT_INTERVAL_MS ?? '5000', 10),
  );
  heartbeat.start();

  // Start polling
  const poller = new QueuePoller(
    workerId,
    logger,
    heartbeat,
    parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? '2000', 10),
  );
  poller.start();

  logger.info('Worker is ONLINE and polling for jobs...');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received — draining jobs...');

    // Stop accepting new jobs
    await poller.stop();
    heartbeat.stop();

    // Deregister from API
    try {
      await deregisterWorker(workerId);
      logger.info('Worker deregistered from API');
    } catch (err) {
      logger.warn({ err }, 'Failed to deregister worker — API may be down');
    }

    logger.info('Worker shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Worker startup error');
  process.exit(1);
});
