import { useState } from 'react';
import type { PortfolioItem } from '../lib/types';

export function PortfolioCard({ item, onOpen }: { item: PortfolioItem; onOpen?: (item: PortfolioItem) => void }) {
  const [failed, setFailed] = useState(false);
  const showImage = item.imageUrl && !failed;

  return (
    <button type="button" className="portfolio-card" onClick={() => onOpen?.(item)} aria-label={`View ${item.title}`}>
      <div className="portfolio-card__media">
        {showImage ? (
          <img
            src={item.imageUrl as string}
            alt={item.altText || `${item.title} — ${item.category} embroidery digitizing sample`}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="muted small" style={{ textAlign: 'center', padding: '1rem' }}>
            {item.category}
          </span>
        )}
        {item.isPlaceholder ? <span className="badge-note">Placeholder</span> : null}
      </div>
      <div className="portfolio-card__body">
        <div className="portfolio-card__cat">{item.category}</div>
        <div className="portfolio-card__title">{item.title}</div>
      </div>
    </button>
  );
}
