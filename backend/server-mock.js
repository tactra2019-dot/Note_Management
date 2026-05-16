import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import "express-async-errors";



// Mock data 
let mockUsers= [];
let mockNotes= [];
let mockLabels= [];
let mockNoteLabels= [];
let mockSharedNotes= []; // Phase 5: Shared notes
let mockCollaborationSessions= []; // Phase 5: Real-time collaboration
let nextUserId= 1;
let nextNoteId= 1;
let nextLabelId= 1;
let nextNoteLabelId= 1;
let nextSharedNoteId= 1;
let nextSessionId= 1;









dotenv.config();

const app= express();
const PORT= process.env.PORT || 5000;

app.use(cors({ origin: /localhost:(5173|5174|5175|5176|5177|5178|5179|5180|5181|5182)/,credentials: true }));
app.use(express.json());

app.get('/',(req,res)=> {
  res.json({ message: 'Note management API is running (MOCK MODE)' });
});





// Mock auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, displayName, password, confirmPassword } = req.body;

  if (!email || !displayName || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  const existingUser = mockUsers.find(u => u.email === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ message: 'Email is already registered.' });
  }

  const user= {
    id: nextUserId++,
    email:email.toLowerCase(),
    display_name: displayName,
    password,
    is_active: true,
  };
  mockUsers.push(user);

  const token= 'mock-jwt-token-' + user.id;
  res.status(201).json({ token, user: { id: user.id, email: user.email, displayName: user.display_name, isActive: user.is_active } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user= mockUsers.find(u => u.email === email.toLowerCase());

  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token= 'mock-jwt-token-' + user.id;
  res.json({ token, user: { id: user.id, email: user.email, displayName: user.display_name, isActive: user.is_active } });
});

app.post('/api/auth/change-password', (req, res) => {
  const authHeader= req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token= authHeader.split(' ')[1];
  const userId= parseInt(token.replace('mock-jwt-token-', ''));
  const user= mockUsers.find(u => u.id=== userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const { currentPassword,newPassword,confirmPassword }= req.body;
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New passwords do not match.' });
  }
  if (user.password !== currentPassword) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  res.json({ message: 'Password updated successfully.' });
});

app.put('/api/auth/update-profile', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const user = mockUsers.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const { displayName } = req.body;
  if (!displayName || displayName.trim() === '') {
    return res.status(400).json({ message: 'Display name is required.' });
  }

  user.display_name = displayName.trim();
  res.json({ 
    user: { id: user.id, email: user.email, displayName: user.display_name, isActive: user.is_active },
    message: 'Profile updated successfully.' 
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token= authHeader.split(' ')[1];
  const userId= parseInt(token.replace('mock-jwt-token-', ''));
  const user = mockUsers.find(u => u.id === userId);

  if (!user) return res.status(404).json({ message: 'User not found.' });

  res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, isActive: user.is_active } });
});








// Mock note endpoints
app.get('/api/notes', (req, res) => {
  const authHeader= req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token=authHeader.split(' ')[1];
  const userId= parseInt(token.replace('mock-jwt-token-', ''));

  const userNotes= mockNotes.filter(note => note.user_id === userId)
    .map(note => {
      const noteLabels = mockNoteLabels
        .filter(nl => nl.note_id=== note.id)
        .map(nl => {
          const label = mockLabels.find(l => l.id=== nl.label_id && l.user_id === userId);
          return label ? { id: label.id, name: label.name, color: label.color } : null;
        })
        .filter(label => label !== null);

      // Check if note is shared (either shared by or shared with user)
      const isShared= mockSharedNotes.some(share =>
        share.note_id=== note.id && (share.owner_id === userId || share.shared_with_user_id === userId)
      );

      return {
        ...note,
        labels: noteLabels,
        is_shared: isShared
      };
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned - a.pinned;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });

  res.json({ notes: userNotes });
});

app.post('/api/notes', (req, res) => {
  const authHeader= req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token= authHeader.split(' ')[1];
  const userId= parseInt(token.replace('mock-jwt-token-', ''));
  const { title, content, imageUrl } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required.' });
  }

  const note= {
    id: nextNoteId++,
    user_id: userId,
    title: title.trim(),
    content: content || '',
    imageUrl: imageUrl || '',
    pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockNotes.push(note);
  res.status(201).json({ note: { ...note, labels: [] } });
});

