import { explainDatabaseError, isDatabaseConnectionError } from '../config/db.js';

export const errorHandler = (err, req, res, next) => {
  if (isDatabaseConnectionError(err)) {
    const message = explainDatabaseError(err);
    console.error(message);
    return res.status(503).json({ message });
  }

  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error.';
  res.status(status).json({ message });
};
