import mysql from 'mysql2/promise';
import { hasEnvValue } from './env.js';

const getPasswordStatus = () => {
  if (!hasEnvValue('DB_PASSWORD')) return 'missing';
  return process.env.DB_PASSWORD ? 'set' : 'empty';
};

const parsePort = (value) => {
  const port = Number.parseInt(value || '3307', 10);
  return Number.isNaN(port) ? 3307 : port;
};

export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parsePort(process.env.DB_PORT),
  user: process.env.DB_USER || 'root',
  password: hasEnvValue('DB_PASSWORD') ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'note_app',
  waitForConnections: true,
  connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  namedPlaceholders: false,
};

let pool;

const connectPool = async () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
};

export const getDatabaseConfigSummary = () => ({
  DB_HOST: dbConfig.host,
  DB_PORT: dbConfig.port,
  DB_USER: dbConfig.user,
  DB_NAME: dbConfig.database,
  DB_PASSWORD: getPasswordStatus(),
});

const databaseConnectionErrorCodes = new Set([
  'ECONNREFUSED',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST',
  'ER_NOT_SUPPORTED_AUTH_MODE',
]);

export const isDatabaseConnectionError = (error) => databaseConnectionErrorCodes.has(error?.code);

export const explainDatabaseError = (error) => {
  const target = `${dbConfig.host}:${dbConfig.port}`;
  const code = error?.code || 'UNKNOWN';

  switch (code) {
    case 'ECONNREFUSED':
      return `Database connection refused. Check DB_HOST, DB_PORT, and whether the online database is running. Target: ${target}.`;
    case 'ER_ACCESS_DENIED_ERROR':
      return 'Database access denied. Check DB_USER and DB_PASSWORD.';
    case 'ER_BAD_DB_ERROR':
      return `Database not found. Import backend/schema.sql into the online database. DB_NAME: ${dbConfig.database}.`;
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return `DB_HOST '${dbConfig.host}' cannot be resolved. Check DB_HOST in backend/.env.`;
    case 'ETIMEDOUT':
      return `Timed out connecting to ${target}. Check DB_HOST, DB_PORT, firewall, and whether the database is running.`;
    case 'PROTOCOL_CONNECTION_LOST':
      return 'Database connection was lost. Restart MariaDB and try the request again.';
    case 'ER_NOT_SUPPORTED_AUTH_MODE':
      return 'The MySQL authentication mode is not supported by this connection. Use the bundled MariaDB on port 3307 or update the MySQL user authentication method.';
    default:
      return `Database error (${code}): ${error?.message || 'Unknown error'}`;
  }
};

export const testDatabaseConnection = async () => {
  const activePool = await connectPool();
  return activePool.query('SELECT 1 as test');
};

export const db = {
  query: async (query, params = []) => {
    try {
      const activePool = await connectPool();
      return await activePool.query(query, params);
    } catch (error) {
      console.error(explainDatabaseError(error));
      throw error;
    }
  },
};
