import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { LockKeyhole, NotebookPen } from 'lucide-react';
import { apiRequest } from '../services/api.js';

function PasswordResetConfirm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/password-reset/confirm', 'POST', { token, password, confirmPassword });
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="auth-layout">
        <section className="auth-card">
          <h1>Invalid reset link</h1>
          <p className="auth-subtitle">Request a new reset email before choosing a new password.</p>
          <Link to="/password-reset">Request a new reset link</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <div className="brand-mark">
          <NotebookPen size={26} />
        </div>
        <h1>Choose new password</h1>
        <p className="auth-subtitle">After reset, login manually with your new password.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>New password</span>
            <div className="input-with-icon">
              <LockKeyhole size={18} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <div className="input-with-icon">
              <LockKeyhole size={18} />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
          </label>

          {message && <div className="alert success">{message}</div>}
          {error && <div className="alert error">{error}</div>}

          <button type="submit" className="primary-action" disabled={loading}>
            {loading ? 'Changing...' : 'Change password'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}

export default PasswordResetConfirm;
