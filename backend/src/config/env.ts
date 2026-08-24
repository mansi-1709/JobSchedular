import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  jwt: {
    secret: requireEnv('JWT_SECRET', 'dev_secret_change_in_production_please'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  scheduler: {
    tickMs: parseInt(process.env.SCHEDULER_TICK_MS ?? '5000', 10),
  },
  worker: {
    heartbeatTimeoutMs: 30000, // workers are OFFLINE if no heartbeat in 30s
  },
};

export default config;
