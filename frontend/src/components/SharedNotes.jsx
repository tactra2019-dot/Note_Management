import { useEffect, useState } from 'react';
import { Edit3, Eye, Radio, Share2, Trash2, UsersRound, X } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import NoteList from './NoteList.jsx';

function SharedNotes({ onOpenSharedNote, onOpenOwnedNote }) {
  const [activeTab, setActiveTab] = useState('with-me');
  const [sharedWithMe, setSharedWithMe] = useState([]);
  const [sharedByMe, setSharedByMe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [withMe, byMe] = await Promise.all([
        apiRequest('/api/shared/shared-with-me', 'GET'),
        apiRequest('/api/shared/shared-by-me', 'GET'),
      ]);
      setSharedWithMe((withMe.sharedNotes || []).map((note) => ({ ...note, isShared: true, is_shared: true })));
      setSharedByMe(byMe.sharedByMe || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const revoke = async () => {
    if (!confirmRevoke) return;
    try {
      await apiRequest(`/api/shared/notes/${confirmRevoke.id}/shares/${confirmRevoke.shared_with_user_id}`, 'DELETE');
      setConfirmRevoke(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const updatePermission = async (share, permission) => {
    try {
      await apiRequest(`/api/shared/notes/${share.id}/shares/${share.shared_with_user_id}`, 'PATCH', { permission });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading-state">Loading shared notes...</div>;

  return (
    <section className="shared-page">
      <div className="page-hero shared-hero">
        <div className="hero-copy">
          <span className="eyebrow"><UsersRound size={14} /> Collaboration</span>
          <h2>Shared Notes</h2>
          <p>Collaborate with others and manage notes shared across your workspace.</p>
        </div>
        <div className="hero-stat-grid compact-stats">
          <div className="mini-stat-card">
            <Share2 size={17} />
            <strong>{sharedWithMe.length}</strong>
            <span>Received</span>
          </div>
          <div className="mini-stat-card">
            <UsersRound size={17} />
            <strong>{sharedByMe.length}</strong>
            <span>Shared out</span>
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="tabs">
        <button className={activeTab === 'with-me' ? 'active' : ''} onClick={() => setActiveTab('with-me')}>
          <Share2 size={16} /> Shared with me <span className="tab-badge">{sharedWithMe.length}</span>
        </button>
        <button className={activeTab === 'by-me' ? 'active' : ''} onClick={() => setActiveTab('by-me')}>
          <Share2 size={16} /> Shared by me <span className="tab-badge">{sharedByMe.length}</span>
        </button>
      </div>

      {activeTab === 'with-me' ? (
        sharedWithMe.length ? (
          <NoteList
            notes={sharedWithMe}
            selectedNote={null}
            viewMode="grid"
            onNoteSelect={onOpenSharedNote}
            onTogglePin={() => {}}
            onDeleteNote={() => {}}
            readOnly
            emptyTitle="No shared notes yet"
            emptyDescription="Notes shared with you will appear here."
          />
        ) : (
          <div className="empty-state shared-empty">
            <div className="empty-illustration"><Share2 size={27} /></div>
            <h3>No shared notes yet</h3>
            <p>Notes shared with you will appear here.</p>
          </div>
        )
      ) : (
        <div className="share-management-list">
          {!sharedByMe.length && (
            <div className="empty-state shared-empty">
              <div className="empty-illustration"><UsersRound size={27} /></div>
              <h3>You have not shared any notes yet</h3>
              <p>Open one of your notes and use Share to give another registered user access.</p>
            </div>
          )}
          {sharedByMe.map((share) => (
            <article className="share-management-card" key={`${share.share_id}-${share.shared_with_user_id}`}>
              <button className="link-title" onClick={() => onOpenOwnedNote?.(share.id)}>{share.title}</button>
              <div className="share-meta">
                <span>Shared with {share.shared_with_name} ({share.shared_with_email})</span>
                <span>{new Date(share.shared_at).toLocaleString()}</span>
              </div>
              <div className="share-actions">
                <span className={`permission-badge ${share.permission}`}>
                  {share.permission === 'edit' ? <Edit3 size={14} /> : <Eye size={14} />}
                  {share.permission === 'edit' ? 'Can edit' : 'Read-only'}
                </span>
                {share.permission === 'edit' && (
                  <span className="live-chip online compact-live"><Radio size={13} /> Realtime ready</span>
                )}
                <select value={share.permission} onChange={(e) => updatePermission(share, e.target.value)}>
                  <option value="read">Read-only</option>
                  <option value="edit">Can edit</option>
                </select>
                <button className="icon-button danger" onClick={() => setConfirmRevoke(share)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {confirmRevoke && (
        <div className="modal-backdrop" onClick={() => setConfirmRevoke(null)}>
          <section className="modal-panel compact-modal warning-modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h2>Revoke access?</h2>
                <p>{confirmRevoke.shared_with_email} will no longer see this note.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setConfirmRevoke(null)}><X size={18} /></button>
            </header>
            <div className="modal-actions">
              <button className="secondary-action" type="button" onClick={() => setConfirmRevoke(null)}>Cancel</button>
              <button className="danger-action" type="button" onClick={revoke}>Revoke</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default SharedNotes;