app.put('/api/notes/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;
  const { title, content, imageUrl } = req.body;

  const noteIndex = mockNotes.findIndex(note => note.id === parseInt(id) && note.user_id === userId);
  if (noteIndex=== -1) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  mockNotes[noteIndex] = {
    ...mockNotes[noteIndex],
    title: title.trim(),
    content: content || '',
    imageUrl: imageUrl || mockNotes[noteIndex].imageUrl || '',
    updated_at: new Date().toISOString(),
  };

  // Include labels in the response
  const noteLabels = mockNoteLabels
    .filter(nl => nl.note_id === mockNotes[noteIndex].id)
    .map(nl => {
      const label = mockLabels.find(l => l.id === nl.label_id && l.user_id === userId);
      return label ? { id: label.id, name: label.name, color: label.color } : null;
    })
    .filter(label => label !== null);

  res.json({ note: { ...mockNotes[noteIndex], labels: noteLabels } });
});

app.delete('/api/notes/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;

  const noteIndex = mockNotes.findIndex(note => note.id === parseInt(id) && note.user_id === userId);
  if (noteIndex === -1) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  mockNotes.splice(noteIndex, 1);
  res.json({ message: 'Note deleted successfully.' });
});

app.patch('/api/notes/:id/pin', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;

  const noteIndex = mockNotes.findIndex(note => note.id === parseInt(id) && note.user_id === userId);
  if (noteIndex === -1) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  mockNotes[noteIndex].pinned = !mockNotes[noteIndex].pinned;
  mockNotes[noteIndex].updated_at = new Date().toISOString();

  res.json({ pinned: mockNotes[noteIndex].pinned });
});

// Label endpoints
app.get('/api/labels', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));

  const userLabels = mockLabels.filter(label => label.user_id === userId);
  res.json({ labels: userLabels });
});

app.post('/api/labels', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { name, color } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Label name is required.' });
  }

  const existingLabel = mockLabels.find(label => label.user_id === userId && label.name.toLowerCase() === name.toLowerCase());
  if (existingLabel) {
    return res.status(409).json({ message: 'Label name already exists.' });
  }

  const label = {
    id: nextLabelId++,
    user_id: userId,
    name: name.trim(),
    color: color || '#007bff',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockLabels.push(label);
  res.status(201).json({ label });
});

app.put('/api/labels/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;
  const { name, color } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Label name is required.' });
  }

  const labelIndex = mockLabels.findIndex(label => label.id === parseInt(id) && label.user_id === userId);
  if (labelIndex === -1) {
    return res.status(404).json({ message: 'Label not found.' });
  }

  const existingLabel = mockLabels.find(label =>
    label.user_id === userId &&
    label.name.toLowerCase() === name.toLowerCase() &&
    label.id !== parseInt(id)
  );
  if (existingLabel) {
    return res.status(409).json({ message: 'Label name already exists.' });
  }

  mockLabels[labelIndex] = {
    ...mockLabels[labelIndex],
    name: name.trim(),
    color: color || mockLabels[labelIndex].color,
    updated_at: new Date().toISOString(),
  };

  res.json({ label: mockLabels[labelIndex] });
});

app.delete('/api/labels/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;

  const labelIndex = mockLabels.findIndex(label => label.id === parseInt(id) && label.user_id === userId);
  if (labelIndex === -1) {
    return res.status(404).json({ message: 'Label not found.' });
  }

  // Remove all note-label associations for this label
  mockNoteLabels = mockNoteLabels.filter(nl => nl.label_id !== parseInt(id));

  // Remove the label
  mockLabels.splice(labelIndex, 1);

  res.json({ message: 'Label deleted successfully.' });
});

// Note-Label association endpoints
app.get('/api/notes/:id/labels', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;

  // Verify note belongs to user
  const note = mockNotes.find(note => note.id === parseInt(id) && note.user_id === userId);
  if (!note) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  const noteLabelIds = mockNoteLabels
    .filter(nl => nl.note_id === parseInt(id))
    .map(nl => nl.label_id);

  const labels = mockLabels.filter(label => noteLabelIds.includes(label.id));
  res.json({ labels });
});

app.post('/api/labels/notes/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;
  const { labelId } = req.body;

  // Verify note belongs to user
  const note = mockNotes.find(note => note.id === parseInt(id) && note.user_id === userId);
  if (!note) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  // Verify label belongs to user
  const label = mockLabels.find(label => label.id === parseInt(labelId) && label.user_id === userId);
  if (!label) {
    return res.status(404).json({ message: 'Label not found.' });
  }

  // Check if association already exists
  const existing = mockNoteLabels.find(nl => nl.note_id === parseInt(id) && nl.label_id === parseInt(labelId));
  if (existing) {
    return res.status(409).json({ message: 'Note already has this label.' });
  }

  const noteLabel = {
    id: nextNoteLabelId++,
    note_id: parseInt(id),
    label_id: parseInt(labelId),
    created_at: new Date().toISOString(),
  };

  mockNoteLabels.push(noteLabel);
  res.status(201).json({ noteLabel });
});

