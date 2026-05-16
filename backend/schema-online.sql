CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(2083) NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  activation_token VARCHAR(255) NULL,
  activation_token_expires DATETIME NULL,
  reset_token VARCHAR(255) NULL,
  reset_token_expires DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_activation_token (activation_token),
  INDEX idx_users_reset_token (reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NULL,
  image_url VARCHAR(2083) NULL,
  note_color VARCHAR(7) NULL,
  password_hash VARCHAR(255) NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  pinned_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notes_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  INDEX idx_notes_user_id (user_id),
  INDEX idx_notes_pinned (pinned),
  INDEX idx_notes_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS labels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#007bff',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_labels_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  UNIQUE KEY unique_label_per_user (user_id, name),
  INDEX idx_labels_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS note_labels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  note_id INT NOT NULL,
  label_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_note_labels_note
    FOREIGN KEY (note_id) REFERENCES notes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_note_labels_label
    FOREIGN KEY (label_id) REFERENCES labels(id)
    ON DELETE CASCADE,
  UNIQUE KEY unique_note_label (note_id, label_id),
  INDEX idx_note_labels_note_id (note_id),
  INDEX idx_note_labels_label_id (label_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shared_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  note_id INT NOT NULL,
  owner_id INT NOT NULL,
  shared_with_user_id INT NOT NULL,
  permission ENUM('read', 'edit') NOT NULL DEFAULT 'read',
  shared_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shared_notes_note
    FOREIGN KEY (note_id) REFERENCES notes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_shared_notes_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_shared_notes_shared_user
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  UNIQUE KEY unique_note_share (note_id, shared_with_user_id),
  INDEX idx_shared_notes_note_id (note_id),
  INDEX idx_shared_notes_owner_id (owner_id),
  INDEX idx_shared_notes_shared_with_user_id (shared_with_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  note_id INT NOT NULL,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_collaboration_sessions_note
    FOREIGN KEY (note_id) REFERENCES notes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_collaboration_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  UNIQUE KEY unique_collaboration_user_note (note_id, user_id),
  INDEX idx_collaboration_sessions_note_id (note_id),
  INDEX idx_collaboration_sessions_user_id (user_id),
  INDEX idx_collaboration_sessions_session_token (session_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
