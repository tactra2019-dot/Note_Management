import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Grid3X3,
  List,
  LockKeyhole,
  LogOut,
  Menu,
  NotebookPen,
  Pin,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Tag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest, assetUrl } from '../services/api.js';
import { loadLocalNotes, saveLocalNotes } from '../services/offlineSync.js';
import NoteList from '../components/NoteList.jsx';
import NoteEditor from '../components/NoteEditor.jsx';
import SharedNotes from '../components/SharedNotes.jsx';
import PasswordPrompt from '../components/PasswordPrompt.jsx';
import LabelsPage from '../components/LabelsPage.jsx';
import ProfilePage from '../components/ProfilePage.jsx';
import SettingsPage from '../components/SettingsPage.jsx';
import DashboardRightPanel from '../components/DashboardRightPanel.jsx';

const emptyNote = {
  title: '',
  content: '',
  labels: [],
  images: [],
  pinned: false,
  is_password_protected: false,
};

const postAuthMessageKey = 'notespace:post-auth-message';
const emailUnavailableMessage = 'Email service is temporarily unavailable. Please try again later.';

const applyPreferences = (preferences) => {
  if (!preferences) return;
  document.documentElement.setAttribute('data-theme', preferences.theme || 'light');
  document.documentElement.setAttribute('data-font-size', preferences.fontSize || 'medium');
  document.documentElement.style.setProperty('--note-bg-color', preferences.noteColor || '#ffffff');
};

