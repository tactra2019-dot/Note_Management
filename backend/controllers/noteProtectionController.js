import { db } from '../config/db.js';
import bcrypt from 'bcryptjs';

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item?.id != null);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id != null) : [];
  } catch {
    return [];
  }
};

// Set password for a note
export const setNotePassword = async (req, res) => {
  const { id } = req.params;
  const { password, confirmPassword } = req.body;
  const userId = req.user.id;

  const [existingRows] = await db.query('SELECT id FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
  if (existingRows.length === 0) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  if (!password || password.length < 4) {
    return res.status(400).json({ message: 'Note password must be at least 4 characters long.' });
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.query('UPDATE notes SET password_hash = ? WHERE id = ? AND user_id = ?', [passwordHash, id, userId]);

  res.json({ message: 'Note password updated successfully.' });
};

// Verify note password
export const verifyNotePassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const userId = req.user.id;

  const [rows] = await db.query(
    `SELECT
       n.password_hash,
       n.content,
       n.image_url,
       (
         SELECT JSON_ARRAYAGG(JSON_OBJECT(
           'id', ni.id,
           'image_url', ni.image_url,
           'original_name', ni.original_name,
           'mime_type', ni.mime_type,
           'size_bytes', ni.size_bytes,
           'created_at', ni.created_at
         ))
         FROM note_images ni
         WHERE ni.note_id = n.id
       ) AS images
     FROM notes n
     LEFT JOIN shared_notes sn ON sn.note_id = n.id AND sn.shared_with_user_id = ?
     WHERE n.id = ? AND (n.user_id = ? OR sn.shared_with_user_id = ?)`,
    [userId, id, userId, userId],
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  if (!rows[0].password_hash) {
    return res.json({
      verified: true,
      message: 'Note has no password.',
      content: rows[0].content,
      image_url: rows[0].image_url,
      images: parseJsonArray(rows[0].images),
    });
  }

  const isValid = await bcrypt.compare(password, rows[0].password_hash);
  res.json({
    verified: isValid,
    content: isValid ? rows[0].content : undefined,
    image_url: isValid ? rows[0].image_url : undefined,
    images: isValid ? parseJsonArray(rows[0].images) : undefined,
  });
};

// Change note password (requires old password)
export const changeNotePassword = async (req, res) => {
  const { id } = req.params;
  const { oldPassword, currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id;

  const [rows] = await db.query('SELECT password_hash FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  // Verify old password
  const providedCurrentPassword = currentPassword || oldPassword;
  if (rows[0].password_hash && !(await bcrypt.compare(providedCurrentPassword || '', rows[0].password_hash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ message: 'New password must be at least 4 characters long.' });
  }
  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New passwords do not match.' });
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE notes SET password_hash = ? WHERE id = ? AND user_id = ?', [newPasswordHash, id, userId]);

  res.json({ message: 'Note password changed successfully.' });
};

// Remove note password
export const removeNotePassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const userId = req.user.id;

  const [rows] = await db.query('SELECT password_hash FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
  if (rows.length === 0) return res.status(404).json({ message: 'Note not found.' });

  if (rows[0].password_hash && !(await bcrypt.compare(password, rows[0].password_hash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }

  await db.query('UPDATE notes SET password_hash = NULL WHERE id = ? AND user_id = ?', [id, userId]);
  res.json({ message: 'Password removed successfully.' });
};
