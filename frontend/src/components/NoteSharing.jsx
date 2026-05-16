import { useState, useEffect } from 'react';
import { apiRequest } from '../services/api.js';

function NoteSharing({ noteId, isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('read');
  const [sharedNotes, setSharedNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSharedNotes();
    }
  }, [isOpen]);

  const fetchSharedNotes = async () => {
    try {
      const data = await apiRequest('/api/sharing/shared-by-me', 'GET', null, localStorage.getItem('token'));
      const noteShares = data.sharedByMe.filter(share => share.note_id === noteId);
      setSharedNotes(noteShares);
    } catch (err) {
      console.error('Failed to fetch shared notes:', err);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      await apiRequest(`/api/sharing/${noteId}/share`, 'POST', {
        email: email.trim(),
        permission
      }, localStorage.getItem('token'));

      setEmail('');
      setPermission('read');
      fetchSharedNotes();
    } catch (err) {
      setError(err.message || 'Failed to share note');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (shareId, newPermission) => {
    try {
      await apiRequest(`/api/sharing/shared/${shareId}/permission`, 'PUT', {
        permission: newPermission
      }, localStorage.getItem('token'));
      fetchSharedNotes();
    } catch (err) {
      setError('Failed to update permission');
    }
  };

  const handleRevokeShare = async (shareId) => {
    if (!confirm('Are you sure you want to revoke access to this note?')) return;

    try {
      await apiRequest(`/api/sharing/shared/${shareId}`, 'DELETE', null, localStorage.getItem('token'));
      fetchSharedNotes();
    } catch (err) {
      setError('Failed to revoke share');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content sharing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share Note</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="share-form-section">
            <h4>Share with someone</h4>
            <form onSubmit={handleShare} className="share-form">
              <div className="form-group">
                <label>Email address:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Permission:</label>
                <select value={permission} onChange={(e) => setPermission(e.target.value)}>
                  <option value="read">Read only</option>
                  <option value="edit">Can edit</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="share-button">
                {loading ? 'Sharing...' : 'Share Note'}
              </button>
            </form>
          </div>

          <div className="shared-with-section">
            <h4>Shared with</h4>
            {sharedNotes.length === 0 ? (
              <p className="no-shares">Not shared with anyone yet.</p>
            ) : (
              <div className="shared-list">
                {sharedNotes.map(share => (
                  <div key={share.id} className="shared-item">
                    <div className="shared-info">
                      <span className="shared-email">{share.shared_with_email}</span>
                      <span className="shared-date">
                        Shared {new Date(share.shared_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="shared-actions">
                      <select
                        value={share.permission}
                        onChange={(e) => handleUpdatePermission(share.id, e.target.value)}
                        className="permission-select"
                      >
                        <option value="read">Read only</option>
                        <option value="edit">Can edit</option>
                      </select>
                      <button
                        onClick={() => handleRevokeShare(share.id)}
                        className="revoke-button"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoteSharing;