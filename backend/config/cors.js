import './env.js';

const normalizeOrigin = (value) => value.trim().replace(/\/+$/, '');

const parseCsvList = (value) => (
  (value || '')
    .split(',')
    .map(normalizeOrigin)
    .filter((origin) => origin && origin !== '*')
);

export const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL ? normalizeOrigin(process.env.CLIENT_URL) : '',
  ...parseCsvList(process.env.EXTRA_CLIENT_URLS),
].filter(Boolean);

export const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin);

export const validateCorsOrigin = (origin, callback) => {
  if (isAllowedOrigin(origin)) {
    return callback(null, true);
  }

  return callback(new Error('Not allowed by CORS'));
};

export const corsOptions = {
  origin: validateCorsOrigin,
  credentials: true,
};

export const socketCorsOptions = {
  origin: validateCorsOrigin,
  methods: ['GET', 'POST'],
  credentials: true,
};
