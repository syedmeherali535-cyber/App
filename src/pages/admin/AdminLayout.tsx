import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { ApiError, api } from '../../lib/api';
import type { SessionInfo } from '../../lib/types';

const NAV = [
  { to: '/admin', label: 'Overview', icon: 'chart', end: true },
  { to: '/admin/orders', label: 'Orders', icon: 'list' },
  { to: '/admin/customers', label: 'Customers', icon: 'users' },
  { to: '/admin/portfolio', label: 'Portfolio', icon: 'image' },
  { to: '/admin/services', label: 'Services', icon: 'spool' },
  { to: '/admin/testimonials', label: 'Testimonials', icon: 'quote' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .session()
      .then((info) => {
        if (!active) return;
        if (!info.authenticated) {
          navigate('/admin/login', { replace: true });
          return;
        }
        setSession(info);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate('/admin/login', { replace: true });
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not verify your session.');
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function logout() {
    try {
      await api.logout();
    } finally {
      navigate('/admin/login', { replace: true });
    }
  }

  if (error) {
    return (
      <div className="admin-login">
        <div className="admin-login__card card">
          <h1>Admin unavailable</h1>
          <p className="muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="admin-login">
        <div className="loading-block">
          <span className="spinner" /> Verifying session…
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${open ? ' is-open' : ''}`}>
        <div className="brand brand--light">
          <span className="brand__text">
            <span className="brand__name">Meher EMB</span>
            <span className="brand__sub">Studio Admin</span>
          </span>
        </div>
        <nav className="admin-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__foot">
          <button type="button" className="btn btn--outline btn--sm btn--block" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-toggle" onClick={() => setOpen((value) => !value)}>
            <Icon name="menu" size={18} /> Menu
          </button>
          <strong>Studio dashboard</strong>
          <a className="link-arrow" href="/" target="_blank" rel="noreferrer noopener">
            View website <Icon name="arrow" size={14} />
          </a>
        </header>

        {!session.email.configured ? (
          <div className="alert alert--warn" style={{ margin: '1rem 1.5rem 0' }}>
            <Icon name="mail" size={16} />
            <span>Email notifications are not configured. {session.email.message}</span>
          </div>
        ) : null}

        <div className="admin-main__body">
          <Outlet context={session} />
        </div>
      </div>
    </div>
  );
}
