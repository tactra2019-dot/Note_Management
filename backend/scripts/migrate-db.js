import '../config/env.js';
import { ensureDatabaseShape } from '../config/migrate.js';

try {
  await ensureDatabaseShape();
  console.log('Database migration completed.');
  process.exit(0);
} catch (error) {
  console.error('Database migration failed:', error.message);
  process.exit(1);
}
