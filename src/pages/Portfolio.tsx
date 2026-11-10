import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PortfolioCard } from '../components/PortfolioCard';
import { PageHero } from '../components/SiteLayout';
import { api } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import type { PortfolioItem } from '../lib/types';

export default function Portfolio() {
  useDocumentTitle('Portfolio — Meher EMB');
  const [category, setCategory] = useState('');
  const [active, setActive] = useState<PortfolioItem | null>(null);

  const portfolio = useAsync(() => api.portfolio(category || undefined), category || 'all');

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const items = portfolio.data?.items ?? [];
  const categories = portfolio.data?.categories ?? [];

  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        title="Digitizing work across placements and styles"
        lede="Business logos, brand marks, cap fronts, 3D puff, patches and detailed embroidery designs. Items marked as placeholders are layout samples until the studio uploads real work."
      >
        <Link className="btn btn--gold" to="/order">
          Order a similar design
        </Link>
      </PageHero>

      <section className="section">
        <div className="container">
          <div className="filter-bar" role="group" aria-label="Filter portfolio by category">
            <button
              type="button"
              className="filter-pill"
              aria-pressed={category === ''}
              onClick={() => setCategory('')}
            >
              All work
            </button>
            {categories.map((entry) => (
              <button
                key={entry.category}
                type="button"
                className="filter-pill"
                aria-pressed={category === entry.category}
                onClick={() => setCategory(entry.category)}
              >
                {entry.category} ({entry.count})
              </button>
            ))}
          </div>

          {portfolio.loading ? (
            <div className="loading-block">
              <span className="spinner" /> Loading portfolio…
            </div>
          ) : portfolio.error ? (
            <div className="alert alert--error">
              <Icon name="close" size={16} />
              <span>{portfolio.error}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="empty">No portfolio items in this category yet.</div>
          ) : (
            <div className="portfolio-grid">
              {items.map((item) => (
                <PortfolioCard key={item.id} item={item} onOpen={setActive} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section--tight">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Have artwork ready?</h2>
              <p>Send it with your size and placement details and we will quote your design.</p>
            </div>
            <Link className="btn btn--gold" to="/order">
              Place an Order
            </Link>
          </div>
        </div>
      </section>

      {active ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={active.title} onClick={() => setActive(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal__close" onClick={() => setActive(null)} aria-label="Close">
              <Icon name="close" size={16} />
            </button>
            {active.imageUrl ? (
              <img src={active.imageUrl} alt={active.altText || active.title} />
            ) : (
              <div className="empty">No image uploaded for this item yet.</div>
            )}
            <span className="portfolio-card__cat">{active.category}</span>
            <h2 style={{ marginTop: '.3rem' }}>{active.title}</h2>
            <p className="muted">{active.description || 'Digitizing sample from the studio portfolio.'}</p>
            {active.isPlaceholder ? (
              <div className="alert alert--info">
                <Icon name="spool" size={16} />
                <span>This is a layout placeholder. Real project images are added from the studio dashboard.</span>
              </div>
            ) : null}
            <Link className="btn btn--gold" to={`/order?service=${encodeURIComponent(active.category)}`}>
              Order a similar design
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
