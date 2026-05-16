import { useEffect, useMemo, useState } from 'react';
import { Mail, Share2, Trash2, X } from 'lucide-react';
import { apiRequest } from '../services/api.js';

function ShareNote({ note, onClose }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('read');
  const [shares, setShares] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const noteShares = useMemo(() => shares.filter((share) => Number(share.id) === Number(note.id)), [shares, note.id]);

  const loadShares = async () => {
    try {
      const data = await apiRequest('/api/shared/shared-by-me', 'GET');
      setShares(data.sharedByMe || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadShares();
  }, [note.id]);

  const parseEmails = (value) => (
    value
      .split(/[,;\n]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );

  const handleShare = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const recipientEmails = parseEmails(email);
    if (!recipientEmails.length) {
      setError('Enter at least one recipient email.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest(`/api/shared/notes/${note.id}/share`, 'POST', { emails: recipientEmails, permission });
      setMessage(data.message || 'Note shared successfully.');
      setEmail('');
      await loadShares();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (share, nextPermission) => {
    setError('');
    try {
      await apiRequest(`/api/shared/notes/${note.id}/shares/${share.shared_with_user_id}`, 'PATCH', { permission: nextPermission });
      await loadShares();
    } catch (err) {
      setError(err.message);
    }
  };

  const revoke = async (share) => {
    setError('');
    try {
      await apiRequest(`/api/shared/notes/${note.id}/shares/${share.shared_with_user_id}`, 'DELETE');
      await loadShares();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2><Share2 size={20} /> Share note</h2>
            <p>{note.title || 'Untitled note'}</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button"><X size={18} /></button>
        </header>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        <form className="share-note-form" onSubmit={handleShare}>
          <label className="field">
            <span>Recipient email(s)</span>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com, teammate@example.com"
                required
              />
            </div>
          </label>
          <label className="field">
            <span>Permission</span>
            <select value={permission} onChange={(e) => setPermission(e.target.value)}>
              <option value="read">Read-only</option>
              <option value="edit">Can edit</option>
            </select>
          </label>
          <button className="primary-action" disabled={loading}>{loading ? 'Sharing...' : 'Share'}</button>
        </form>

        <div className="shared-list">
          <h3>People with access</h3>
          {!noteShares.length && <p className="muted">This note has not been shared yet.</p>}
          {noteShares.map((share) => (
            <div className="shared-person" key={`${share.id}-${share.shared_with_user_id}`}>
              <div>
                <strong>{share.shared_with_name}</strong>
                <span>{share.shared_with_email}</span>
              </div>
              <select value={share.permission} onChange={(e) => updatePermission(share, e.target.value)}>
                <option value="read">Read-only</option>
                <option value="edit">Can edit</option>
              </select>
              <button className="icon-button danger" type="button" title="Revoke access" onClick={() => revoke(share)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ShareNote;
