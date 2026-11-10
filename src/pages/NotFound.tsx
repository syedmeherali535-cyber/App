import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../lib/hooks';

export default function NotFound() {
  useDocumentTitle('Page not found — Meher EMB');

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '38rem', textAlign: 'center' }}>
        <span className="eyebrow">404</span>
        <h1>Page not found</h1>
        <p className="lede" style={{ marginInline: 'auto' }}>
          The page you were looking for does not exist. It may have moved, or the link may be
          incomplete.
        </p>
        <div className="row" style={{ justifyContent: 'center', marginTop: '1.2rem' }}>
          <Link className="btn btn--navy" to="/">
            Back to Home
          </Link>
          <Link className="btn btn--outline" to="/order">
            Place an Order
          </Link>
        </div>
      </div>
    </section>
  );
}
