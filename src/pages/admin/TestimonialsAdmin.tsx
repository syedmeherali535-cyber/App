import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { api } from '../../lib/api';
import { useAsync, useDocumentTitle } from '../../lib/hooks';

export default function AdminTestimonials() {
  useDocumentTitle('Testimonials — Meher EMB Admin');
  const [version, setVersion] = useState(0);
  const testimonials = useAsync(() => api.adminTestimonials(), `testimonials-${version}`);
  const [draft, setDraft] = useState({ name: '', location: '', service: '', quote: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function create() {
    setError('');
    setNotice('');
    if (!draft.name.trim() || !draft.quote.trim()) {
      setError('A customer name and the testimonial text are required.');
      return;
    }
    setBusy(true);
    try {
      await api.createTestimonial({ ...draft, published: false });
      setDraft({ name: '', location: '', service: '', quote: '' });
      setNotice('Testimonial saved as unpublished. Publish it once the customer has approved the wording.');
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the testimonial.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: number, published: boolean) {
    setError('');
    try {
      await api.setTestimonialPublished(id, published);
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the testimonial.');
    }
  }

  async function remove(id: number) {
    if (!window.confirm('Delete this testimonial?')) return;
    setError('');
    try {
      await api.deleteTestimonial(id);
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the testimonial.');
    }
  }

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <div>
        <span className="eyebrow">Testimonials</span>
        <h1 style={{ marginTop: '.3rem' }}>Customer feedback</h1>
        <p className="muted small">
          Only add feedback that a real customer actually gave you. Nothing is invented, and nothing appears on the
          website until you publish it.
        </p>
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
        <h3>Add a testimonial</h3>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="t-name">
              Customer name
            </label>
            <input
              id="t-name"
              className="input"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              maxLength={80}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="t-location">
              Location
            </label>
            <input
              id="t-location"
              className="input"
              value={draft.location}
              onChange={(event) => setDraft({ ...draft, location: event.target.value })}
              placeholder="City, Country"
              maxLength={80}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="t-service">
              Service
            </label>
            <input
              id="t-service"
              className="input"
              value={draft.service}
              onChange={(event) => setDraft({ ...draft, service: event.target.value })}
              placeholder="Cap Embroidery Digitizing"
              maxLength={80}
            />
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="t-quote">
            Testimonial
          </label>
          <textarea
            id="t-quote"
            className="textarea"
            rows={3}
            value={draft.quote}
            onChange={(event) => setDraft({ ...draft, quote: event.target.value })}
            maxLength={600}
          />
        </div>
        <button className="btn btn--navy" type="button" onClick={() => void create()} disabled={busy}>
          {busy ? 'Saving…' : 'Save testimonial'}
        </button>
      </div>

      {testimonials.loading ? (
        <div className="loading-block">
          <span className="spinner" /> Loading testimonials…
        </div>
      ) : (testimonials.data?.testimonials ?? []).length === 0 ? (
        <div className="empty">
          No testimonials saved. The website hides the section entirely until real feedback is published.
        </div>
      ) : (
        <div className="stack" style={{ gap: '.9rem' }}>
          {(testimonials.data?.testimonials ?? []).map((item) => (
            <div className="admin-panel" key={item.id}>
              <div className="spread">
                <div>
                  <strong>{item.name}</strong>{' '}
                  <span className={`badge ${item.published ? 'tone-success' : 'tone-muted'}`}>
                    {item.published ? 'Published' : 'Hidden'}
                  </span>
                  <div className="small muted">
                    {[item.location, item.service].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="row" style={{ gap: '.4rem' }}>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => void toggle(item.id, !item.published)}
                  >
                    {item.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => void remove(item.id)}>
                    Delete
                  </button>
                </div>
              </div>
              <p className="small" style={{ marginBottom: 0 }}>
                “{item.quote}”
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
