import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: unknown[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn('Slow query detected', { text, duration });
    }
    return res;
  } catch (err) {
    logger.error('Database query error', { text, error: err });
    throw err;
  }
};

export const getClient = async (): Promise<PoolClient> => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);

  // Timeout after 5s if client not released
  const timeout = setTimeout(() => {
    logger.error('Client checkout exceeded 5 seconds');
    client.release();
  }, 5000);

  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return client;
};

export const transaction = async <T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export default pool;
