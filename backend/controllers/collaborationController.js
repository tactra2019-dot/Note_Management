import { db } from '../config/db.js';
import crypto from 'crypto';

// Join collaboration session
export const joinCollaboration = async (req, res) => {
  const { noteId } = req.params;
  const userId = req.user.id;

  // Check if user has access to this note (owner or shared with edit permission)
  const [accessRows] = await db.query(`
    SELECT n.id
    FROM notes n
    LEFT JOIN shared_notes sn ON n.id = sn.note_id AND sn.shared_with_user_id = ?
    WHERE n.id = ? AND (n.user_id = ? OR (sn.permission = 'edit' AND sn.shared_with_user_id = ?))
  `, [userId, noteId, userId, userId]);

  if (accessRows.length === 0) {
    return res.status(403).json({ message: 'Access denied. You do not have edit permission for this note.' });
  }

  // Generate session token
  const sessionToken = crypto.randomBytes(32).toString('hex');

  // Create or update collaboration session
  await db.query(`
    INSERT INTO collaboration_sessions (note_id, user_id, session_token)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
    session_token = VALUES(session_token),
    last_activity = CURRENT_TIMESTAMP
  `, [noteId, userId, sessionToken]);

  res.json({
    sessionToken,
    message: 'Joined collaboration session successfully.'
  });
};

// Leave collaboration session
export const leaveCollaboration = async (req, res) => {
  const { noteId } = req.params;
  const userId = req.user.id;

  await db.query(
    'DELETE FROM collaboration_sessions WHERE note_id = ? AND user_id = ?',
    [noteId, userId]
  );

  res.json({ message: 'Left collaboration session successfully.' });
};

// Get active collaborators for a note
export const getCollaborators = async (req, res) => {
  const { noteId } = req.params;
  const userId = req.user.id;

  // Check if user has access to this note
  const [accessRows] = await db.query(`
    SELECT n.id
    FROM notes n
    LEFT JOIN shared_notes sn ON n.id = sn.note_id AND sn.shared_with_user_id = ?
    WHERE n.id = ? AND (n.user_id = ? OR sn.shared_with_user_id = ?)
  `, [userId, noteId, userId, userId]);

  if (accessRows.length === 0) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  const [rows] = await db.query(`
    SELECT
      cs.user_id,
      cs.joined_at,
      cs.last_activity,
      u.display_name,
      u.email
    FROM collaboration_sessions cs
    JOIN users u ON cs.user_id = u.id
    WHERE cs.note_id = ?
    ORDER BY cs.last_activity DESC
  `, [noteId]);

  res.json({ collaborators: rows });
};

// Validate session token
export const validateSession = async (req, res) => {
  const { sessionToken } = req.body;

  const [rows] = await db.query(`
    SELECT
      cs.note_id,
      cs.user_id,
      u.display_name,
      u.email
    FROM collaboration_sessions cs
    JOIN users u ON cs.user_id = u.id
    WHERE cs.session_token = ? AND cs.last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
  `, [sessionToken]);

  if (rows.length === 0) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }

  // Update last activity
  await db.query(
    'UPDATE collaboration_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_token = ?',
    [sessionToken]
  );

  res.json({
    valid: true,
    noteId: rows[0].note_id,
    user: {
      id: rows[0].user_id,
      displayName: rows[0].display_name,
      email: rows[0].email
    }
  });
};
