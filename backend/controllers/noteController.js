import fs from 'fs';
import { join, normalize } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db } from '../config/db.js';
import { parseLabels } from '../utils/parseLabels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadRoot = join(__dirname, '..', 'uploads');
const colorPattern = /^#[0-9a-fA-F]{6}$/;

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

const mapNote = (row) => ({
  id: row.id,
  user_id: row.user_id,
  title: row.title,
  content: row.is_password_protected ? '' : row.content || '',
  image_url: row.is_password_protected ? null : row.image_url,
  note_color: row.note_color,
  pinned: Boolean(row.pinned),
  pinned_at: row.pinned_at,
  is_password_protected: Boolean(row.is_password_protected),
  is_shared: Boolean(row.is_shared),
  permission: row.permission || 'owner',
  owner_name: row.owner_name,
  owner_email: row.owner_email,
  shared_at: row.shared_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
  labels: parseLabels(row.labels),
  images: row.is_password_protected ? [] : parseJsonArray(row.images),
});

const noteSelect = `
  SELECT
    n.id,
    n.user_id,
    n.title,
    n.content,
    n.image_url,
    n.note_color,
    n.pinned,
    n.pinned_at,
    n.created_at,
    n.updated_at,
    n.password_hash IS NOT NULL AS is_password_protected,
    EXISTS (SELECT 1 FROM shared_notes sn WHERE sn.note_id = n.id) AS is_shared,
    (
      SELECT JSON_ARRAYAGG(JSON_OBJECT('id', l.id, 'name', l.name, 'color', l.color))
      FROM note_labels nl
      JOIN labels l ON nl.label_id = l.id
      WHERE nl.note_id = n.id
    ) AS labels,
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
`;

const getEditableNoteAccess = async (noteId, userId) => {
  const [rows] = await db.query(
    `SELECT n.id, n.user_id,
            CASE
              WHEN n.user_id = ? THEN 'owner'
              WHEN sn.permission = 'edit' THEN 'edit'
              WHEN sn.permission = 'read' THEN 'read'
              ELSE NULL
            END AS permission
     FROM notes n
     LEFT JOIN shared_notes sn ON sn.note_id = n.id AND sn.shared_with_user_id = ?
     WHERE n.id = ?`,
    [userId, userId, noteId],
  );
  return rows[0];
};

const ensureCanEdit = async (noteId, userId) => {
  const access = await getEditableNoteAccess(noteId, userId);
  if (!access) return { error: { status: 404, message: 'Note not found.' } };
  if (!['owner', 'edit'].includes(access.permission)) {
    return { error: { status: 403, message: 'You do not have permission to edit this note.' } };
  }
  return { access };
};

const fetchNoteById = async (noteId, userId) => {
  const [rows] = await db.query(
    `${noteSelect},
      CASE
        WHEN n.user_id = ? THEN 'owner'
        ELSE sn.permission
      END AS permission,
      sn.shared_at,
      u.display_name AS owner_name,
      u.email AS owner_email
     FROM notes n
     JOIN users u ON n.user_id = u.id
     LEFT JOIN shared_notes sn ON sn.note_id = n.id AND sn.shared_with_user_id = ?
     WHERE n.id = ? AND (n.user_id = ? OR sn.shared_with_user_id = ?)`,
    [userId, userId, noteId, userId, userId],
  );
  return rows[0] ? mapNote(rows[0]) : null;
};

