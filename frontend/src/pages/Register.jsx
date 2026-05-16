import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, LockKeyhole, NotebookPen, UserRound } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const postAuthMessageKey = 'notespace:post-auth-message';

function Register() {
  const [form, setForm] = useState({ email: '', displayName: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/register', 'POST', form);
      if (data.emailSent === false && data.message) {
        sessionStorage.setItem(postAuthMessageKey, data.message);
      }
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <div className="brand-mark">
          <NotebookPen size={26} />
        </div>
        <h1>Create your NoteSpace</h1>
        <p className="auth-subtitle">Register with email, display name, and password. You will be signed in immediately.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Email</span>
            <div className="input-with-icon">
              <Mail size={18} />
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
          </label>
          <label className="field">
            <span>Display name</span>
            <div className="input-with-icon">
              <UserRound size={18} />
              <input type="text" name="displayName" value={form.displayName} onChange={handleChange} required />
            </div>
          </label>
          <label className="field">
            <span>Password</span>
            <div className="input-with-icon">
              <LockKeyhole size={18} />
              <input type="password" name="password" value={form.password} onChange={handleChange} required />
            </div>
          </label>
          <label className="field">
            <span>Confirm password</span>
            <div className="input-with-icon">
              <LockKeyhole size={18} />
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required />
            </div>
          </label>

          {error && <div className="alert error">{error}</div>}

          <button type="submit" className="primary-action" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div className="auth-links">
          <span>Already have an account? <Link to="/login">Login</Link></span>
        </div>
      </section>
    </main>
  );
}

export default Register;
