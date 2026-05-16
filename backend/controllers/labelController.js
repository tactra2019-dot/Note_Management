import { db } from '../config/db.js';

export const getLabels = async (req, res) => {
  const userId = req.user.id;
  const [rows] = await db.query('SELECT id, name, color, created_at, updated_at FROM labels WHERE user_id = ? ORDER BY name', [userId]);
  res.json({ labels: rows });
};

export const createLabel = async (req, res) => {
  const { name, color } = req.body;
  const userId = req.user.id;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Label name is required.' });
  }

  const [existingRows] = await db.query('SELECT id FROM labels WHERE user_id = ? AND LOWER(name) = LOWER(?)', [userId, name.trim()]);
  if (existingRows.length > 0) {
    return res.status(409).json({ message: 'Label name already exists.' });
  }

  const [result] = await db.query(
    'INSERT INTO labels (user_id, name, color) VALUES (?, ?, ?)',
    [userId, name.trim(), color || '#007bff'],
  );

  const [rows] = await db.query(
    'SELECT id, name, color, created_at, updated_at FROM labels WHERE id = ?',
    [result.insertId],
  );

  res.status(201).json({ label: rows[0] });
};

export const updateLabel = async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  const userId = req.user.id;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Label name is required.' });
  }

  const [existingRows] = await db.query('SELECT id FROM labels WHERE id = ? AND user_id = ?', [id, userId]);
  if (existingRows.length === 0) {
    return res.status(404).json({ message: 'Label not found.' });
  }

  const [duplicateRows] = await db.query(
    'SELECT id FROM labels WHERE user_id = ? AND LOWER(name) = LOWER(?) AND id != ?',
    [userId, name.trim(), id],
  );
  if (duplicateRows.length > 0) {
    return res.status(409).json({ message: 'Label name already exists.' });
  }

  await db.query(
    'UPDATE labels SET name = ?, color = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
    [name.trim(), color || '#007bff', id, userId],
  );

  const [rows] = await db.query(
    'SELECT id, name, color, created_at, updated_at FROM labels WHERE id = ?',
    [id],
  );

  res.json({ label: rows[0] });
};

export const deleteLabel = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const [existingRows] = await db.query('SELECT id FROM labels WHERE id = ? AND user_id = ?', [id, userId]);
  if (existingRows.length === 0) {
    return res.status(404).json({ message: 'Label not found.' });
  }

  // Delete note-label associations first (cascade will handle this, but being explicit)
  await db.query('DELETE FROM note_labels WHERE label_id = ?', [id]);

  // Delete the label
  await db.query('DELETE FROM labels WHERE id = ? AND user_id = ?', [id, userId]);

  res.json({ message: 'Label deleted successfully.' });
};

export const getNoteLabels = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify note belongs to user
  const [noteRows] = await db.query('SELECT id FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
  if (noteRows.length === 0) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  const [rows] = await db.query(
    'SELECT l.id, l.name, l.color FROM labels l INNER JOIN note_labels nl ON l.id = nl.label_id WHERE nl.note_id = ?',
    [id],
  );

  res.json({ labels: rows });
};

export const addLabelToNote = async (req, res) => {
  const { id } = req.params;
  const { labelId } = req.body;
  const userId = req.user.id;

  // Verify note belongs to user
  const [noteRows] = await db.query('SELECT id FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
  if (noteRows.length === 0) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  // Verify label belongs to user
  const [labelRows] = await db.query('SELECT id FROM labels WHERE id = ? AND user_id = ?', [labelId, userId]);
  if (labelRows.length === 0) {
    return res.status(404).json({ message: 'Label not found.' });
  }

  // Check if association already exists
  const [existingRows] = await db.query(
    'SELECT id FROM note_labels WHERE note_id = ? AND label_id = ?',
    [id, labelId],
  );
  if (existingRows.length > 0) {
    return res.status(409).json({ message: 'Note already has this label.' });
  }

  const [result] = await db.query(
    'INSERT INTO note_labels (note_id, label_id) VALUES (?, ?)',
    [id, labelId],
  );

  res.status(201).json({ message: 'Label added to note successfully.' });
};

export const removeLabelFromNote = async (req, res) => {
  const { noteId, labelId } = req.params;
  const userId = req.user.id;

  // Verify note belongs to user
  const [noteRows] = await db.query('SELECT id FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
  if (noteRows.length === 0) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  // Verify label belongs to user
  const [labelRows] = await db.query('SELECT id FROM labels WHERE id = ? AND user_id = ?', [labelId, userId]);
  if (labelRows.length === 0) {
    return res.status(404).json({ message: 'Label not found.' });
  }

  const [result] = await db.query(
    'DELETE FROM note_labels WHERE note_id = ? AND label_id = ?',
    [noteId, labelId],
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Label association not found.' });
  }

  res.json({ message: 'Label removed from note successfully.' });
};

export const searchNotes = async (req, res) => {
  const userId = req.user.id;
  const { q, labelId } = req.query;

  let query = `
    SELECT n.id, n.title, n.content, n.pinned, n.created_at, n.updated_at
    FROM notes n
    WHERE n.user_id = ?
  `;
  let params = [userId];

  // Add search filter
  if (q && q.trim()) {
    query += ' AND (LOWER(n.title) LIKE LOWER(?) OR LOWER(n.content) LIKE LOWER(?))';
    const searchTerm = `%${q.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  // Add label filter
  if (labelId) {
    query += ' AND EXISTS (SELECT 1 FROM note_labels nl WHERE nl.note_id = n.id AND nl.label_id = ?)';
    params.push(labelId);
  }

  // Add sorting
  query += ' ORDER BY n.pinned DESC, n.updated_at DESC';

  const [rows] = await db.query(query, params);

  // Get labels for each note
  const notesWithLabels = await Promise.all(
    rows.map(async (note) => {
      const [labelRows] = await db.query(
        'SELECT l.id, l.name, l.color FROM labels l INNER JOIN note_labels nl ON l.id = nl.label_id WHERE nl.note_id = ?',
        [note.id],
      );
      return { ...note, labels: labelRows };
    }),
  );

  res.json({ notes: notesWithLabels });
};