export const getNotes = async (req, res) => {
  const userId = req.user.id;
  const search = String(req.query.search || '').trim();
  const labelId = req.query.labelId;
  const params = [userId];

  let where = 'WHERE n.user_id = ?';
  if (search) {
    where += ' AND (LOWER(n.title) LIKE LOWER(?) OR LOWER(n.content) LIKE LOWER(?))';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (labelId) {
    where += ' AND EXISTS (SELECT 1 FROM note_labels nl WHERE nl.note_id = n.id AND nl.label_id = ?)';
    params.push(labelId);
  }

  const [rows] = await db.query(
    `${noteSelect}
     FROM notes n
     ${where}
     ORDER BY n.pinned DESC, n.pinned_at DESC, n.updated_at DESC`,
    params,
  );

  res.json({ notes: rows.map(mapNote) });
};

export const getNote = async (req, res) => {
  const note = await fetchNoteById(req.params.id, req.user.id);
  if (!note) {
    return res.status(404).json({ message: 'Note not found.' });
  }
  res.json({ note });
};

export const createNote = async (req, res) => {
  const { title, content, imageUrl, noteColor } = req.body;
  const userId = req.user.id;

  if (!title || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required.' });
  }
  if (noteColor && !colorPattern.test(noteColor)) {
    return res.status(400).json({ message: 'Note color must be a hex color.' });
  }

  const [result] = await db.query(
    'INSERT INTO notes (user_id, title, content, image_url, note_color) VALUES (?, ?, ?, ?, ?)',
    [userId, title.trim(), content || '', imageUrl || null, noteColor || null],
  );

  if (imageUrl) {
    await db.query(
      'INSERT INTO note_images (note_id, image_url, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)',
      [result.insertId, imageUrl, 'Linked image', null, null],
    );
  }

  const note = await fetchNoteById(result.insertId, userId);
  res.status(201).json({ note });
};

export const updateNote = async (req, res) => {
  const { id } = req.params;
  const { title, content, imageUrl, noteColor } = req.body;
  const userId = req.user.id;

  if (!title || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required.' });
  }
  if (noteColor && !colorPattern.test(noteColor)) {
    return res.status(400).json({ message: 'Note color must be a hex color.' });
  }

  const { error } = await ensureCanEdit(id, userId);
  if (error) {
    return res.status(error.status).json({ message: error.message });
  }

  await db.query(
    `UPDATE notes
     SET title = ?,
         content = ?,
         image_url = COALESCE(?, image_url),
         note_color = COALESCE(?, note_color),
         updated_at = NOW()
     WHERE id = ?`,
    [title.trim(), content || '', imageUrl || null, noteColor || null, id],
  );

  const note = await fetchNoteById(id, userId);
  res.json({ note });
};

export const deleteNote = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const [result] = await db.query('DELETE FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Note not found or you are not the owner.' });
  }

  res.json({ message: 'Note deleted successfully.' });
};

export const togglePin = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const [existingRows] = await db.query('SELECT pinned FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
  if (existingRows.length === 0) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  const newPinned = !Boolean(existingRows[0].pinned);
  await db.query(
    'UPDATE notes SET pinned = ?, pinned_at = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
    [newPinned, newPinned ? new Date() : null, id, userId],
  );

  res.json({ pinned: newPinned, pinned_at: newPinned ? new Date().toISOString() : null });
};

export const uploadImages = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { error } = await ensureCanEdit(id, userId);
  if (error) {
    return res.status(error.status).json({ message: error.message });
  }
  if (!req.files?.length) {
    return res.status(400).json({ message: 'Please upload at least one image.' });
  }

  const insertedImages = [];
  for (const file of req.files) {
    const imageUrl = `/uploads/note-images/${file.filename}`;
    const [result] = await db.query(
      'INSERT INTO note_images (note_id, image_url, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)',
      [id, imageUrl, file.originalname, file.mimetype, file.size],
    );
    insertedImages.push({
      id: result.insertId,
      image_url: imageUrl,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
    });
  }

  if (insertedImages[0]) {
    await db.query('UPDATE notes SET image_url = COALESCE(image_url, ?), updated_at = NOW() WHERE id = ?', [insertedImages[0].image_url, id]);
  }

  const note = await fetchNoteById(id, userId);
  res.status(201).json({ images: insertedImages, note });
};

export const deleteImage = async (req, res) => {
  const { id, imageId } = req.params;
  const userId = req.user.id;
  const { error } = await ensureCanEdit(id, userId);
  if (error) {
    return res.status(error.status).json({ message: error.message });
  }

  const [rows] = await db.query('SELECT image_url FROM note_images WHERE id = ? AND note_id = ?', [imageId, id]);
  if (!rows.length) {
    return res.status(404).json({ message: 'Image not found.' });
  }

  await db.query('DELETE FROM note_images WHERE id = ? AND note_id = ?', [imageId, id]);

  const imageUrl = rows[0].image_url;
  if (imageUrl?.startsWith('/uploads/note-images/')) {
    const relativePath = imageUrl.replace('/uploads/', '');
    const filePath = normalize(join(uploadRoot, relativePath));
    if (filePath.startsWith(uploadRoot) && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  const [firstImageRows] = await db.query('SELECT image_url FROM note_images WHERE note_id = ? ORDER BY id ASC LIMIT 1', [id]);
  await db.query('UPDATE notes SET image_url = ?, updated_at = NOW() WHERE id = ?', [firstImageRows[0]?.image_url || null, id]);

  const note = await fetchNoteById(id, userId);
  res.json({ message: 'Image deleted successfully.', note });
};
