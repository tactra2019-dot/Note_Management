import { useEffect, useState } from 'react';
import { Edit3, Plus, Tag, Trash2, X } from 'lucide-react';
import { apiRequest } from '../services/api.js';

function LabelManager({ isOpen, onClose, labels = [], selectedLabels = [], onLabelsChange, onToggleLabel }) {
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState('#2563eb');
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setDraftName('');
      setEditing(null);
      setConfirmDelete(null);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const createLabel = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const data = await apiRequest('/api/labels', 'POST', { name: draftName.trim(), color: draftColor });
      onLabelsChange([...labels, data.label]);
      setDraftName('');
      setDraftColor('#2563eb');
    } catch (err) {
      setError(err.message);
    }
  };

  const updateLabel = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const data = await apiRequest(`/api/labels/${editing.id}`, 'PUT', {
        name: editing.name.trim(),
        color: editing.color,
      });
      onLabelsChange(labels.map((label) => (label.id === editing.id ? data.label : label)));
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteLabel = async () => {
    if (!confirmDelete) return;
    setError('');
    try {
      await apiRequest(`/api/labels/${confirmDelete.id}`, 'DELETE');
      onLabelsChange(labels.filter((item) => item.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const selectedIds = new Set(selectedLabels.map((label) => Number(label.id)));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel labels-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>Labels</h2>
            <p>Manage labels and attach them to the selected note.</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button"><X size={18} /></button>
        </header>

        {error && <div className="alert error">{error}</div>}

        <form className="inline-form" onSubmit={createLabel}>
          <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="New label" required />
          <input type="color" value={draftColor} onChange={(e) => setDraftColor(e.target.value)} title="Label color" />
          <button type="submit" className="primary-action compact"><Plus size={16} /> Add</button>
        </form>

        <div className="label-manager-list">
          {!labels.length && <p className="muted">No labels yet.</p>}
          {labels.map((label) => (
            <div className="label-manager-item" key={label.id}>
              {editing?.id === label.id ? (
                <form className="edit-label-row" onSubmit={updateLabel}>
                  <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
                  <input type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
                  <button type="submit" className="secondary-action compact">Save</button>
                  <button type="button" className="ghost-action compact" onClick={() => setEditing(null)}>Cancel</button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className={`label-select ${selectedIds.has(Number(label.id)) ? 'active' : ''}`}
                    onClick={() => onToggleLabel?.(label)}
                  >
                    <Tag size={15} style={{ color: label.color }} />
                    {label.name}
                  </button>
                  <div className="row-actions">
                    <button className="icon-button" type="button" title="Edit label" onClick={() => setEditing({ ...label })}>
                      <Edit3 size={16} />
                    </button>
                    <button className="icon-button danger" type="button" title="Delete label" onClick={() => setConfirmDelete(label)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
      {confirmDelete && (
        <section className="modal-panel compact-modal nested-confirm" onClick={(event) => event.stopPropagation()}>
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
      )}
    </div>
  );
}

export default LabelManager;
