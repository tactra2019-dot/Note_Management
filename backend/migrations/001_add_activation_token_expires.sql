USE note_app;

ALTER TABLE users
  ADD COLUMN activation_token_expires DATETIME NULL AFTER activation_token;