function Dashboard() {
  const { user, token, logout, updateUser } = useAuth();
  const [notes, setNotes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [verifiedNotes, setVerifiedNotes] = useState(new Set());
  const [passwordPromptNote, setPasswordPromptNote] = useState(null);
  const [pendingProtectedAction, setPendingProtectedAction] = useState(null);
  const [activeView, setActiveView] = useState('notes');
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sendingActivation, setSendingActivation] = useState(false);
  const [preferences, setPreferences] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      refreshAll();
      showToast('Back online. Notes refreshed.', 'success');
    };
    const offline = () => {
      setIsOnline(false);
      showToast('Offline mode. Showing cached notes.', 'info');
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [user?.id]);

  useEffect(() => {
    refreshAll();
  }, [token, user?.id]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const message = sessionStorage.getItem(postAuthMessageKey);
    if (!message) return;

    sessionStorage.removeItem(postAuthMessageKey);
    showToast(message, 'info');
  }, []);

  const sortNotes = (items) => {
    return [...items].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const pinA = a.pinned_at ? new Date(a.pinned_at).getTime() : 0;
      const pinB = b.pinned_at ? new Date(b.pinned_at).getTime() : 0;
      if (pinA !== pinB) return pinB - pinA;
      return new Date(b.updated_at || b.updatedAt || b.created_at || 0) - new Date(a.updated_at || a.updatedAt || a.created_at || 0);
    });
  };

  const refreshAll = async () => {
    if (!user?.id || !token) return;
    setLoading(true);
    if (!navigator.onLine) {
      setNotes(sortNotes(loadLocalNotes(user.id)));
      setLoading(false);
      return;
    }

    try {
      const [notesData, labelsData, profileData, preferencesData] = await Promise.all([
        apiRequest('/api/notes', 'GET', null, token),
        apiRequest('/api/labels', 'GET', null, token),
        apiRequest('/api/users/me', 'GET', null, token),
        apiRequest('/api/preferences', 'GET', null, token),
      ]);
      const nextNotes = sortNotes(notesData.notes || []);
      setNotes(nextNotes);
      saveLocalNotes(user.id, nextNotes);
      setLabels(labelsData.labels || []);
      updateUser(profileData.user);
      setPreferences(preferencesData.preferences || null);
      applyPreferences(preferencesData.preferences);
    } catch (error) {
      setNotes(sortNotes(loadLocalNotes(user.id)));
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesText = !query || `${note.title || ''} ${note.content || ''}`.toLowerCase().includes(query);
      const matchesLabel = !labelFilter || note.labels?.some((label) => String(label.id) === String(labelFilter));
      return matchesText && matchesLabel;
    });
  }, [notes, debouncedSearch, labelFilter]);

  const mutateNoteInList = (note) => {
    if (!note?.id) return;
    setNotes((current) => sortNotes(current.map((item) => (Number(item.id) === Number(note.id) ? { ...item, ...note } : item))));
    setSelectedNote((current) => (current && Number(current.id) === Number(note.id) ? { ...current, ...note } : current));
  };

  const openNote = (note) => {
    setSidebarOpen(false);
    if (note.is_password_protected && !verifiedNotes.has(note.id)) {
      setPasswordPromptNote(note);
      setPendingProtectedAction({ type: 'open', note });
      return;
    }
    setSelectedNote(note);
    setActiveView('notes');
  };

  const openSharedNote = (note) => {
    const sharedNote = { ...note, isShared: true, is_shared: true };
    if (sharedNote.is_password_protected && !verifiedNotes.has(sharedNote.id)) {
      setPasswordPromptNote(sharedNote);
      setPendingProtectedAction({ type: 'open', note: sharedNote });
      return;
    }
    setSelectedNote(sharedNote);
    setActiveView('notes');
  };

  const openOwnedNoteById = async (noteId) => {
    const existing = notes.find((note) => Number(note.id) === Number(noteId));
    if (existing) {
      openNote(existing);
      return;
    }
    try {
      const data = await apiRequest(`/api/notes/${noteId}`, 'GET');
      openNote(data.note);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handlePasswordVerified = (payload) => {
    const note = pendingProtectedAction?.note || passwordPromptNote;
    const unlocked = {
      ...note,
      content: payload.content || note.content || '',
      image_url: payload.image_url || note.image_url || null,
      images: payload.images || note.images || [],
    };
    setVerifiedNotes((current) => new Set([...current, note.id]));
    mutateNoteInList(unlocked);
    setPasswordPromptNote(null);

    if (pendingProtectedAction?.type === 'delete') {
      requestDelete(unlocked, true);
    } else {
      setSelectedNote(unlocked);
      setActiveView('notes');
    }
    setPendingProtectedAction(null);
  };

  const createNote = () => {
    const defaultNoteColor = preferences?.noteColor
      || getComputedStyle(document.documentElement).getPropertyValue('--note-bg-color').trim()
      || '#ffffff';
    setSelectedNote({ ...emptyNote, note_color: defaultNoteColor });
    setActiveView('notes');
    setSidebarOpen(false);
  };

  const saveNote = async (draft) => {
    if (!navigator.onLine) {
      throw new Error('You are offline. Reconnect before editing notes.');
    }

    const body = {
      title: draft.title,
      content: draft.content,
      noteColor: draft.noteColor || draft.note_color || null,
    };

    if (draft.isShared) {
      const data = await apiRequest(`/api/shared/shared-notes/${draft.id}`, 'PUT', body);
      const saved = { ...draft, ...data.note, isShared: true, is_shared: true };
      setSelectedNote(saved);
      return saved;
    }

    if (draft.id) {
      const data = await apiRequest(`/api/notes/${draft.id}`, 'PUT', body);
      mutateNoteInList(data.note);
      saveLocalNotes(user.id, sortNotes(notes.map((item) => (Number(item.id) === Number(data.note.id) ? data.note : item))));
      return data.note;
    }

    const data = await apiRequest('/api/notes', 'POST', body);
    const nextNotes = sortNotes([data.note, ...notes]);
    setNotes(nextNotes);
    saveLocalNotes(user.id, nextNotes);
    setSelectedNote(data.note);
    return data.note;
  };

  const togglePin = async (noteId) => {
    try {
      const data = await apiRequest(`/api/notes/${noteId}/pin`, 'PATCH');
      const note = notes.find((item) => Number(item.id) === Number(noteId));
      mutateNoteInList({ ...note, pinned: data.pinned, pinned_at: data.pinned_at });
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const requestDelete = (note, skipPassword = false) => {
    if (note.is_password_protected && !skipPassword && !verifiedNotes.has(note.id)) {
      setPasswordPromptNote(note);
      setPendingProtectedAction({ type: 'delete', note });
      return;
    }

    setConfirm({
      title: 'Delete note?',
      message: `This will permanently delete "${note.title || 'Untitled note'}".`,
      actionLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiRequest(`/api/notes/${note.id}`, 'DELETE');
          const nextNotes = notes.filter((item) => Number(item.id) !== Number(note.id));
          setNotes(nextNotes);
          saveLocalNotes(user.id, nextNotes);
          if (selectedNote?.id === note.id) setSelectedNote(null);
          showToast('Note deleted.', 'success');
        } catch (error) {
          showToast(error.message, 'error');
        } finally {
          setConfirm(null);
        }
      },
    });
  };

  const resendActivation = async () => {
    setSendingActivation(true);
    try {
      const data = await apiRequest('/api/auth/resend-activation', 'POST');
      if (data.success === false) {
        throw new Error(data.message || emailUnavailableMessage);
      }
      showToast(data.message, 'success');
    } catch (error) {
      const message = /email service|timeout/i.test(error.message)
        ? emailUnavailableMessage
        : error.message;
      showToast(message, 'error');
    } finally {
      setSendingActivation(false);
    }
  };

  const navItems = [
    { key: 'notes', label: 'My Notes', icon: NotebookPen },
    { key: 'shared', label: 'Shared Notes', icon: Share2 },
    { key: 'labels', label: 'Labels', icon: Tag },
  ];

  const bottomNavItems = [
    { key: 'settings', label: 'User Preferences', icon: SlidersHorizontal },
  ];

  const getInitials = (nameOrEmail = '') => {
    const source = (nameOrEmail || user?.email || 'VT').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  };

  const noteStats = [
    { label: 'Total notes', value: notes.length, icon: NotebookPen },
    { label: 'Pinned', value: notes.filter((note) => note.pinned).length, icon: Pin },
    { label: 'Shared', value: notes.filter((note) => note.is_shared).length, icon: Share2 },
    { label: 'Protected', value: notes.filter((note) => note.is_password_protected).length, icon: LockKeyhole },
  ];

  const openMyNotes = () => {
    setActiveView('notes');
    setSelectedNote(null);
    setSidebarOpen(false);
  };

  return (
    <div className={`note-app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="sidebar-brand sidebar-brand-button"
          onClick={openMyNotes}
          aria-label="Go to My Notes"
        >
          <div className="brand-icon"><NotebookPen size={22} /></div>
          <div className="sidebar-brand-text">
            <strong>NoteSpace</strong>
            <span>Final Project</span>
          </div>
        </button>

        <nav className="sidebar-nav sidebar-main-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={activeView === item.key ? 'active' : ''}
                onClick={() => {
                  setActiveView(item.key);
                  setSelectedNote(null);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={18} /> <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-promo">
          <div className="promo-illustration">
            <NotebookPen size={38} />
          </div>
          <strong>Capture ideas, organize thoughts</strong>
          <p>Your ideas, beautifully organized and always within reach.</p>
        </div>

        <div className="sidebar-footer sidebar-bottom-nav">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={activeView === item.key ? 'active' : ''}
                onClick={() => {
                  setActiveView(item.key);
                  setSelectedNote(null);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={18} /> <span>{item.label}</span>
              </button>
            );
          })}
          <button onClick={logout}><LogOut size={18} /> <span>Logout</span></button>
          <button className="collapse-button" type="button" onClick={() => setSidebarCollapsed((value) => !value)}>
            {sidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            <span>{sidebarCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <main className="app-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <div className="search-control">
            <Search size={18} />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search notes by title or content..." />
            <span className="shortcut-badge">Ctrl K</span>
          </div>
          <label className="filter-select-wrap">
            <Tag size={18} />
            <select className="label-filter-control" value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
              <option value="">All labels</option>
              {labels.map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}
            </select>
          </label>
          <div className="view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><Grid3X3 size={17} /></button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><List size={17} /></button>
          </div>
          <button className="primary-action compact" onClick={createNote}><Plus size={17} /> New Note</button>
          <button
            className="user-chip"
            onClick={() => {
              setActiveView('profile');
              setSelectedNote(null);
            }}
          >
            <span className="avatar-sm">{user?.avatarUrl ? <img src={assetUrl(user.avatarUrl)} alt="" /> : getInitials(user?.displayName || user?.email)}</span>
            <span>{user?.displayName || user?.email || 'User'}</span>
            <ChevronDown size={15} />
          </button>
        </header>

        {!user?.isActive && (
          <div className="verify-banner">
            <strong>Your account is not verified. Check your email for the activation link.</strong>
            <button className="secondary-action compact" onClick={resendActivation} disabled={sendingActivation}>
              {sendingActivation ? 'Sending...' : 'Resend activation email'}
            </button>
          </div>
        )}

        {!isOnline && (
          <div className="offline-banner">You are offline. Cached notes are available; editing will resume when online.</div>
        )}

        <section className={`workspace ${selectedNote ? 'with-editor' : ''}`}>
          {activeView === 'notes' && (
            <div className="notes-workspace-shell">
              <div className="notes-section">
                <div className="page-hero notes-hero">
                  <div className="hero-copy">
                    <h1>My Notes</h1>
                    <p>Capture ideas, organize thoughts, and access them anywhere.</p>
                  </div>
                  <div className="hero-illustration" aria-hidden="true">
                    <NotebookPen size={54} />
                  </div>
                  <div className="hero-stat-grid">
                    {noteStats.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div className="mini-stat-card" key={item.label}>
                          <Icon size={17} />
                          <strong>{item.value}</strong>
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="content-toolbar">
                  <div className="notes-title-row">
                    <strong>All Notes</strong>
                    <span>{filteredNotes.length} note{filteredNotes.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="sort-actions">
                    <button className="sort-button" type="button">Sort by: <strong>Newest</strong> <ChevronDown size={15} /></button>
                    <button className="icon-button filter-button" type="button" title="Filter notes"><Filter size={17} /></button>
                  </div>
                </div>

                {loading ? <div className="loading-state">Loading notes...</div> : (
                  <NoteList
                    notes={filteredNotes}
                    selectedNote={selectedNote}
                    viewMode={viewMode}
                    onNoteSelect={openNote}
                    onTogglePin={togglePin}
                    onDeleteNote={requestDelete}
                    emptyAction={createNote}
                    emptyTitle="No notes yet"
                    emptyDescription="Create your first note and start building a clean personal knowledge space."
                    emptyActionLabel="Create New Note"
                  />
                )}
              </div>
              <DashboardRightPanel
                notes={notes}
                labels={labels}
                onCreateNote={createNote}
                onBrowseLabels={() => {
                  setActiveView('labels');
                  setSelectedNote(null);
                }}
                onViewShared={() => {
                  setActiveView('shared');
                  setSelectedNote(null);
                }}
                onOpenNote={openNote}
                onViewAllNotes={() => {
                  setLabelFilter('');
                  setActiveView('notes');
                }}
              />
            </div>
          )}

          {activeView === 'shared' && (
            <SharedNotes onOpenSharedNote={openSharedNote} onOpenOwnedNote={openOwnedNoteById} />
          )}

          {activeView === 'labels' && (
            <LabelsPage
              labels={labels}
              notes={notes}
              onLabelsChange={setLabels}
              onToast={showToast}
              onFilterLabel={(labelId) => {
                setLabelFilter(String(labelId));
                setActiveView('notes');
              }}
            />
          )}

          {activeView === 'profile' && (
            <ProfilePage
              onResendActivation={resendActivation}
              sendingActivation={sendingActivation}
            />
          )}

          {activeView === 'settings' && (
            <SettingsPage onPreferencesChange={setPreferences} />
          )}

          {selectedNote && activeView === 'notes' && (
            <NoteEditor
              note={selectedNote}
              labels={labels}
              user={user}
              readOnly={Boolean(selectedNote.isShared && selectedNote.permission === 'read')}
              onClose={() => setSelectedNote(null)}
              onSave={saveNote}
              onDelete={requestDelete}
              onTogglePin={togglePin}
              onLabelsChange={setLabels}
              onNoteMutated={mutateNoteInList}
              onToast={showToast}
            />
          )}
        </section>
      </main>

      {passwordPromptNote && (
        <PasswordPrompt
          note={passwordPromptNote}
          onVerified={handlePasswordVerified}
          onCancel={() => {
            setPasswordPromptNote(null);
            setPendingProtectedAction(null);
          }}
        />
      )}

      {confirm && (
        <div className="modal-backdrop" onClick={() => setConfirm(null)}>
          <section className="modal-panel compact-modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h2>{confirm.title}</h2>
                <p>{confirm.message}</p>
              </div>
            </header>
            <div className="modal-actions">
              <button className="secondary-action" onClick={() => setConfirm(null)}>Cancel</button>
              <button className={confirm.danger ? 'danger-action' : 'primary-action'} onClick={confirm.onConfirm}>
                {confirm.actionLabel}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default Dashboard;