app.delete('/api/labels/notes/:noteId/:labelId', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { noteId, labelId } = req.params;

  // Verify note belongs to user
  const note = mockNotes.find(note => note.id === parseInt(noteId) && note.user_id === userId);
  if (!note) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  const associationIndex = mockNoteLabels.findIndex(nl =>
    nl.note_id === parseInt(noteId) && nl.label_id === parseInt(labelId)
  );

  if (associationIndex === -1) {
    return res.status(404).json({ message: 'Label association not found.' });
  }

  mockNoteLabels.splice(associationIndex, 1);
  res.json({ message: 'Label removed from note successfully.' });
});

// Enhanced search endpoint
app.get('/api/notes/search', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { q, labelId } = req.query;

  let userNotes = mockNotes.filter(note => note.user_id === userId);

  // Filter by search query
  if (q && q.trim()) {
    const query = q.toLowerCase().trim();
    userNotes = userNotes.filter(note =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    );
  }

  // Filter by label
  if (labelId) {
    const noteIdsWithLabel = mockNoteLabels
      .filter(nl => nl.label_id === parseInt(labelId))
      .map(nl => nl.note_id);
    userNotes = userNotes.filter(note => noteIdsWithLabel.includes(note.id));
  }

  // Sort by pinned then by updated date
  userNotes.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  // Add labels to each note
  const notesWithLabels = userNotes.map(note => {
    const noteLabelIds = mockNoteLabels
      .filter(nl => nl.note_id === note.id)
      .map(nl => nl.label_id);
    const labels = mockLabels.filter(label => noteLabelIds.includes(label.id));

    return { ...note, labels };
  });

  res.json({ notes: notesWithLabels });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error.';
  res.status(status).json({ message });
});

// Phase 5: Password protection endpoints
app.post('/api/notes/:id/password', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.trim().length < 4) {
    return res.status(400).json({ message: 'Password must be at least 4 characters long.' });
  }

  const noteIndex = mockNotes.findIndex(note => note.id === parseInt(id) && note.user_id === userId);
  if (noteIndex === -1) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  mockNotes[noteIndex].password_hash = 'mock-hash-' + password; // Mock password hash
  res.json({ message: 'Password set successfully.' });
});

app.put('/api/notes/:id/password', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ message: 'New password must be at least 4 characters long.' });
  }

  const noteIndex = mockNotes.findIndex(note => note.id === parseInt(id) && note.user_id === userId);
  if (noteIndex === -1) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  if (!mockNotes[noteIndex].password_hash) {
    return res.status(400).json({ message: 'Note is not password protected.' });
  }

  if (mockNotes[noteIndex].password_hash !== 'mock-hash-' + oldPassword) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }

  mockNotes[noteIndex].password_hash = 'mock-hash-' + newPassword;
  res.json({ message: 'Password changed successfully.' });
});

app.delete('/api/notes/:id/password', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;
  const { password } = req.body;

  const noteIndex = mockNotes.findIndex(note => note.id === parseInt(id) && note.user_id === userId);
  if (noteIndex === -1) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  if (!mockNotes[noteIndex].password_hash) {
    return res.status(400).json({ message: 'Note is not password protected.' });
  }

  if (mockNotes[noteIndex].password_hash !== 'mock-hash-' + password) {
    return res.status(401).json({ message: 'Password is incorrect.' });
  }

  mockNotes[noteIndex].password_hash = null;
  res.json({ message: 'Password removed successfully.' });
});

app.post('/api/notes/:id/verify-password', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;
  const { password } = req.body;

  const noteIndex = mockNotes.findIndex(note => note.id === parseInt(id) && note.user_id === userId);
  if (noteIndex === -1) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  if (!mockNotes[noteIndex].password_hash) {
    return res.json({ verified: true });
  }

  const verified = mockNotes[noteIndex].password_hash === 'mock-hash-' + password;
  res.json({ verified });
});

