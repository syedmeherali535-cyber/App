import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { api } from '../../lib/api';
import { useAsync, useDocumentTitle } from '../../lib/hooks';
import type { Service } from '../../lib/types';

const ICON_OPTIONS = ['logo', 'cap', 'puff', 'patch', 'shirt', 'custom', 'spool', 'star'];

interface Draft {
  title: string;
  summary: string;
  description: string;
  features: string;
  icon: string;
  active: boolean;
}

const EMPTY: Draft = { title: '', summary: '', description: '', features: '', icon: 'custom', active: true };

export default function AdminServices() {
  useDocumentTitle('Services — Meher EMB Admin');
  const [version, setVersion] = useState(0);
  const services = useAsync(() => api.adminServices(), `services-${version}`);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function create() {
    setError('');
    setNotice('');
    if (!draft.title.trim()) {
      setError('A service title is required.');
      return;
    }
    setBusy(true);
    try {
      await api.createService({
        title: draft.title,
        summary: draft.summary,
        description: draft.description,
        features: draft.features
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        icon: draft.icon,
        active: draft.active,
      });
      setDraft(EMPTY);
      setNotice('Service added.');
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the service.');
    } finally {
      setBusy(false);
    }
  }

  async function save(service: Service) {
    setError('');
    setBusy(true);
    try {
      await api.updateService(service.id, {
        title: editDraft.title,
        summary: editDraft.summary,
        description: editDraft.description,
        features: editDraft.features
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        icon: editDraft.icon,
        active: editDraft.active,
      });
      setEditing(null);
      setNotice('Service updated.');
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the service.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(service: Service) {
    setError('');
    try {
      await api.updateService(service.id, { active: !(service.active ?? true) });
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the service.');
    }
  }

  async function remove(service: Service) {
    if (!window.confirm(`Delete “${service.title}”? Existing orders keep their service label.`)) return;
    setError('');
    try {
      await api.deleteService(service.id);
      setNotice('Service deleted.');
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the service.');
    }
  }

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <div>
        <span className="eyebrow">Services management</span>
        <h1 style={{ marginTop: '.3rem' }}>Services</h1>
        <p className="muted small">Active services appear on the website and in the order form.</p>
      </div>

      {error ? (
        <div className="alert alert--error">
          <Icon name="close" size={16} />
          <span>{error}</span>
        </div>
      ) : null}
      {notice ? (
        <div className="alert alert--success">
          <Icon name="check" size={16} />
          <span>{notice}</span>
        </div>
      ) : null}

      <div className="admin-panel">
        <h3>Add a service</h3>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="s-title">
              Title
            </label>
            <input
              id="s-title"
              className="input"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="s-icon">
              Icon
            </label>
            <select
              id="s-icon"
              className="select"
              value={draft.icon}
              onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
            >
              {ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="s-summary">
            Short summary
          </label>
          <input
            id="s-summary"
            className="input"
            value={draft.summary}
            onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
            maxLength={240}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="s-desc">
            Description
          </label>
          <textarea
            id="s-desc"
            className="textarea"
            rows={3}
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="s-features">
            Highlights (comma separated)
          </label>
          <input
            id="s-features"
            className="input"
            value={draft.features}
            onChange={(event) => setDraft({ ...draft, features: event.target.value })}
            placeholder="Cap-ready underlay, Small text cleanup, 3 formats included"
          />
        </div>
        <button className="btn btn--navy" type="button" onClick={() => void create()} disabled={busy}>
          {busy ? 'Saving…' : 'Add service'}
        </button>
      </div>

      {services.loading ? (
        <div className="loading-block">
          <span className="spinner" /> Loading services…
        </div>
      ) : (services.data?.services ?? []).length === 0 ? (
        <div className="empty">No services yet.</div>
      ) : (
        <div className="stack" style={{ gap: '.9rem' }}>
          {(services.data?.services ?? []).map((service) => (
            <div className="admin-panel" key={service.id}>
              <div className="spread">
                <div>
                  <strong>{service.title}</strong>{' '}
                  <span className={`badge ${service.active ? 'tone-success' : 'tone-muted'}`}>
                    {service.active ? 'Active' : 'Hidden'}
                  </span>
                  <div className="small muted">{service.summary}</div>
                </div>
                <div className="row" style={{ gap: '.4rem' }}>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => {
                      setEditing(editing === service.id ? null : service.id);
                      setEditDraft({
                        title: service.title,
                        summary: service.summary,
                        description: service.description,
                        features: service.features.join(', '),
                        icon: service.icon,
                        active: service.active ?? true,
                      });
                    }}
                  >
                    {editing === service.id ? 'Close' : 'Edit'}
                  </button>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => void toggle(service)}>
                    {service.active ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => void remove(service)}>
                    Delete
                  </button>
                </div>
              </div>

              {editing === service.id ? (
                <div className="stack" style={{ gap: '.7rem', marginTop: '1rem' }}>
                  <div className="form-grid">
                    <div className="field">
                      <label className="label">Title</label>
                      <input
                        className="input"
                        value={editDraft.title}
                        onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="label">Icon</label>
                      <select
                        className="select"
                        value={editDraft.icon}
                        onChange={(event) => setEditDraft({ ...editDraft, icon: event.target.value })}
                      >
                        {ICON_OPTIONS.map((icon) => (
                          <option key={icon} value={icon}>
                            {icon}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">Summary</label>
                    <input
                      className="input"
                      value={editDraft.summary}
                      onChange={(event) => setEditDraft({ ...editDraft, summary: event.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label className="label">Description</label>
                    <textarea
                      className="textarea"
                      rows={3}
                      value={editDraft.description}
                      onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label className="label">Highlights (comma separated)</label>
                    <input
                      className="input"
                      value={editDraft.features}
                      onChange={(event) => setEditDraft({ ...editDraft, features: event.target.value })}
                    />
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={editDraft.active}
                      onChange={(event) => setEditDraft({ ...editDraft, active: event.target.checked })}
                    />
                    <span>Visible on the website</span>
                  </label>
                  <button className="btn btn--navy btn--sm" type="button" onClick={() => void save(service)} disabled={busy}>
                    Save changes
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
