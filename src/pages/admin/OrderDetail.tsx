import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { api } from '../../lib/api';
import { formatDate, paymentLabel, statusLabel, statusTone } from '../../lib/format';
import { useDocumentTitle } from '../../lib/hooks';
import type { AdminOrderDetail } from '../../lib/types';

const NOTIFY_OPTIONS = [
  { value: 'order-received', label: 'Order confirmation to customer' },
  { value: 'quotation', label: 'Quotation to customer' },
  { value: 'payment-verified', label: 'Payment verified to customer' },
  { value: 'completed', label: 'Order completed to customer' },
  { value: 'delivery', label: 'Final files delivered to customer' },
];

export default function AdminOrderDetailPage() {
  const { ref = '' } = useParams();
  useDocumentTitle(`Order ${ref} — Meher EMB Admin`);

  const [data, setData] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState('USD');
  const [statusNote, setStatusNote] = useState('');
  const [note, setNote] = useState('');
  const [notifyType, setNotifyType] = useState(NOTIFY_OPTIONS[0].value);

  async function load() {
    const detail = await api.order(ref);
    setData(detail);
    setStatus(detail.order.status);
    setPayment(detail.order.paymentStatus);
    setQuoteAmount(detail.order.quoteAmount || '');
    setQuoteCurrency(detail.order.quoteCurrency || 'USD');
  }

  useEffect(() => {
    let active = true;
    api
      .order(ref)
      .then((detail) => {
        if (!active) return;
        setData(detail);
        setStatus(detail.order.status);
        setPayment(detail.order.paymentStatus);
        setQuoteAmount(detail.order.quoteAmount || '');
        setQuoteCurrency(detail.order.quoteCurrency || 'USD');
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load the order.');
      });
    return () => {
      active = false;
    };
  }, [ref]);

  async function saveOrder() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = await api.updateOrder(ref, {
        status,
        payment_status: payment,
        quote_amount: quoteAmount,
        quote_currency: quoteCurrency,
        status_note: statusNote,
      });
      setStatusNote('');
      await load();
      const sent = result.notifications.filter((entry) => entry.status === 'sent').length;
      const skipped = result.notifications.filter((entry) => entry.status === 'skipped').length;
      setNotice(
        `Order updated. ${sent} email(s) sent${skipped ? `, ${skipped} skipped (email not configured)` : ''}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the order.');
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    setError('');
    setBusy(true);
    try {
      await api.addNote(ref, note);
      setNote('');
      await load();
      setNotice('Note added to the order.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the note.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError('');
    setBusy(true);
    try {
      await api.uploadDeliveryFiles(ref, Array.from(files));
      await load();
      setNotice('Delivery file(s) uploaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the files.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteFile(id: number) {
    if (!window.confirm('Delete this file permanently?')) return;
    setError('');
    try {
      await api.deleteFile(ref, id);
      await load();
      setNotice('File deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the file.');
    }
  }

  async function sendNotification() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = await api.notify(ref, notifyType);
      await load();
      setNotice(
        result.status === 'sent'
          ? 'Notification sent.'
          : `Notification not sent: ${result.detail}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the notification.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <div className="stack">
        <div className="alert alert--error">
          <Icon name="close" size={16} />
          <span>{error}</span>
        </div>
        <Link className="link-arrow" to="/admin/orders">
          ← Back to orders
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading-block">
        <span className="spinner" /> Loading order…
      </div>
    );
  }

  const { order, files } = data;
  const artwork = files.filter((file) => file.kind === 'artwork');
  const delivery = files.filter((file) => file.kind === 'delivery');

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <div className="spread">
        <div>
          <Link className="link-arrow" to="/admin/orders">
            ← Orders
          </Link>
          <h1 style={{ margin: '.4rem 0 0' }} className="mono">
            {order.ref}
          </h1>
          <div className="row" style={{ gap: '.5rem', marginTop: '.5rem' }}>
            <span className={`badge ${statusTone(order.status)}`}>{statusLabel(order.status)}</span>
            <span className="badge tone-navy">{paymentLabel(order.paymentStatus)}</span>
            <span className="small muted">Received {formatDate(order.createdAt)}</span>
          </div>
        </div>
        <a
          className="btn btn--wa btn--sm"
          href={`https://wa.me/${order.whatsapp.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          <Icon name="whatsapp" size={16} /> WhatsApp customer
        </a>
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

      <div className="grid grid-2">
        <div className="admin-panel">
          <h3>Customer</h3>
          <dl className="detail-list">
            <dt>Name</dt>
            <dd>{order.customerName}</dd>
            <dt>Email</dt>
            <dd className="mono small">{order.customerEmail}</dd>
            <dt>WhatsApp</dt>
            <dd className="mono small">{order.whatsapp}</dd>
            <dt>Country</dt>
            <dd>{order.country || '—'}</dd>
            <dt>Marketing consent</dt>
            <dd>{order.marketingOptIn ? 'Given' : 'Not given'}</dd>
          </dl>
        </div>

        <div className="admin-panel">
          <h3>Design brief</h3>
          <dl className="detail-list">
            <dt>Service</dt>
            <dd>{order.service}</dd>
            <dt>Size</dt>
            <dd>{order.designSize || '—'}</dd>
            <dt>Preferred format</dt>
            <dd>{order.preferredFormat || '—'}</dd>
            <dt>Budget</dt>
            <dd>{order.budget || '—'}</dd>
          </dl>
          <p className="small" style={{ whiteSpace: 'pre-wrap' }}>
            {order.details}
          </p>
        </div>
      </div>

      <div className="admin-panel">
        <h3>Workflow, quotation and payment</h3>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="status">
              Order status
            </label>
            <select id="status" className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              {Object.keys(statusTone('')).length ? null : null}
              {['NEW', 'UNDER_REVIEW', 'QUOTATION_SENT', 'AWAITING_PAYMENT', 'PAYMENT_VERIFIED', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED', 'DELIVERED', 'CANCELLED'].map(
                (value) => (
                  <option key={value} value={value}>
                    {statusLabel(value)}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="payment">
              Payment status
            </label>
            <select id="payment" className="select" value={payment} onChange={(event) => setPayment(event.target.value)}>
              {['UNPAID', 'AWAITING_PAYMENT', 'PAYMENT_VERIFIED', 'REFUNDED'].map((value) => (
                <option key={value} value={value}>
                  {paymentLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="quote">
              Quoted price
            </label>
            <input
              id="quote"
              className="input"
              value={quoteAmount}
              onChange={(event) => setQuoteAmount(event.target.value)}
              inputMode="decimal"
              placeholder="35.00"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="currency">
              Currency
            </label>
            <input
              id="currency"
              className="input"
              value={quoteCurrency}
              onChange={(event) => setQuoteCurrency(event.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="status-note">
            Note for this status change (optional)
          </label>
          <input
            id="status-note"
            className="input"
            value={statusNote}
            onChange={(event) => setStatusNote(event.target.value)}
            placeholder="Quotation sent on WhatsApp, awaiting transfer"
          />
        </div>
        <button className="btn btn--navy" type="button" onClick={() => void saveOrder()} disabled={busy}>
          {busy ? 'Saving…' : 'Save order'}
        </button>
      </div>

      <div className="grid grid-2">
        <div className="admin-panel">
          <h3>Customer artwork</h3>
          {artwork.length === 0 ? (
            <p className="small muted">No artwork was uploaded with this order.</p>
          ) : (
            <ul className="file-list">
              {artwork.map((file) => (
                <li key={file.id}>
                  <span>
                    {file.originalName} <span className="small muted">({Math.round(file.size / 1024)} KB)</span>
                  </span>
                  <a className="link-arrow" href={file.downloadUrl}>
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-panel">
          <h3>Final delivery files</h3>
          {delivery.length === 0 ? (
            <p className="small muted">No delivery files uploaded yet.</p>
          ) : (
            <ul className="file-list">
              {delivery.map((file) => (
                <li key={file.id}>
                  <span>
                    {file.originalName} <span className="small muted">({Math.round(file.size / 1024)} KB)</span>
                  </span>
                  <span className="row" style={{ gap: '.5rem' }}>
                    <a className="link-arrow" href={file.downloadUrl}>
                      Download
                    </a>
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => void deleteFile(file.id)}>
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <label className="btn btn--outline btn--sm" style={{ cursor: 'pointer', marginTop: '.7rem' }}>
            Upload EMB / DST files
            <input
              type="file"
              multiple
              hidden
              accept=".dst,.pes,.jef,.vp3,.emb,.exp,.png,.jpg,.jpeg,.pdf,.zip"
              onChange={(event) => void uploadFiles(event.target.files)}
            />
          </label>
          <p className="small muted" style={{ marginBottom: 0, marginTop: '.5rem' }}>
            Files are stored privately and served only through this authenticated dashboard.
          </p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="admin-panel">
          <h3>Internal notes</h3>
          <p className="small" style={{ whiteSpace: 'pre-wrap' }}>
            {order.adminNotes || 'No notes yet.'}
          </p>
          <div className="field">
            <label className="label" htmlFor="note">
              Add a note (never shown to the customer)
            </label>
            <textarea
              id="note"
              className="textarea"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <button className="btn btn--outline btn--sm" type="button" onClick={() => void addNote()} disabled={busy}>
            Add note
          </button>
        </div>

        <div className="admin-panel">
          <h3>Notifications</h3>
          <div className="field">
            <label className="label" htmlFor="notify">
              Notification type
            </label>
            <select
              id="notify"
              className="select"
              value={notifyType}
              onChange={(event) => setNotifyType(event.target.value)}
            >
              {NOTIFY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn--outline btn--sm" type="button" onClick={() => void sendNotification()} disabled={busy}>
            Send notification
          </button>
          <div className="divider" />
          {data.notifications.length === 0 ? (
            <p className="small muted" style={{ marginBottom: 0 }}>
              No notification attempts for this order.
            </p>
          ) : (
            <ul className="stack" style={{ gap: '.4rem', listStyle: 'none', padding: 0, margin: 0 }}>
              {data.notifications.map((entry) => (
                <li key={entry.id} className="small">
                  <span
                    className={`badge ${
                      entry.status === 'sent' ? 'tone-success' : entry.status === 'failed' ? 'tone-danger' : 'tone-muted'
                    }`}
                  >
                    {entry.status}
                  </span>{' '}
                  {entry.type} · {formatDate(entry.created_at)}
                  {entry.detail ? <div className="muted">{entry.detail}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="admin-panel">
        <h3>Status history</h3>
        <ol className="timeline">
          {order.history.map((event, index) => (
            <li key={`${event.status}-${index}`}>
              <span className={`badge ${statusTone(event.status)}`}>{statusLabel(event.status)}</span>{' '}
              <span className="small muted">{formatDate(event.at)}</span>
              {event.note ? <div className="small">{event.note}</div> : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
