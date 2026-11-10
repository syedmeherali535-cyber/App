import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { ApiError, api } from '../../lib/api';
import { useDocumentTitle } from '../../lib/hooks';
import type { SessionInfo } from '../../lib/types';

export default function AdminLogin() {
  useDocumentTitle('Admin Login — Meher EMB');
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .session()
      .then((info) => {
        if (!active) return;
        if (info.authenticated) {
          navigate('/admin', { replace: true });
          return;
        }
        setSession(info);
      })
      .catch(() => {
        if (active) setSession(null);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.login(password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card card">
        <span className="eyebrow">Studio access</span>
        <h1 style={{ marginTop: '.4rem' }}>Admin sign in</h1>
        <p className="muted small">
          This area is private. Customer orders and files are only visible after signing in.
        </p>

        {session && !session.configured ? (
          <div className="alert alert--warn">
            <Icon name="shield" size={16} />
            <span>{session.setupMessage}</span>
          </div>
        ) : null}

        {error ? (
          <div className="alert alert--error" role="alert">
            <Icon name="close" size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <form className="form" onSubmit={onSubmit}>
          <div className="field">
            <label className="label" htmlFor="password">
              Administrator password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              disabled={session ? !session.configured : false}
            />
          </div>
          <button
            className="btn btn--navy btn--block"
            type="submit"
            disabled={busy || (session ? !session.configured : false)}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="divider" />
        <p className="small muted" style={{ marginBottom: 0 }}>
          Credentials are set by the site owner with the <span className="mono">ADMIN_PASSWORD</span> or{' '}
          <span className="mono">ADMIN_PASSWORD_HASH</span> environment variable. There is no default password.
        </p>
        <p className="small" style={{ marginBottom: 0 }}>
          <Link className="link-arrow" to="/">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
