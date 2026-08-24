import pino from 'pino';

export function createLogger(workerId: string) {
  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: `[${workerId}] {msg}`,
      },
    },
  });
}