// Phase 5: Sharing endpoints
app.post('/api/shared/notes/:id/share', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const ownerId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;
  const { email, permission } = req.body;

  if (!email || !permission) {
    return res.status(400).json({ message: 'Email and permission are required.' });
  }

  if (!['read', 'edit'].includes(permission)) {
    return res.status(400).json({ message: 'Permission must be either "read" or "edit".' });
  }

  // Verify note exists and belongs to user
  const note = mockNotes.find(note => note.id === parseInt(id) && note.user_id === ownerId);
  if (!note) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  // Find target user
  const targetUser = mockUsers.find(u => u.email === email.toLowerCase() && u.is_active);
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found or not activated.' });
  }

  if (targetUser.id === ownerId) {
    return res.status(400).json({ message: 'Cannot share note with yourself.' });
  }

  // Check if already shared
  const existingShare = mockSharedNotes.find(sn =>
    sn.note_id === parseInt(id) && sn.shared_with_user_id === targetUser.id
  );

  if (existingShare) {
    existingShare.permission = permission;
    existingShare.shared_at = new Date().toISOString();
  } else {
    const share = {
      id: nextSharedNoteId++,
      note_id: parseInt(id),
      owner_id: ownerId,
      shared_with_user_id: targetUser.id,
      permission,
      shared_at: new Date().toISOString(),
    };
    mockSharedNotes.push(share);
  }

  res.json({ message: 'Note shared successfully.' });
});

app.get('/api/shared/shared-with-me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));

  const sharedNotes = mockSharedNotes
    .filter(sn => sn.shared_with_user_id === userId)
    .map(sn => {
      const note = mockNotes.find(n => n.id === sn.note_id);
      const owner = mockUsers.find(u => u.id === sn.owner_id);
      const labels = mockNoteLabels
        .filter(nl => nl.note_id === sn.note_id)
        .map(nl => mockLabels.find(l => l.id === nl.label_id))
        .filter(l => l);

      return {
        share_id: sn.id,
        permission: sn.permission,
        shared_at: sn.shared_at,
        ...note,
        owner_name: owner.display_name,
        owner_email: owner.email,
        labels,
      };
    });

  res.json({ sharedNotes });
});

// Phase 5: Collaboration endpoints
app.post('/api/collaboration/:noteId/join', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { noteId } = req.params;

  // Check if user has access to this note
  const note = mockNotes.find(n => n.id === parseInt(noteId));
  if (!note) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  const isOwner = note.user_id === userId;
  const isShared = mockSharedNotes.find(sn => sn.note_id === parseInt(noteId) && sn.shared_with_user_id === userId && sn.permission === 'edit');

  if (!isOwner && !isShared) {
    return res.status(403).json({ message: 'Access denied. You do not have edit permission for this note.' });
  }

  // Create session token
  const sessionToken = `mock-session-${Date.now()}-${userId}`;

  // Add or update session
  const existingSessionIndex = mockCollaborationSessions.findIndex(s => s.note_id === parseInt(noteId) && s.user_id === userId);
  if (existingSessionIndex >= 0) {
    mockCollaborationSessions[existingSessionIndex].last_activity = new Date().toISOString();
    mockCollaborationSessions[existingSessionIndex].session_token = sessionToken;
  } else {
    mockCollaborationSessions.push({
      id: nextSessionId++,
      note_id: parseInt(noteId),
      user_id: userId,
      session_token: sessionToken,
      joined_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    });
  }

  res.json({ sessionToken, message: 'Joined collaboration session successfully.' });
});

app.delete('/api/collaboration/:noteId/leave', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { noteId } = req.params;

  const sessionIndex = mockCollaborationSessions.findIndex(s => s.note_id === parseInt(noteId) && s.user_id === userId);
  if (sessionIndex >= 0) {
    mockCollaborationSessions.splice(sessionIndex, 1);
  }

  res.json({ message: 'Left collaboration session successfully.' });
});

app.get('/api/collaboration/:noteId/collaborators', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { noteId } = req.params;

  // Check if user has access to this note
  const note = mockNotes.find(n => n.id === parseInt(noteId));
  if (!note) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  const isOwner = note.user_id === userId;
  const isShared = mockSharedNotes.find(sn => sn.note_id === parseInt(noteId) && sn.shared_with_user_id === userId);

  if (!isOwner && !isShared) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  const collaborators = mockCollaborationSessions
    .filter(s => s.note_id === parseInt(noteId))
    .map(s => {
      const user = mockUsers.find(u => u.id === s.user_id);
      return {
        user_id: s.user_id,
        joined_at: s.joined_at,
        last_activity: s.last_activity,
        display_name: user.display_name,
        email: user.email,
      };
    });

  res.json({ collaborators });
});

