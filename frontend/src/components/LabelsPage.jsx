import { useMemo, useState } from 'react';
import { Edit3, FolderOpen, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import { apiRequest } from '../services/api.js';

function LabelsPage({ labels = [], notes = [], onLabelsChange, onFilterLabel, onToast }) {
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState('#2563eb');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');

  const labelStats = useMemo(() => {
    return labels.map((label) => ({
      ...label,
      noteCount: notes.filter((note) => note.labels?.some((item) => Number(item.id) === Number(label.id))).length,
    }));
  }, [labels, notes]);

  const visibleLabels = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return labelStats;
    return labelStats.filter((label) => label.name.toLowerCase().includes(value));
  }, [labelStats, query]);

  const createLabel = async (event) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) {
      setError('Label name is required.');
      return;
    }

    setError('');
    try {
      const data = await apiRequest('/api/labels', 'POST', { name, color: draftColor });
      onLabelsChange([...labels, data.label]);
      setDraftName('');
      setDraftColor('#2563eb');
      onToast?.('Label created.', 'success');
    } catch (err) {
      setError(err.message);
    }
  };

  const updateLabel = async (event) => {
    event.preventDefault();
    const name = editing?.name?.trim();
    if (!name) {
      setError('Label name is required.');
      return;
    }

    setError('');
    try {
      const data = await apiRequest(`/api/labels/${editing.id}`, 'PUT', {
        name,
        color: editing.color,
      });
      onLabelsChange(labels.map((label) => (Number(label.id) === Number(editing.id) ? data.label : label)));
      setEditing(null);
      onToast?.('Label updated.', 'success');
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteLabel = async () => {
    if (!confirmDelete) return;
    setError('');
    try {
      await apiRequest(`/api/labels/${confirmDelete.id}`, 'DELETE');
      onLabelsChange(labels.filter((label) => Number(label.id) !== Number(confirmDelete.id)));
      setConfirmDelete(null);
      onToast?.('Label deleted. Notes were kept.', 'success');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="labels-page">
      <div className="page-hero">
        <div className="hero-copy">
          <span className="eyebrow"><Tag size={14} /> Label Studio</span>
          <h1>Labels</h1>
          <p>Organize your notes with flexible labels.</p>
        </div>
        <div className="hero-stat-card">
          <span>{labels.length}</span>
          <strong>Total labels</strong>
        </div>
      </div>

      <div className="labels-layout">
        <form className="label-compose-card" onSubmit={createLabel}>
          <div>
            <h2>Create label</h2>
            <p>Use clear names and colors to group related notes.</p>
          </div>

          {error && <div className="alert error">{error}</div>}

          <label className="field">
            <span>Label name</span>
            <input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Examples: Study, Ideas, Work" />
          </label>

          <label className="field">
            <span>Color</span>
            <input type="color" value={draftColor} onChange={(event) => setDraftColor(event.target.value)} />
          </label>

          <button className="primary-action" type="submit"><Plus size={17} /> Add Label</button>
        </form>

        <div className="labels-directory">
          <div className="labels-toolbar">
            <div>
              <h2>Your labels</h2>
              <p>{visibleLabels.length} visible</p>
            </div>
            <div className="search-control label-search">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search labels" />
            </div>
          </div>

          {!visibleLabels.length ? (
            <div className="empty-state label-empty">
              <div className="empty-illustration"><FolderOpen size={26} /></div>
              <h3>No labels yet</h3>
              <p>Create labels to group your notes by topic.</p>
            </div>
          ) : (
            <div className="label-card-grid">
              {visibleLabels.map((label) => (
                <article className="label-card" key={label.id}>
                  {editing?.id === label.id ? (
                    <form className="label-edit-form" onSubmit={updateLabel}>
                      <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required />
                      <input type="color" value={editing.color} onChange={(event) => setEditing({ ...editing, color: event.target.value })} />
                      <div className="row-actions">
                        <button className="secondary-action compact" type="submit">Save</button>
                        <button className="ghost-action compact" type="button" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="label-card-main">
                        <span className="label-color-dot" style={{ backgroundColor: label.color }} />
                        <div>
                          <h3>{label.name}</h3>
                          <p>{label.noteCount} note{label.noteCount === 1 ? '' : 's'}</p>
                        </div>
                      </div>
                      <div className="label-card-actions">
                        <button className="secondary-action compact" type="button" onClick={() => onFilterLabel?.(label.id)}>
                          View notes
                        </button>
                        <button className="icon-button" type="button" title="Edit label" onClick={() => setEditing({ ...label })}>
                          <Edit3 size={16} />
                        </button>
                        <button className="icon-button danger" type="button" title="Delete label" onClick={() => setConfirmDelete(label)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <section className="modal-panel compact-modal warning-modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h2>Delete label?</h2>
                <p>Notes using "{confirmDelete.name}" will stay in your account.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </header>
            <div className="modal-actions">
              <button className="secondary-action" type="button" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="danger-action" type="button" onClick={deleteLabel}>Delete label</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default LabelsPage;
