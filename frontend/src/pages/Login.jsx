import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  NotebookPen,
  Tag,
} from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/login', 'POST', form);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-layout">
      <div className="login-bg-blob login-bg-blob-one" aria-hidden="true" />
      <div className="login-bg-blob login-bg-blob-two" aria-hidden="true" />
      <div className="login-bg-dots login-bg-dots-left" aria-hidden="true" />
      <div className="login-bg-dots login-bg-dots-right" aria-hidden="true" />
      <div className="login-curve login-curve-one" aria-hidden="true" />
      <div className="login-curve login-curve-two" aria-hidden="true" />
      <div className="login-float-card login-float-card-note" aria-hidden="true">
        <FileText size={46} />
      </div>
      <div className="login-float-card login-float-card-tag" aria-hidden="true">
        <Tag size={50} />
      </div>

      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-brand-icon">
            <NotebookPen size={27} strokeWidth={2.35} />
          </span>
          <span className="login-brand-text">
            <span>Note</span>
            <span>Space</span>
          </span>
        </div>

        <div className="login-heading">
          <h1 id="login-title">Welcome back 👋</h1>
          <p>Sign in to access your notes, labels, shares, and preferences.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-field">
            <span>Email</span>
            <div className="login-field-control">
              <Mail className="login-field-icon" size={20} />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="login-field">
            <span>Password</span>
            <div className="login-field-control">
              <LockKeyhole className="login-field-icon" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          {error && (
            <div className="login-alert" role="alert">
              <AlertCircle size={19} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            <span>{loading ? 'Signing in...' : 'Login'}</span>
            {!loading && <ArrowRight size={23} />}
          </button>
        </form>

        <div className="login-links">
          <Link to="/password-reset">Forgot password?</Link>
          <span>
            Need an account? <Link to="/register">Register</Link>
          </span>
        </div>
      </section>
    </main>
  );
}

export default Login;
