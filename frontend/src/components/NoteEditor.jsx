import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Lock, Palette, Pin, Share2, Tag, Trash2, Upload, X } from 'lucide-react';
import { apiRequest, assetUrl, uploadRequest } from '../services/api.js';
import LabelManager from './LabelManager.jsx';
import PasswordProtection from './PasswordProtection.jsx';
import ShareNote from './ShareNote.jsx';
import RealTimeCollaboration from './RealTimeCollaboration.jsx';
import { getLabelToneClass } from '../utils/labelTone.js';

function NoteEditor({
  note,
  labels,
  user,
  readOnly,
  onClose,
  onSave,
  onDelete,
  onTogglePin,
  onLabelsChange,
  onNoteMutated,
  onToast,
}) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');
  const [noteColor, setNoteColor] = useState(note.note_color || note.noteColor || '');
  const [noteLabels, setNoteLabels] = useState(note.labels || []);
  const [images, setImages] = useState(note.images || []);
  const [status, setStatus] = useState('');
  const [showLabels, setShowLabels] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [editableNote, setEditableNote] = useState(note);
  const saveTimer = useRef(null);
  const activeSave = useRef(0);
  const skipNextSave = useRef(true);
  const remoteSnapshot = useRef(null);

  useEffect(() => {
    setTitle(note.title || '');
    setContent(note.content || '');
    setNoteColor(note.note_color || note.noteColor || '');
    setNoteLabels(note.labels || []);
    setImages(note.images || []);
    setEditableNote(note);
    setStatus('');
    skipNextSave.current = true;
  }, [note.id, note.isShared]);

  useEffect(() => {
    if (readOnly) return undefined;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return undefined;
    }

    if (
      remoteSnapshot.current
      && remoteSnapshot.current.title === title
      && remoteSnapshot.current.content === content
    ) {
      remoteSnapshot.current = null;
      return undefined;
    }

    const hasText = title.trim() || content.trim();
    if (!hasText) return undefined;

    saveTimer.current = setTimeout(async () => {
      const saveId = Date.now();
      activeSave.current = saveId;
      setStatus('Saving...');
      try {
        const saved = await onSave({
          ...editableNote,
          title: title.trim() || 'Untitled note',
          content,
          noteColor: noteColor || null,
        });

        if (activeSave.current !== saveId) return;
        setEditableNote(saved);
        setNoteLabels(saved.labels || noteLabels);
        setImages(saved.images || images);
        setStatus('Saved');
        window.noteCollaboration?.sendUpdate?.({ title: saved.title, content: saved.content });
        setTimeout(() => setStatus((current) => (current === 'Saved' ? '' : current)), 1200);
      } catch (error) {
        setStatus('Error saving');
        onToast?.(error.message, 'error');
      }
    }, 600);

    return () => clearTimeout(saveTimer.current);
  }, [title, content, noteColor, readOnly]);

  const ensureSavedNote = () => {
    if (!editableNote.id) {
      onToast?.('Add a title or content first so the note can be saved.', 'error');
      return false;
    }
    return true;
  };

  const handleUploadImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || !ensureSavedNote()) return;

    const invalid = files.find((file) => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024);
    if (invalid) {
      onToast?.('Images must be image files and 5MB or smaller.', 'error');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    setStatus('Saving...');
    try {
      const data = await uploadRequest(`/api/notes/${editableNote.id}/images`, formData);
      setEditableNote(data.note);
      setImages(data.note.images || []);
      onNoteMutated(data.note);
      setStatus('Saved');
    } catch (error) {
      setStatus('Error saving');
      onToast?.(error.message, 'error');
    }
  };

  const deleteImage = async (image) => {
    try {
      const data = await apiRequest(`/api/notes/${editableNote.id}/images/${image.id}`, 'DELETE');
      setEditableNote(data.note);
      setImages(data.note.images || []);
      onNoteMutated(data.note);
    } catch (error) {
      onToast?.(error.message, 'error');
    }
  };

  const toggleLabel = async (label) => {
    if (!ensureSavedNote()) return;
    const exists = noteLabels.some((item) => Number(item.id) === Number(label.id));
    try {
      if (exists) {
        await apiRequest(`/api/labels/notes/${editableNote.id}/${label.id}`, 'DELETE');
        const nextLabels = noteLabels.filter((item) => Number(item.id) !== Number(label.id));
        setNoteLabels(nextLabels);
        onNoteMutated({ ...editableNote, labels: nextLabels });
      } else {
        await apiRequest(`/api/labels/notes/${editableNote.id}`, 'POST', { labelId: label.id });
        const nextLabels = [...noteLabels, label];
        setNoteLabels(nextLabels);
        onNoteMutated({ ...editableNote, labels: nextLabels });
      }
    } catch (error) {
      onToast?.(error.message, 'error');
    }
  };

  const handleRemoteUpdate = (data) => {
    const nextTitle = data.title !== undefined ? data.title : title;
    const nextContent = data.content !== undefined ? data.content : content;

    remoteSnapshot.current = { title: nextTitle, content: nextContent };
    if (data.title !== undefined) setTitle(data.title);
    if (data.content !== undefined) setContent(data.content);
    setStatus('Updated live');
    setTimeout(() => setStatus((current) => (current === 'Updated live' ? '' : current)), 1200);
  };

  const canShare = !editableNote.isShared && editableNote.id;
  const canManagePassword = !editableNote.isShared && editableNote.id;
  const canCollaborate = editableNote.id && !readOnly && (editableNote.isShared ? editableNote.permission === 'edit' : true);

  return (
    <aside className="editor-panel">
      <header className="editor-topbar">
        <div>
          <span className={`save-status ${status.includes('Error') ? 'error' : ''}`}>{readOnly ? 'Read-only' : status || 'Saved'}</span>
          {editableNote.isShared && <span className="owner-line">Shared by {editableNote.owner_name || editableNote.owner_email}</span>}
        </div>
        <div className="editor-actions">
          {!editableNote.isShared && editableNote.id && (
            <button className={`icon-button ${editableNote.pinned ? 'active' : ''}`} title="Pin note" onClick={() => onTogglePin(editableNote.id)}>
              <Pin size={18} />
            </button>
          )}
          {canShare && <button className="icon-button" title="Share note" onClick={() => setShowShare(true)}><Share2 size={18} /></button>}
          {canManagePassword && <button className="icon-button" title="Note password" onClick={() => setShowPassword(true)}><Lock size={18} /></button>}
          {!readOnly && !editableNote.isShared && editableNote.id && (
            <button className="icon-button danger" title="Delete note" onClick={() => onDelete(editableNote)}>
              <Trash2 size={18} />
            </button>
          )}
          <button className="icon-button" title="Close editor" onClick={onClose}><X size={18} /></button>
        </div>
      </header>

      <div className="editor-body">
        <input
          className="editor-title"
          placeholder="Untitled note"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={readOnly}
        />

        <div className="editor-meta-tools">
          <button className="secondary-action compact" onClick={() => setShowLabels(true)} disabled={!editableNote.id}>
            <Tag size={16} /> Labels
          </button>
          <label className={`secondary-action compact ${!editableNote.id || readOnly ? 'disabled' : ''}`}>
            <ImagePlus size={16} /> Images
            <input type="file" accept="image/*" multiple onChange={handleUploadImages} disabled={!editableNote.id || readOnly} hidden />
          </label>
          {!editableNote.isShared && (
            <label className="color-field" title="Note color">
              <Palette size={16} />
              <input type="color" value={noteColor || '#ffffff'} onChange={(event) => setNoteColor(event.target.value)} disabled={readOnly} />
            </label>
          )}
        </div>

        {!!noteLabels.length && (
          <section className="editor-section">
            <div className="editor-section-title"><Tag size={15} /> Labels</div>
            <div className="label-row">
              {noteLabels.map((label) => (
                <button
                  key={label.id}
                  className={`label-pill removable ${getLabelToneClass(label.name)}`}
                  style={{ '--label-chip-color': label.color }}
                  onClick={() => !readOnly && toggleLabel(label)}
                  disabled={readOnly}
                >
                  {label.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {!!images.length && (
          <section className="editor-section">
            <div className="editor-section-title"><ImagePlus size={15} /> Attachments</div>
            <div className="image-grid">
              {images.map((image) => (
                <figure key={image.id} className="image-tile">
                  <img src={assetUrl(image.image_url)} alt={image.original_name || 'Note attachment'} />
                  {!readOnly && (
                    <button className="icon-button danger" type="button" onClick={() => deleteImage(image)}>
                      <X size={15} />
                    </button>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {!editableNote.id && (
          <div className="helper-strip">
            <Upload size={16} /> Images, labels, password, and sharing become available after the first auto-save.
          </div>
        )}

        <textarea
          className="editor-content-input"
          placeholder="Start writing your thoughts..."
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={readOnly}
        />

        <RealTimeCollaboration
          noteId={editableNote.id}
          user={user}
          enabled={Boolean(canCollaborate)}
          onRemoteUpdate={handleRemoteUpdate}
        />
      </div>

      <LabelManager
        isOpen={showLabels}
        onClose={() => setShowLabels(false)}
        labels={labels}
        selectedLabels={noteLabels}
        onLabelsChange={onLabelsChange}
        onToggleLabel={toggleLabel}
      />

      {showPassword && (
        <PasswordProtection
          note={editableNote}
          onClose={() => setShowPassword(false)}
          onPasswordChange={(isProtected) => {
            const next = { ...editableNote, is_password_protected: isProtected };
            setEditableNote(next);
            onNoteMutated(next);
          }}
        />
      )}

      {showShare && <ShareNote note={editableNote} onClose={() => setShowShare(false)} />}
    </aside>
  );
}

export default NoteEditor;
