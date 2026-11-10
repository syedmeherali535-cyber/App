import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { api } from '../../lib/api';
import { useDocumentTitle } from '../../lib/hooks';
import type { EmailConfig } from '../../lib/types';

const TEXT_FIELDS: { key: string; label: string; hint?: string; area?: boolean }[] = [
  { key: 'business_name', label: 'Business name' },
  { key: 'app_name', label: 'App name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'email', label: 'Business email' },
  { key: 'whatsapp_link', label: 'WhatsApp order link', hint: 'Must start with https://' },
  { key: 'website', label: 'Website URL' },
  { key: 'pinterest', label: 'Pinterest URL' },
  { key: 'currency', label: 'Quotation currency code', hint: 'For example USD or PKR' },
  { key: 'turnaround', label: 'Delivery time note' },
  { key: 'payment_methods', label: 'Accepted payment methods (shown publicly)' },
  { key: 'order_notice', label: 'Order page notice', area: true },
];

export default function AdminSettings() {
  useDocumentTitle('Settings — Meher EMB Admin');
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [email, setEmail] = useState<EmailConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    api
      .adminSettings()
      .then((data) => {
        if (!active) return;
        setSettings(data.settings);
        setEmail(data.email);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load settings.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    if (!settings) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const payload: Record<string, string> = {};
      for (const field of TEXT_FIELDS) payload[field.key] = settings[field.key] ?? '';
      payload.testimonials_enabled = settings.testimonials_enabled || '0';
      const result = await api.saveSettings(payload);
      setSettings(result.settings);
      setNotice(`Saved ${result.updated.length} setting${result.updated.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return (
      <div className="loading-block">
        <span className="spinner" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <div>
        <span className="eyebrow">Website / app settings</span>
        <h1 style={{ marginTop: '.3rem' }}>Settings</h1>
        <p className="muted small">These values appear across the public website.</p>
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
        <h3>Business details</h3>
        <div className="form-grid">
          {TEXT_FIELDS.filter((field) => !field.area).map((field) => (
            <div className="field" key={field.key}>
              <label className="label" htmlFor={field.key}>
                {field.label}
              </label>
              <input
                id={field.key}
                className="input"
                value={settings[field.key] ?? ''}
                onChange={(event) => setSettings({ ...settings, [field.key]: event.target.value })}
              />
              {field.hint ? <span className="field__hint">{field.hint}</span> : null}
            </div>
          ))}
        </div>
        {TEXT_FIELDS.filter((field) => field.area).map((field) => (
          <div className="field" key={field.key}>
            <label className="label" htmlFor={field.key}>
              {field.label}
            </label>
            <textarea
              id={field.key}
              className="textarea"
              rows={3}
              value={settings[field.key] ?? ''}
              onChange={(event) => setSettings({ ...settings, [field.key]: event.target.value })}
            />
          </div>
        ))}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.testimonials_enabled === '1'}
            onChange={(event) =>
              setSettings({ ...settings, testimonials_enabled: event.target.checked ? '1' : '0' })
            }
          />
          <span>Show the testimonials section when published testimonials exist</span>
        </label>
        <button className="btn btn--navy" type="button" onClick={() => void save()} disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      <div className="admin-panel">
        <h3>Email notifications</h3>
        {email?.configured ? (
          <div className="alert alert--success">
            <Icon name="mail" size={16} />
            <span>
              Configured with <strong>{email.provider}</strong>. Notifications are sent to {email.adminEmail || 'the business email'}.
            </span>
          </div>
        ) : (
          <div className="alert alert--warn">
            <Icon name="mail" size={16} />
            <span>{email?.message ?? 'Email notifications are not configured.'}</span>
          </div>
        )}
        <p className="small muted">
          Setup: set <span className="mono">EMAIL_PROVIDER</span>, <span className="mono">RESEND_API_KEY</span> and{' '}
          <span className="mono">EMAIL_FROM</span> in the environment, then restart the app. While unconfigured, every
          notification attempt is recorded as “skipped” and nothing is reported as sent.
        </p>
      </div>

      <div className="admin-panel">
        <h3>Admin security</h3>
        <p className="small muted" style={{ marginBottom: 0 }}>
          The administrator password is never stored in this database or in the website code. Set{' '}
          <span className="mono">ADMIN_PASSWORD</span> or, preferably, an <span className="mono">ADMIN_PASSWORD_HASH</span>{' '}
          generated with <span className="mono">npm run hash-password</span>. Also set{' '}
          <span className="mono">SESSION_SECRET</span> so sessions survive a restart.
        </p>
      </div>
    </div>
  );
}
