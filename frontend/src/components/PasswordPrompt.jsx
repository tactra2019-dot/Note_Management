import { useState } from 'react';
import { LockKeyhole, X } from 'lucide-react';
import { apiRequest } from '../services/api.js';

function PasswordPrompt({ note, onVerified, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiRequest(`/api/notes/${note.id}/verify-password`, 'POST', { password });
      if (!response.verified) {
        setError('Incorrect password.');
        return;
      }
      onVerified(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <section className="modal-panel compact-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2><LockKeyhole size={20} /> Protected note</h2>
            <p>Enter the note password before viewing or editing.</p>
          </div>
          <button className="icon-button" onClick={onCancel} type="button"><X size={18} /></button>
        </header>

        {error && <div className="alert error">{error}</div>}

        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
          </label>
          <button className="primary-action" disabled={loading}>{loading ? 'Verifying...' : 'Unlock note'}</button>
        </form>
      </section>
    </div>
  );
}

export default PasswordPrompt;
