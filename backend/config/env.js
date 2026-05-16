import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const envPath = resolve(__dirname, '..', '.env');
export const envLoadResult = dotenv.config({ path: envPath });

export const hasEnvValue = (key) => Object.prototype.hasOwnProperty.call(process.env, key);

export const getEnvLoadSummary = () => ({
  path: envPath,
  loaded: !envLoadResult.error,
  error: envLoadResult.error ? envLoadResult.error.message : null,
});
