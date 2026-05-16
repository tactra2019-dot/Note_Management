import { apiRequest } from './api.js';

const notesKey = (userId) => `noteapp_offline_notes_${userId}`;
const queueKey = (userId) => `noteapp_offline_queue_${userId}`;
const idMapKey = (userId) => `noteapp_offline_id_map_${userId}`;

const loadJSON = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const saveJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const loadLocalNotes = (userId) => loadJSON(notesKey(userId), []);
export const saveLocalNotes = (userId, notes) => saveJSON(notesKey(userId), notes);
export const loadOfflineQueue = (userId) => loadJSON(queueKey(userId), []);
export const saveOfflineQueue = (userId, queue) => saveJSON(queueKey(userId), queue);
export const loadLocalIdMap = (userId) => loadJSON(idMapKey(userId), {});
export const saveLocalIdMap = (userId, map) => saveJSON(idMapKey(userId), map);

export const queueOfflineAction = (userId, action) => {
  const queue = loadOfflineQueue(userId);
  queue.push(action);
  saveOfflineQueue(userId, queue);
};

export const createLocalNote = (userId, noteData) => {
  const note = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: noteData.title || '',
    content: noteData.content || '',
    imageUrl: noteData.imageUrl || '',
    pinned: false,
    is_password_protected: false,
    is_shared: false,
    labels: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  };

  const notes = loadLocalNotes(userId);
  saveLocalNotes(userId, [note, ...notes]);
  queueOfflineAction(userId, {
    type: 'create',
    localId: note.id,
    payload: noteData,
    timestamp: Date.now(),
  });

  return note;
};

export const updateLocalNote = (userId, note) => {
  const notes = loadLocalNotes(userId).map((item) =>
    item.id === note.id ? { ...item, ...note, updatedAt: new Date().toISOString() } : item
  );
  saveLocalNotes(userId, notes);
  return notes;
};

export const deleteLocalNote = (userId, noteId) => {
  const notes = loadLocalNotes(userId).filter((note) => note.id !== noteId);
  saveLocalNotes(userId, notes);
  return notes;
};

export const mergeNotes = (serverNotes, localNotes) => {
  const localById = Object.fromEntries(localNotes.map((note) => [note.id, note]));
  const merged = serverNotes.map((note) => {
    if (localById[note.id]) {
      return { ...note, ...localById[note.id], syncStatus: localById[note.id].syncStatus || 'pending' };
    }
    return { ...note, syncStatus: 'synced' };
  });

  const pendingLocal = localNotes.filter((note) => String(note.id).startsWith('local-'));
  return [...pendingLocal, ...merged].sort((a, b) => new Date(b.updatedAt || b.updated_at) - new Date(a.updatedAt || a.updated_at));
};

const getResolvedNoteId = (userId, noteId) => {
  const idMap = loadLocalIdMap(userId);
  return String(noteId).startsWith('local-') ? idMap[noteId] || noteId : noteId;
};

export const processOfflineQueue = async (userId, token, callbacks = {}) => {
  if (!navigator.onLine || !token || !userId) return;
  const queue = loadOfflineQueue(userId);
  if (!queue.length) return;

  const idMap = loadLocalIdMap(userId);
  let notes = loadLocalNotes(userId);
  const remainingQueue = [];

  for (const action of queue) {
    try {
      if (action.type === 'create') {
        const data = await apiRequest('/api/notes', 'POST', action.payload, token);
        const serverNote = { ...data.note, syncStatus: 'synced' };
        notes = notes.map((note) => (note.id === action.localId ? serverNote : note));
        idMap[action.localId] = serverNote.id;
        if (callbacks.onReplaceLocalId) callbacks.onReplaceLocalId(action.localId, serverNote.id, serverNote);
      } else if (action.type === 'update') {
        const resolvedId = getResolvedNoteId(userId, action.noteId);
        if (resolvedId.startsWith('local-')) {
          remainingQueue.push(action);
          continue;
        }
        const data = await apiRequest(`/api/notes/${resolvedId}`, 'PUT', action.payload, token);
        notes = notes.map((note) =>
          (note.id === resolvedId || note.id === action.noteId)
            ? { ...data.note, syncStatus: 'synced' }
            : note
        );
      } else if (action.type === 'delete') {
        const resolvedId = getResolvedNoteId(userId, action.noteId);
        if (resolvedId.startsWith('local-')) {
          notes = notes.filter((note) => note.id !== action.noteId);
          continue;
        }
        await apiRequest(`/api/notes/${resolvedId}`, 'DELETE', null, token);
        notes = notes.filter((note) => note.id !== action.noteId && note.id !== resolvedId);
      }
    } catch (error) {
      console.warn('Offline sync action failed:', action.type, error);
      remainingQueue.push(action);
    }
  }

  saveLocalNotes(userId, notes);
  saveLocalIdMap(userId, idMap);
  saveOfflineQueue(userId, remainingQueue);

  if (callbacks.onNotesUpdated) callbacks.onNotesUpdated(notes);
  return remainingQueue.length === 0;
};
