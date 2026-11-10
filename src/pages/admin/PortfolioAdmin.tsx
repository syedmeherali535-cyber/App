import { useState, type FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import { api } from '../../lib/api';
import { useAsync, useDocumentTitle } from '../../lib/hooks';
import type { PortfolioItem } from '../../lib/types';

interface Draft {
  title: string;
  category: string;
  description: string;
  altText: string;
  featured: boolean;
}

const EMPTY: Draft = { title: '', category: '', description: '', altText: '', featured: false };

export default function AdminPortfolio() {
  useDocumentTitle('Portfolio — Meher EMB Admin');
  const [version, setVersion] = useState(0);
  const items = useAsync(() => api.adminPortfolio(), `portfolio-${version}`);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);

  const categories = Array.from(new Set((items.data?.items ?? []).map((item) => item.category)));

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!draft.title.trim()) {
      setError('A title is required.');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('title', draft.title);
      form.append('category', draft.category);
      form.append('description', draft.description);
      form.append('alt_text', draft.altText);
      form.append('featured', String(draft.featured));
      if (image) form.append('image', image);
      await api.createPortfolio(form);
      setDraft(EMPTY);
      setImage(null);
      setNotice('Portfolio item added.');
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the item.');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(item: PortfolioItem) {
    setError('');
    setBusy(true);
    try {
      await api.updatePortfolio(item.id, {
        title: editDraft.title,
        category: editDraft.category,
        description: editDraft.description,
        alt_text: editDraft.altText,
        featured: editDraft.featured,
      });
      setEditing(null);
      setNotice('Item updated.');
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the item.');
    } finally {
      setBusy(false);
    }
  }

  async function replaceImage(item: PortfolioItem, file: File) {
    setError('');
    try {
      await api.replacePortfolioImage(item.id, file);
      setNotice('Image replaced.');
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not replace the image.');
    }
  }

  async function remove(item: PortfolioItem) {
    if (!window.confirm(`Remove “${item.title}” from the portfolio?`)) return;
    setError('');
    try {
      await api.deletePortfolio(item.id);
      setNotice('Item removed.');
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the item.');
    }
  }

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <div>
        <span className="eyebrow">Portfolio management</span>
        <h1 style={{ marginTop: '.3rem' }}>Portfolio</h1>
        <p className="muted small">
          Upload your real designs here. Placeholder tiles are labelled “Placeholder” until you replace them with
          genuine studio work.
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
        <h3>Add a portfolio item</h3>
        <form className="form" onSubmit={onCreate}>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="p-title">
                Title
              </label>
              <input
                id="p-title"
                className="input"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                maxLength={120}
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="p-cat">
                Category
              </label>
              <input
                id="p-cat"
                className="input"
                list="portfolio-categories"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                placeholder="Business Logos, Cap Designs, 3D Puff…"
                maxLength={60}
              />
              <datalist id="portfolio-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label className="label" htmlFor="p-alt">
                Image alt text
              </label>
              <input
                id="p-alt"
                className="input"
                value={draft.altText}
                onChange={(event) => setDraft({ ...draft, altText: event.target.value })}
                maxLength={160}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="p-image">
                Image (PNG, JPG or WebP, max 10 MB)
              </label>
              <input
                id="p-image"
                className="input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setImage(event.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="p-desc">
              Description
            </label>
            <textarea
              id="p-desc"
              className="textarea"
              rows={2}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              maxLength={400}
            />
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(event) => setDraft({ ...draft, featured: event.target.checked })}
            />
            <span>Feature on the home page</span>
          </label>
          <button className="btn btn--navy" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Add item'}
          </button>
        </form>
      </div>

      {items.loading ? (
        <div className="loading-block">
          <span className="spinner" /> Loading portfolio…
        </div>
      ) : (items.data?.items ?? []).length === 0 ? (
        <div className="empty">No portfolio items yet.</div>
      ) : (
        <div className="stack" style={{ gap: '.9rem' }}>
          {(items.data?.items ?? []).map((item) => (
            <div className="admin-panel" key={item.id}>
              <div className="spread">
                <div className="row" style={{ gap: '.8rem' }}>
                  <div className="portfolio-thumb">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.altText || item.title} /> : <span>No image</span>}
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <div className="small muted">
                      {item.category} {item.featured ? '· Featured' : ''}{' '}
                      {item.isPlaceholder ? '· Placeholder' : ''}
                    </div>
                  </div>
                </div>
                <div className="row" style={{ gap: '.4rem' }}>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => {
                      setEditing(editing === item.id ? null : item.id);
                      setEditDraft({
                        title: item.title,
                        category: item.category,
                        description: item.description,
                        altText: item.altText,
                        featured: item.featured,
                      });
                    }}
                  >
                    {editing === item.id ? 'Close' : 'Edit'}
                  </button>
                  <label className="btn btn--outline btn--sm" style={{ cursor: 'pointer' }}>
                    Replace image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void replaceImage(item, file);
                      }}
                    />
                  </label>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => void remove(item)}>
                    Remove
                  </button>
                </div>
              </div>

              {editing === item.id ? (
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
                      <label className="label">Category</label>
                      <input
                        className="input"
                        value={editDraft.category}
                        onChange={(event) => setEditDraft({ ...editDraft, category: event.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="label">Alt text</label>
                      <input
                        className="input"
                        value={editDraft.altText}
                        onChange={(event) => setEditDraft({ ...editDraft, altText: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">Description</label>
                    <textarea
                      className="textarea"
                      rows={2}
                      value={editDraft.description}
                      onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
                    />
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={editDraft.featured}
                      onChange={(event) => setEditDraft({ ...editDraft, featured: event.target.checked })}
                    />
                    <span>Feature on the home page</span>
                  </label>
                  <button className="btn btn--navy btn--sm" type="button" onClick={() => void saveEdit(item)} disabled={busy}>
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
