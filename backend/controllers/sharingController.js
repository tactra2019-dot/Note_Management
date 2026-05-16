import { db } from '../config/db.js';
import { parseLabels } from '../utils/parseLabels.js';

// Share a note with another user
export const shareNote = async (req, res) => {
  const { id } = req.params;
  const { email, permission } = req.body;
  const ownerId = req.user.id;

  // Verify the note belongs to the user
  const [noteRows] = await db.query('SELECT id FROM notes WHERE id = ? AND user_id = ?', [id, ownerId]);
  if (noteRows.length === 0) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  // Find the user to share with
  const [userRows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (userRows.length === 0) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const sharedWithUserId = userRows[0].id;

  // Check if already shared
  const [existingRows] = await db.query(
    'SELECT id FROM shared_notes WHERE note_id = ? AND shared_with_user_id = ?',
    [id, sharedWithUserId]
  );

  if (existingRows.length > 0) {
    // Update permission if already shared
    await db.query(
      'UPDATE shared_notes SET permission = ? WHERE note_id = ? AND shared_with_user_id = ?',
      [permission, id, sharedWithUserId]
    );
    return res.json({ message: 'Note sharing updated successfully.' });
  }

  // Share the note
  await db.query(
    'INSERT INTO shared_notes (note_id, owner_id, shared_with_user_id, permission) VALUES (?, ?, ?, ?)',
    [id, ownerId, sharedWithUserId, permission]
  );

  res.status(201).json({ message: 'Note shared successfully.' });
};

// Get shared notes for current user
export const getSharedNotes = async (req, res) => {
  const userId = req.user.id;

  const [rows] = await db.query(`
    SELECT
      sn.id,
      sn.note_id,
      sn.permission,
      sn.shared_at,
      n.title,
      n.content,
      n.pinned,
      n.created_at,
      n.updated_at,
      u.display_name as owner_name,
      u.email as owner_email,
      JSON_ARRAYAGG(
        JSON_OBJECT('id', l.id, 'name', l.name, 'color', l.color)
      ) as labels
    FROM shared_notes sn
    JOIN notes n ON sn.note_id = n.id
    JOIN users u ON sn.owner_id = u.id
    LEFT JOIN note_labels nl ON n.id = nl.note_id
    LEFT JOIN labels l ON nl.label_id = l.id
    WHERE sn.shared_with_user_id = ?
    GROUP BY sn.id, sn.note_id, sn.permission, sn.shared_at, n.title, n.content, n.pinned, n.created_at, n.updated_at, u.display_name, u.email
    ORDER BY sn.shared_at DESC
  `, [userId]);

  // Clean up labels array
  const sharedNotes = rows.map(note => ({
    ...note,
    labels: parseLabels(note.labels)
  }));

  res.json({ sharedNotes });
};

// Update sharing permission
export const updateSharePermission = async (req, res) => {
  const { id } = req.params;
  const { permission } = req.body;
  const ownerId = req.user.id;

  const [result] = await db.query(
    'UPDATE shared_notes SET permission = ? WHERE id = ? AND owner_id = ?',
    [permission, id, ownerId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Shared note not found or not owned by you.' });
  }

  res.json({ message: 'Sharing permission updated successfully.' });
};

// Revoke sharing
export const revokeShare = async (req, res) => {
  const { id } = req.params;
  const ownerId = req.user.id;

  const [result] = await db.query(
    'DELETE FROM shared_notes WHERE id = ? AND owner_id = ?',
    [id, ownerId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Shared note not found or not owned by you.' });
  }

  res.json({ message: 'Note sharing revoked successfully.' });
};

// Get notes shared by current user
export const getSharedByMe = async (req, res) => {
  const ownerId = req.user.id;

  const [rows] = await db.query(`
    SELECT
      sn.id,
      sn.note_id,
      sn.permission,
      sn.shared_at,
      n.title,
      u.display_name as shared_with_name,
      u.email as shared_with_email
    FROM shared_notes sn
    JOIN notes n ON sn.note_id = n.id
    JOIN users u ON sn.shared_with_user_id = u.id
    WHERE sn.owner_id = ?
    ORDER BY sn.shared_at DESC
  `, [ownerId]);

  res.json({ sharedByMe: rows });
};
