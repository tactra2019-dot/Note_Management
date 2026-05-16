import { db } from '../config/db.js';

const mapUser = (user) => ({
  id: user.id,
  email: user.email,
  displayName: user.display_name,
  avatarUrl: user.avatar_url,
  isActive: Boolean(user.is_active),
  createdAt: user.created_at,
});

export const getProfile = async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, email, display_name, avatar_url, is_active, created_at FROM users WHERE id = ?',
    [req.user.id],
  );

  if (!rows.length) {
    return res.status(404).json({ message: 'User not found.' });
  }

  res.json({ user: mapUser(rows[0]) });
};

export const updateProfile = async (req, res) => {
  const { displayName, avatarUrl } = req.body;

  if (displayName !== undefined && !displayName.trim()) {
    return res.status(400).json({ message: 'Display name is required.' });
  }

  await db.query(
    `UPDATE users
     SET display_name = COALESCE(?, display_name),
         avatar_url = COALESCE(?, avatar_url),
         updated_at = NOW()
     WHERE id = ?`,
    [displayName?.trim() || null, avatarUrl || null, req.user.id],
  );

  return getProfile(req, res);
};

export const uploadAvatarImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Avatar image is required.' });
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  await db.query('UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?', [avatarUrl, req.user.id]);

  const [rows] = await db.query(
    'SELECT id, email, display_name, avatar_url, is_active, created_at FROM users WHERE id = ?',
    [req.user.id],
  );

  res.json({ user: mapUser(rows[0]) });
};
