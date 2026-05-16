import { useEffect, useState } from 'react';
import { BadgeCheck, CalendarDays, Camera, Mail, ShieldAlert, UserCircle } from 'lucide-react';
import { apiRequest, assetUrl, uploadRequest } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const allowedAvatarTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

const formatDate = (value) => {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value));
};

function ProfilePage({ onResendActivation, sendingActivation }) {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(user);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setProfile(user);
    setDisplayName(user?.displayName || '');
  }, [user]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await apiRequest('/api/users/me', 'GET');
        setProfile(data.user);
        setDisplayName(data.user.displayName || '');
        updateUser(data.user);
      } catch (err) {
        setError(err.message);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const nextName = displayName.trim();
    if (!nextName) {
      setError('Display name is required.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await apiRequest('/api/users/me', 'PUT', { displayName: nextName });
      setProfile(data.user);
      updateUser(data.user);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!allowedAvatarTypes.has(file.type)) {
      setError('Avatar must be a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar must be 5MB or smaller.');
      return;
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
    setUploading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const data = await uploadRequest('/api/users/me/avatar', formData);
      setProfile(data.user);
      updateUser(data.user);
      setMessage('Avatar updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const currentAvatar = avatarPreview || assetUrl(profile?.avatarUrl);

  return (
    <section className="profile-page">
      <div className="page-hero profile-hero">
        <div className="hero-copy">
          <span className="eyebrow"><UserCircle size={14} /> Account Identity</span>
          <h1>Profile</h1>
          <p>Manage your avatar, display name, email, and account verification status.</p>
        </div>
      </div>

      {(message || error) && (
        <div className={`alert ${error ? 'error' : 'success'}`}>{error || message}</div>
      )}

      {!profile?.isActive && (
        <div className="profile-warning">
          <ShieldAlert size={20} />
          <div>
            <strong>Your account is not verified.</strong>
            <p>Please check your email for the activation link.</p>
          </div>
          <button className="secondary-action compact" type="button" onClick={onResendActivation} disabled={sendingActivation}>
            {sendingActivation ? 'Sending...' : 'Resend activation email'}
          </button>
        </div>
      )}

      <div className="profile-layout">
        <section className="profile-summary-card">
          <div className="profile-avatar-xl">
            {currentAvatar ? <img src={currentAvatar} alt={profile?.displayName || 'User avatar'} /> : <UserCircle size={58} />}
          </div>
          <h2>{profile?.displayName || 'Your profile'}</h2>
          <p><Mail size={15} /> {profile?.email}</p>
          <span className={`verify-pill ${profile?.isActive ? 'verified' : ''}`}>
            <BadgeCheck size={15} />
            {profile?.isActive ? 'Verified' : 'Unverified'}
          </span>
          <div className="account-date">
            <CalendarDays size={16} />
            <span>Joined {formatDate(profile?.createdAt)}</span>
          </div>
          <label className="primary-action upload-button">
            <Camera size={17} /> {uploading ? 'Uploading...' : 'Upload avatar'}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} hidden disabled={uploading} />
          </label>
        </section>

        <section className="profile-edit-card">
          <div>
            <h2>Account Information</h2>
            <p>Keep your public identity clear and recognizable across NoteSpace.</p>
          </div>
          <form className="stack-form" onSubmit={saveProfile}>
            <label className="field">
              <span>Display name</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your display name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input value={profile?.email || ''} disabled />
            </label>
            <button className="primary-action" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}

export default ProfilePage;