app.post('/api/collaboration/validate-session', (req, res) => {
  const { sessionToken } = req.body;

  const session = mockCollaborationSessions.find(s => s.session_token === sessionToken);
  if (!session) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  // Check if session is recent (within 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (new Date(session.last_activity) < fiveMinutesAgo) {
    return res.status(401).json({ message: 'Session expired.' });
  }

  // Update last activity
  session.last_activity = new Date().toISOString();

  const user = mockUsers.find(u => u.id === session.user_id);
  res.json({
    valid: true,
    noteId: session.note_id,
    user: {
      id: session.user_id,
      displayName: user.display_name,
      email: user.email,
    },
  });
});

app.get('/api/shared/shared-by-me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));

  const sharedByMe = mockSharedNotes
    .filter(sn => sn.owner_id === userId)
    .map(sn => {
      const note = mockNotes.find(n => n.id === sn.note_id);
      const sharedWith = mockUsers.find(u => u.id === sn.shared_with_user_id);
      const labels = mockNoteLabels
        .filter(nl => nl.note_id === sn.note_id)
        .map(nl => mockLabels.find(l => l.id === nl.label_id))
        .filter(l => l);

      return {
        share_id: sn.id,
        permission: sn.permission,
        shared_at: sn.shared_at,
        ...note,
        shared_with_name: sharedWith.display_name,
        shared_with_email: sharedWith.email,
        labels,
      };
    });

  res.json({ sharedByMe });
});

app.patch('/api/shared/notes/:noteId/shares/:userId', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const ownerId = parseInt(token.replace('mock-jwt-token-', ''));
  const { noteId, userId: sharedWithUserId } = req.params;
  const { permission } = req.body;

  if (!['read', 'edit'].includes(permission)) {
    return res.status(400).json({ message: 'Permission must be either "read" or "edit".' });
  }

  const shareIndex = mockSharedNotes.findIndex(sn =>
    sn.note_id === parseInt(noteId) &&
    sn.owner_id === ownerId &&
    sn.shared_with_user_id === parseInt(sharedWithUserId)
  );

  if (shareIndex === -1) {
    return res.status(404).json({ message: 'Share not found.' });
  }

  mockSharedNotes[shareIndex].permission = permission;
  res.json({ message: 'Permission updated successfully.' });
});

app.delete('/api/shared/notes/:noteId/shares/:userId', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const ownerId = parseInt(token.replace('mock-jwt-token-', ''));
  const { noteId, userId: sharedWithUserId } = req.params;

  const shareIndex = mockSharedNotes.findIndex(sn =>
    sn.note_id === parseInt(noteId) &&
    sn.owner_id === ownerId &&
    sn.shared_with_user_id === parseInt(sharedWithUserId)
  );

  if (shareIndex === -1) {
    return res.status(404).json({ message: 'Share not found.' });
  }

  mockSharedNotes.splice(shareIndex, 1);
  res.json({ message: 'Share revoked successfully.' });
});

app.get('/api/shared/shared-notes/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;

  const share = mockSharedNotes.find(sn =>
    sn.note_id === parseInt(id) && sn.shared_with_user_id === userId
  );

  if (!share) {
    return res.status(404).json({ message: 'Shared note not found.' });
  }

  const note = mockNotes.find(n => n.id === share.note_id);
  const owner = mockUsers.find(u => u.id === share.owner_id);
  const labels = mockNoteLabels
    .filter(nl => nl.note_id === share.note_id)
    .map(nl => mockLabels.find(l => l.id === nl.label_id))
    .filter(l => l);

  res.json({
    note: {
      ...note,
      permission: share.permission,
      owner_name: owner.display_name,
      labels,
    }
  });
});

app.put('/api/shared/shared-notes/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  const { id } = req.params;
  const { title, content } = req.body;

  const share = mockSharedNotes.find(sn =>
    sn.note_id === parseInt(id) && sn.shared_with_user_id === userId
  );

  if (!share || share.permission !== 'edit') {
    return res.status(403).json({ message: 'You do not have permission to edit this note.' });
  }

  const noteIndex = mockNotes.findIndex(note => note.id === parseInt(id));
  mockNotes[noteIndex] = {
    ...mockNotes[noteIndex],
    title: title.trim(),
    content: content || '',
    updated_at: new Date().toISOString(),
  };

  const labels = mockNoteLabels
    .filter(nl => nl.note_id === parseInt(id))
    .map(nl => mockLabels.find(l => l.id === nl.label_id))
    .filter(l => l);

  res.json({ note: { ...mockNotes[noteIndex], labels } });
});

app.listen(PORT, () => {
  console.log(`Mock backend server running on http://localhost:${PORT}`);
  console.log('⚠️  RUNNING IN MOCK MODE - No database required for testing');
});