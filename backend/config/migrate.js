import { db } from './db.js';

const columnExists = async (tableName, columnName) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );
  return Number(rows[0]?.count || 0) > 0;
};

const addColumnIfMissing = async (tableName, columnName, definition) => {
  if (await columnExists(tableName, columnName)) return;
  await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
};

export const ensureDatabaseShape = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INT PRIMARY KEY,
      theme ENUM('light', 'dark') NOT NULL DEFAULT 'light',
      font_size ENUM('small', 'medium', 'large', 'xlarge') NOT NULL DEFAULT 'medium',
      note_color VARCHAR(7) NOT NULL DEFAULT '#ffffff',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_user_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS note_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      note_id INT NOT NULL,
      image_url VARCHAR(2083) NOT NULL,
      original_name VARCHAR(255) NULL,
      mime_type VARCHAR(100) NULL,
      size_bytes INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_note_images_note
        FOREIGN KEY (note_id) REFERENCES notes(id)
        ON DELETE CASCADE,
      INDEX idx_note_images_note_id (note_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await addColumnIfMissing('users', 'avatar_url', 'VARCHAR(2083) NULL AFTER display_name');
  await addColumnIfMissing('notes', 'pinned_at', 'TIMESTAMP NULL AFTER pinned');
  await addColumnIfMissing('notes', 'note_color', "VARCHAR(7) NULL AFTER image_url");
};
