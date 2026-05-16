import { db } from '../config/db.js';
import nodemailer from 'nodemailer';
import { parseLabels } from '../utils/parseLabels.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter((image) => image?.id != null);
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter((image) => image?.id != null) : [];
  } catch {
    return [];
  }
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const normalizeRecipientEmails = (email, emails) => {
  const source = Array.isArray(emails) ? emails : String(email || '').split(/[,;\n]+/);
  return [...new Set(source.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
};

// Share a note with another user
export const shareNote = async (req, res) => {
  const { id } = req.params;
  const { email, emails, permission } = req.body;
  const ownerId = req.user.id;
  const recipientEmails = normalizeRecipientEmails(email, emails);

  if (!recipientEmails.length || !permission) {
    return res.status(400).json({ message: 'At least one recipient email and permission are required.' });
  }

  if (!['read', 'edit'].includes(permission)) {
    return res.status(400).json({ message: 'Permission must be either "read" or "edit".' });
  }

  const invalidEmail = recipientEmails.find((item) => !emailPattern.test(item));
  if (invalidEmail) {
    return res.status(400).json({ message: `Invalid recipient email: ${invalidEmail}` });
  }

  // Check if note exists and belongs to user
  const [noteRows] = await db.query(
    `SELECT n.id, n.title, u.display_name AS owner_name
     FROM notes n
     JOIN users u ON u.id = n.user_id
     WHERE n.id = ? AND n.user_id = ?`,
    [id, ownerId],
  );
  if (noteRows.length === 0) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  // Check if target users exist. Unverified users are still allowed to use the app.
  const [userRows] = await db.query(
    'SELECT id, email, display_name FROM users WHERE email IN (?)',
    [recipientEmails],
  );
  if (userRows.length === 0) {
    return res.status(404).json({ message: 'Recipient user not found.' });
  }

  const usersByEmail = new Map(userRows.map((user) => [user.email.toLowerCase(), user]));
  const missingEmails = recipientEmails.filter((recipientEmail) => !usersByEmail.has(recipientEmail));
  if (missingEmails.length) {
    return res.status(404).json({ message: `Recipient not found: ${missingEmails.join(', ')}` });
  }

  if (userRows.some((user) => Number(user.id) === Number(ownerId))) {
    return res.status(400).json({ message: 'Cannot share note with yourself.' });
  }

  for (const recipient of userRows) {
    await db.query(
      `INSERT INTO shared_notes (note_id, owner_id, shared_with_user_id, permission)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         permission = VALUES(permission),
         shared_at = NOW()`,
      [id, ownerId, recipient.id, permission],
    );
  }

  // Send email notification
  try {
    await Promise.all(userRows.map((recipient) => (
      transporter.sendMail({
        from: process.env.SMTP_USER,
        to: recipient.email,
        subject: `Note shared: ${noteRows[0].title}`,
        html: `
          <h2>Note Shared With You</h2>
          <p><strong>${noteRows[0].owner_name}</strong> has shared a note with you.</p>
          <p><strong>Note:</strong> ${noteRows[0].title}</p>
          <p><strong>Permission:</strong> ${permission === 'read' ? 'Read-only' : 'Can edit'}</p>
          <p>Login to your account to view the shared note.</p>
        `,
      })
    )));
  } catch (emailError) {
    console.warn('Share notification email was not sent:', emailError.message);
    // Don't fail the request if email fails
  }

  res.json({
    message: userRows.length === 1 ? 'Note shared successfully.' : `Note shared with ${userRows.length} users successfully.`,
  });
};

// Get notes shared with the current user
export const getSharedNotes = async (req, res) => {
  const userId = req.user.id;

  const [rows] = await db.query(
    `SELECT
      sn.id as share_id,
      sn.permission,
      sn.shared_at,
      n.id,
      n.title,
      IF(n.password_hash IS NOT NULL, '', n.content) as content,
      IF(n.password_hash IS NOT NULL, NULL, n.image_url) as image_url,
      n.pinned,
      n.created_at,
      n.updated_at,
      n.password_hash IS NOT NULL as is_password_protected,
      u.display_name as owner_name,
      u.email as owner_email,
      JSON_ARRAYAGG(
        JSON_OBJECT('id', l.id, 'name', l.name, 'color', l.color)
      ) as labels,
      (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ni.id, 'image_url', ni.image_url, 'original_name', ni.original_name))
        FROM note_images ni
        WHERE ni.note_id = n.id
      ) as images
    FROM shared_notes sn
    JOIN notes n ON sn.note_id = n.id
    JOIN users u ON sn.owner_id = u.id
    LEFT JOIN note_labels nl ON n.id = nl.note_id
    LEFT JOIN labels l ON nl.label_id = l.id
    WHERE sn.shared_with_user_id = ?
    GROUP BY sn.id, n.id, u.id
    ORDER BY sn.shared_at DESC`,
    [userId]
  );

  // Clean up labels
  const sharedNotes = rows.map(note => ({
    ...note,
    labels: parseLabels(note.labels),
    images: parseImages(note.images)
  }));

  res.json({ sharedNotes });
};

// Get notes shared by the current user
export const getSharedByMe = async (req, res) => {
  const userId = req.user.id;

  const [rows] = await db.query(
    `SELECT
      sn.id as share_id,
      sn.permission,
      sn.shared_at,
      n.id,
      n.title,
      n.content,
      n.image_url,
      n.pinned,
      n.created_at,
      n.updated_at,
      n.password_hash IS NOT NULL as is_password_protected,
      u.id as shared_with_user_id,
      u.display_name as shared_with_name,
      u.email as shared_with_email,
      JSON_ARRAYAGG(
        JSON_OBJECT('id', l.id, 'name', l.name, 'color', l.color)
      ) as labels,
      (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ni.id, 'image_url', ni.image_url, 'original_name', ni.original_name))
        FROM note_images ni
        WHERE ni.note_id = n.id
      ) as images
    FROM shared_notes sn
    JOIN notes n ON sn.note_id = n.id
    JOIN users u ON sn.shared_with_user_id = u.id
    LEFT JOIN note_labels nl ON n.id = nl.note_id
    LEFT JOIN labels l ON nl.label_id = l.id
    WHERE sn.owner_id = ?
    GROUP BY sn.id, n.id, u.id
    ORDER BY sn.shared_at DESC`,
    [userId]
  );

  // Clean up labels
  const sharedByMe = rows.map(note => ({
    ...note,
    labels: parseLabels(note.labels),
    images: parseImages(note.images)
  }));

  res.json({ sharedByMe });
};

// Update share permissions
export const updateSharePermission = async (req, res) => {
  const { noteId, userId: sharedWithUserId } = req.params;
  const { permission } = req.body;
  const ownerId = req.user.id;

  if (!['read', 'edit'].includes(permission)) {
    return res.status(400).json({ message: 'Permission must be either "read" or "edit".' });
  }

  const [result] = await db.query(
    'UPDATE shared_notes SET permission = ? WHERE note_id = ? AND owner_id = ? AND shared_with_user_id = ?',
    [permission, noteId, ownerId, sharedWithUserId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Share not found.' });
  }

  res.json({ message: 'Permission updated successfully.' });
};

// Revoke share access
export const revokeShare = async (req, res) => {
  const { noteId, userId: sharedWithUserId } = req.params;
  const ownerId = req.user.id;

  const [result] = await db.query(
    'DELETE FROM shared_notes WHERE note_id = ? AND owner_id = ? AND shared_with_user_id = ?',
    [noteId, ownerId, sharedWithUserId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Share not found.' });
  }

  res.json({ message: 'Share revoked successfully.' });
};

// Get a shared note (for shared users)
export const getSharedNote = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const [rows] = await db.query(
    `SELECT
      n.id,
      n.title,
      IF(n.password_hash IS NOT NULL, '', n.content) as content,
      IF(n.password_hash IS NOT NULL, NULL, n.image_url) as image_url,
      n.pinned,
      n.created_at,
      n.updated_at,
      n.password_hash IS NOT NULL as is_password_protected,
      sn.permission,
      u.display_name as owner_name,
      JSON_ARRAYAGG(
        JSON_OBJECT('id', l.id, 'name', l.name, 'color', l.color)
      ) as labels,
      (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ni.id, 'image_url', ni.image_url, 'original_name', ni.original_name))
        FROM note_images ni
        WHERE ni.note_id = n.id
      ) as images
    FROM shared_notes sn
    JOIN notes n ON sn.note_id = n.id
    JOIN users u ON sn.owner_id = u.id
    LEFT JOIN note_labels nl ON n.id = nl.note_id
    LEFT JOIN labels l ON nl.label_id = l.id
    WHERE sn.note_id = ? AND sn.shared_with_user_id = ?
    GROUP BY sn.id, n.id, u.id`,
    [id, userId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Shared note not found.' });
  }

  const note = {
    ...rows[0],
    labels: parseLabels(rows[0].labels),
    images: parseImages(rows[0].images)
  };

  res.json({ note });
};

// Update a shared note (if user has edit permission)
export const updateSharedNote = async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const userId = req.user.id;

  if (!title || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required.' });
  }

  // Check if user has edit permission
  const [shareRows] = await db.query(
    'SELECT permission FROM shared_notes WHERE note_id = ? AND shared_with_user_id = ?',
    [id, userId]
  );

  if (shareRows.length === 0 || shareRows[0].permission !== 'edit') {
    return res.status(403).json({ message: 'You do not have permission to edit this note.' });
  }

  await db.query(
    'UPDATE notes SET title = ?, content = ?, updated_at = NOW() WHERE id = ?',
    [title.trim(), content || '', id]
  );

  const [rows] = await db.query(
    `SELECT
      n.id,
      n.title,
      n.content,
      n.image_url,
      n.pinned,
      n.created_at,
      n.updated_at,
      n.password_hash IS NOT NULL as is_password_protected,
      JSON_ARRAYAGG(
        JSON_OBJECT('id', l.id, 'name', l.name, 'color', l.color)
      ) as labels,
      (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ni.id, 'image_url', ni.image_url, 'original_name', ni.original_name))
        FROM note_images ni
        WHERE ni.note_id = n.id
      ) as images
    FROM notes n
    LEFT JOIN note_labels nl ON n.id = nl.note_id
    LEFT JOIN labels l ON nl.label_id = l.id
    WHERE n.id = ?
    GROUP BY n.id`,
    [id]
  );

  const note = {
    ...rows[0],
    labels: parseLabels(rows[0].labels),
    images: parseImages(rows[0].images),
    permission: 'edit'
  };

  res.json({ note });
};
