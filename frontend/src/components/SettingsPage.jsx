import { useEffect, useState } from 'react';
import { KeyRound, Moon, Palette, ShieldCheck, SlidersHorizontal, Sun, Type } from 'lucide-react';
import { apiRequest } from '../services/api.js';

const defaultPreferences = {
  theme: 'light',
  fontSize: 'medium',
  noteColor: '#ffffff',
};

const noteColors = [
  { label: 'White', value: '#ffffff' },
  { label: 'Soft yellow', value: '#fef3c7' },
  { label: 'Soft blue', value: '#dbeafe' },
  { label: 'Soft green', value: '#dcfce7' },
  { label: 'Soft purple', value: '#ede9fe' },
  { label: 'Soft pink', value: '#fce7f3' },
];

const applyPreferences = (preferences) => {
  document.documentElement.setAttribute('data-theme', preferences.theme || 'light');
  document.documentElement.setAttribute('data-font-size', preferences.fontSize || 'medium');
  document.documentElement.style.setProperty('--note-bg-color', preferences.noteColor || '#ffffff');
};

function SettingsPage({ onPreferencesChange }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPreferences = async () => {
      setError('');
      try {
        const data = await apiRequest('/api/preferences', 'GET');
        const next = data.preferences || defaultPreferences;
        setPreferences(next);
        applyPreferences(next);
        onPreferencesChange?.(next);
      } catch (err) {
        setError(err.message);
      }
    };
    loadPreferences();
  }, []);

  const savePreferences = async (nextPreferences) => {
    setPreferences(nextPreferences);
    applyPreferences(nextPreferences);
    setSavingPreferences(true);
    setError('');
    setMessage('');
    try {
      const data = await apiRequest('/api/preferences', 'PUT', nextPreferences);
      setPreferences(data.preferences);
      applyPreferences(data.preferences);
      onPreferencesChange?.(data.preferences);
      setMessage('Preferences saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPreferences(false);
    }
  };

  const updatePasswordField = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setError('Current password and new password are required.');
      return;
    }
    if (passwordForm.newPassword.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Confirm password must match the new password.');
      return;
    }

    setChangingPassword(true);
    try {
      const data = await apiRequest('/api/auth/change-password', 'POST', passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage(data.message || 'Password updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <section className="settings-page">
      <div className="page-hero settings-hero">
        <div className="hero-copy">
          <span className="eyebrow"><SlidersHorizontal size={14} /> Personal Preferences</span>
          <h1>User Preferences</h1>
          <p>Customize your appearance, note defaults, and account security.</p>
        </div>
      </div>

      {(message || error) && (
        <div className={`alert ${error ? 'error' : 'success'}`}>{error || message}</div>
      )}

      <div className="settings-page-grid">
        <section className="settings-feature-card">
          <div className="settings-card-heading">
            <span><Sun size={18} /></span>
            <div>
              <h2>Appearance</h2>
              <p>Choose how NoteSpace feels while you work.</p>
            </div>
          </div>
          <div className="segmented-control settings-segment">
            <button
              type="button"
              className={preferences.theme === 'light' ? 'active' : ''}
              onClick={() => savePreferences({ ...preferences, theme: 'light' })}
            >
              <Sun size={16} /> Light
            </button>
            <button
              type="button"
              className={preferences.theme === 'dark' ? 'active' : ''}
              onClick={() => savePreferences({ ...preferences, theme: 'dark' })}
            >
              <Moon size={16} /> Dark
            </button>
          </div>
        </section>

        <section className="settings-feature-card">
          <div className="settings-card-heading">
            <span><Type size={18} /></span>
            <div>
              <h2>Note Preferences</h2>
              <p>Set comfortable defaults for writing notes.</p>
            </div>
          </div>

          <div className="settings-field-group">
            <strong>Note font size</strong>
            <div className="segmented-control settings-segment">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  type="button"
                  className={preferences.fontSize === size ? 'active' : ''}
                  onClick={() => savePreferences({ ...preferences, fontSize: size })}
                >
                  {size[0].toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field-group">
            <strong><Palette size={16} /> Default note color</strong>
            <div className="note-color-palette">
              {noteColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={preferences.noteColor?.toLowerCase() === color.value ? 'active' : ''}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                  onClick={() => savePreferences({ ...preferences, noteColor: color.value })}
                >
                  <span>{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          {savingPreferences && <p className="settings-hint">Saving settings...</p>}
        </section>

        <section className="settings-feature-card security-card">
          <div className="settings-card-heading">
            <span><KeyRound size={18} /></span>
            <div>
              <h2>Security</h2>
              <p>Use a strong password to keep your notes safe.</p>
            </div>
          </div>

          <form className="stack-form" onSubmit={changePassword}>
            <label className="field">
              <span>Current password</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                required
              />
            </label>
            <button className="primary-action" type="submit" disabled={changingPassword}>
              {changingPassword ? 'Updating...' : 'Update password'}
            </button>
          </form>

          <div className="security-note">
            <ShieldCheck size={16} />
            <span>Changing your password does not log you out automatically.</span>
          </div>
        </section>
      </div>
    </section>
  );
}

export default SettingsPage;
