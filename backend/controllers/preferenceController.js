import { db } from '../config/db.js';

const allowedThemes = new Set(['light', 'dark']);
const allowedFontSizes = new Set(['small', 'medium', 'large', 'xlarge']);
const colorPattern = /^#[0-9a-fA-F]{6}$/;

const defaultPreferences = {
  theme: 'light',
  fontSize: 'medium',
  noteColor: '#ffffff',
};

const mapPreferences = (row) => ({
  theme: row?.theme || defaultPreferences.theme,
  fontSize: row?.font_size || defaultPreferences.fontSize,
  noteColor: row?.note_color || defaultPreferences.noteColor,
});

export const getPreferences = async (req, res) => {
  const [rows] = await db.query(
    'SELECT theme, font_size, note_color FROM user_preferences WHERE user_id = ?',
    [req.user.id],
  );

  if (!rows.length) {
    await db.query('INSERT IGNORE INTO user_preferences (user_id) VALUES (?)', [req.user.id]);
  }

  res.json({ preferences: mapPreferences(rows[0]) });
};

export const updatePreferences = async (req, res) => {
  const next = {
    theme: req.body.theme || defaultPreferences.theme,
    fontSize: req.body.fontSize || defaultPreferences.fontSize,
    noteColor: req.body.noteColor || defaultPreferences.noteColor,
  };

  if (!allowedThemes.has(next.theme)) {
    return res.status(400).json({ message: 'Theme must be light or dark.' });
  }
  if (!allowedFontSizes.has(next.fontSize)) {
    return res.status(400).json({ message: 'Font size is invalid.' });
  }
  if (!colorPattern.test(next.noteColor)) {
    return res.status(400).json({ message: 'Note color must be a hex color.' });
  }

  await db.query(
    `INSERT INTO user_preferences (user_id, theme, font_size, note_color)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       theme = VALUES(theme),
       font_size = VALUES(font_size),
       note_color = VALUES(note_color),
       updated_at = NOW()`,
    [req.user.id, next.theme, next.fontSize, next.noteColor],
  );

  res.json({ preferences: next });
};
