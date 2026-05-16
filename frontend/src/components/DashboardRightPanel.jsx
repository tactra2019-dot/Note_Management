import { CalendarDays, Clock3, FileText, FolderOpen, Pin, Plus, Share2, Tag, Zap } from 'lucide-react';
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

function DashboardRightPanel({
  notes = [],
  labels = [],
  onCreateNote,
  onBrowseLabels,
  onViewShared,
  onOpenNote,
  onViewAllNotes,
}) {
  const pinnedNotes = notes.filter((note) => note.pinned).slice(0, 4);
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updated_at || b.updatedAt || b.created_at || 0) - new Date(a.updated_at || a.updatedAt || a.created_at || 0))
    .slice(0, 3);

  const labelOverview = labels.map((label) => ({
    ...label,
    count: notes.filter((note) => note.labels?.some((item) => Number(item.id) === Number(label.id))).length,
  })).slice(0, 6);

  return (
    <aside className="right-panel">
      <section className="side-widget quick-widget">
        <header className="widget-header">
          <div>
            <Zap size={18} />
            <h3>Quick Actions</h3>
          </div>
        </header>
        <div className="quick-action-list">
          <button type="button" onClick={onCreateNote}>
            <span className="quick-icon blue"><Plus size={17} /></span>
            Create New Note
          </button>
          <button type="button" onClick={onBrowseLabels}>
            <span className="quick-icon green"><Tag size={17} /></span>
            Browse Labels
          </button>
          <button type="button" onClick={onViewShared}>
            <span className="quick-icon purple"><Share2 size={17} /></span>
            View Shared Notes
          </button>
        </div>
      </section>

      <section className="side-widget">
        <header className="widget-header">
          <div>
            <Pin size={18} />
            <h3>Pinned Notes</h3>
          </div>
        </header>
        {pinnedNotes.length ? (
          <div className="compact-note-list">
            {pinnedNotes.map((note) => (
              <button key={note.id} type="button" onClick={() => onOpenNote(note)}>
                <span className="compact-note-icon"><Pin size={15} /></span>
                <span>
                  <strong>{note.title || 'Untitled note'}</strong>
                  <small>{formatDate(note.updated_at || note.updatedAt || note.created_at)}</small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="widget-empty">
            <span><Pin size={24} /></span>
            <p>No pinned notes yet</p>
            <small>Pin important notes to access them quickly.</small>
          </div>
        )}
      </section>

      <section className="side-widget">
        <header className="widget-header">
          <div>
            <Clock3 size={18} />
            <h3>Recent Activity</h3>
          </div>
          <button type="button" onClick={onViewAllNotes}>View all</button>
        </header>
        {recentNotes.length ? (
          <div className="compact-note-list">
            {recentNotes.map((note) => (
              <button key={note.id} type="button" onClick={() => onOpenNote(note)}>
                <span className="compact-note-icon blue"><FileText size={15} /></span>
                <span>
                  <strong>{note.title || 'Untitled note'}</strong>
                  <small>You created this note</small>
                  <small><CalendarDays size={12} /> {formatDate(note.updated_at || note.updatedAt || note.created_at)}</small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="widget-empty">
            <span><Clock3 size={24} /></span>
            <p>No recent activity</p>
            <small>Your latest notes will appear here.</small>
          </div>
        )}
      </section>

      <section className="side-widget">
        <header className="widget-header">
          <div>
            <FolderOpen size={18} />
            <h3>Label Overview</h3>
          </div>
          <button type="button" onClick={onBrowseLabels}>View all</button>
        </header>
        {labelOverview.length ? (
          <div className="label-overview-list">
            {labelOverview.map((label) => (
              <button key={label.id} type="button" onClick={onBrowseLabels}>
                <span
                  className={`overview-chip ${getLabelToneClass(label.name)}`}
                  style={{ '--label-chip-color': label.color }}
                >
                  {label.name}
                </span>
                <strong>{label.count}</strong>
              </button>
            ))}
            <div className="label-total-row">
              <span>Total labels</span>
              <strong>{labels.length}</strong>
            </div>
          </div>
        ) : (
          <div className="widget-empty">
            <span><Tag size={24} /></span>
            <p>No labels yet</p>
            <small>Create labels to group your notes.</small>
          </div>
        )}
      </section>
    </aside>
  );
}

export default DashboardRightPanel;
