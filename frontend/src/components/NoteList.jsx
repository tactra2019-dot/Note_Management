import { CalendarDays, Edit3, Image, Lock, MoreHorizontal, Pin, Share2, Trash2 } from 'lucide-react';
import { assetUrl } from '../services/api.js';
import { getLabelToneClass } from '../utils/labelTone.js';

const formatDate = (value) => {
  if (!value) return 'Just now';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

function NoteList({
  notes,
  selectedNote,
  viewMode,
  onNoteSelect,
  onTogglePin,
  onDeleteNote,
  readOnly = false,
  emptyTitle = 'No notes found',
  emptyDescription = 'Create a new note or adjust your search and label filter.',
  emptyAction,
  emptyActionLabel = 'Create New Note',
}) {
  if (!notes.length) {
    return (
      <div className="empty-state">
        <div className="empty-illustration"><Edit3 size={27} /></div>
        <h3>{emptyTitle}</h3>
        <p>{emptyDescription}</p>
        {emptyAction && <button className="primary-action compact" type="button" onClick={emptyAction}>{emptyActionLabel}</button>}
      </div>
    );
  }

  return (
    <div className={`notes-board ${viewMode}`}>
      {notes.map((note, index) => {
        const images = note.images || [];
        const previewImage = images[0]?.image_url || note.image_url;
        const noteTone = index % 6;

        return (
          <article
            key={`${note.isShared ? 'shared' : 'own'}-${note.id}`}
            className={`note-card note-tone-${noteTone} ${selectedNote?.id === note.id ? 'selected' : ''} ${note.pinned ? 'pinned' : ''}`}
            onClick={() => onNoteSelect(note)}
            style={{ backgroundColor: note.note_color || undefined }}
          >
            <div className="note-card-top">
              <div>
                <h3>{note.title || 'Untitled note'}</h3>
                {note.isShared && (
                  <span className="note-owner-line">
                    {note.owner_name || note.owner_email || 'Shared note'} - {note.permission === 'edit' ? 'Can edit' : 'Read-only'}
                  </span>
                )}
              </div>
              <div className="icon-row">
                {note.pinned && <Pin size={16} className="pin-icon" />}
                {note.is_password_protected && <Lock size={16} className="lock-icon" />}
                {note.is_shared && <Share2 size={16} className="share-icon" />}
                {!!previewImage && <Image size={16} className="image-icon" />}
                <button
                  type="button"
                  className="card-more-button"
                  title="More options"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal size={17} />
                </button>
              </div>
            </div>

            {previewImage && !note.is_password_protected && (
              <img className="card-image-preview" src={assetUrl(previewImage)} alt="" />
            )}

            <p className="note-card-preview">
              {note.is_password_protected ? 'This note is password protected.' : (note.content || 'No content yet.').slice(0, 180)}
            </p>

            {!!note.labels?.length && (
              <div className="label-row">
                {note.labels.slice(0, 4).map((label) => (
                  <span
                    key={label.id}
                    className={`label-pill ${getLabelToneClass(label.name)}`}
                    style={{ '--label-chip-color': label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            <div className="note-card-footer">
              <span className="note-time"><CalendarDays size={14} /> {formatDate(note.updated_at || note.updatedAt || note.shared_at)}</span>
              <div className="quick-actions">
                <button
                  type="button"
                  className="icon-button"
                  title="Open note"
                  onClick={(event) => {
                    event.stopPropagation();
                    onNoteSelect(note);
                  }}
                >
                  <Edit3 size={16} />
                </button>
                {!note.isShared && (
                  <button
                    type="button"
                    className="icon-button"
                    title={note.pinned ? 'Unpin note' : 'Pin note'}
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePin(note.id);
                    }}
                  >
                    <Pin size={16} />
                  </button>
                )}
                {!readOnly && !note.isShared && (
                  <button
                    type="button"
                    className="icon-button danger"
                    title="Delete note"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteNote(note);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default NoteList;
