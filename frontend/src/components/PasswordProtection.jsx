import { useState } from 'react';
import { LockKeyhole, ShieldOff, X } from 'lucide-react';
import { apiRequest } from '../services/api.js';

function PasswordProtection({ note, onClose, onPasswordChange }) {
  const [mode, setMode] = useState(note?.is_password_protected ? 'change' : 'enable');
  const [form, setForm] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleEnable = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiRequest(`/api/notes/${note.id}/password`, 'POST', {
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      onPasswordChange(true);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiRequest(`/api/notes/${note.id}/password`, 'PUT', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmNewPassword,
      });
      onPasswordChange(true);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiRequest(`/api/notes/${note.id}/password`, 'DELETE', { password: form.currentPassword });
      onPasswordChange(false);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel compact-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>Note password</h2>
            <p>{note?.is_password_protected ? 'Change or disable protection for this note.' : 'Add password protection to this note.'}</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button"><X size={18} /></button>
        </header>

        {error && <div className="alert error">{error}</div>}

        {note?.is_password_protected && (
          <div className="segmented-control">
            <button className={mode === 'change' ? 'active' : ''} onClick={() => setMode('change')} type="button">
              <LockKeyhole size={16} /> Change
            </button>
            <button className={mode === 'disable' ? 'active' : ''} onClick={() => setMode('disable')} type="button">
              <ShieldOff size={16} /> Disable
            </button>
          </div>
        )}

        {mode === 'enable' && (
          <form className="stack-form" onSubmit={handleEnable}>
            <label className="field"><span>Password</span><input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required /></label>
            <label className="field"><span>Confirm password</span><input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required /></label>
            <button className="primary-action" disabled={loading}>{loading ? 'Saving...' : 'Enable password'}</button>
          </form>
        )}

        {mode === 'change' && (
          <form className="stack-form" onSubmit={handleChange}>
            <label className="field"><span>Current password</span><input type="password" value={form.currentPassword} onChange={(e) => update('currentPassword', e.target.value)} required /></label>
            <label className="field"><span>New password</span><input type="password" value={form.newPassword} onChange={(e) => update('newPassword', e.target.value)} required /></label>
            <label className="field"><span>Confirm new password</span><input type="password" value={form.confirmNewPassword} onChange={(e) => update('confirmNewPassword', e.target.value)} required /></label>
            <button className="primary-action" disabled={loading}>{loading ? 'Saving...' : 'Change password'}</button>
          </form>
        )}

        {mode === 'disable' && (
          <form className="stack-form" onSubmit={handleDisable}>
            <label className="field"><span>Current password</span><input type="password" value={form.currentPassword} onChange={(e) => update('currentPassword', e.target.value)} required /></label>
            <button className="danger-action" disabled={loading}>{loading ? 'Removing...' : 'Disable password'}</button>
          </form>
        )}
      </section>
    </div>
  );
}

export default PasswordProtection;
