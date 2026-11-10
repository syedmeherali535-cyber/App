import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { api } from '../../lib/api';
import { formatDate, paymentLabel, statusLabel, statusTone } from '../../lib/format';
import { useAsync, useDocumentTitle } from '../../lib/hooks';
import { STATUS_LABELS, PAYMENT_LABELS } from '../../lib/format';

export default function AdminOrders() {
  useDocumentTitle('Orders — Meher EMB Admin');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const orders = useAsync(
    () => api.orders({ q: debounced || undefined, status: status || undefined, payment: payment || undefined }),
    `${debounced}|${status}|${payment}`,
  );

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <div className="spread">
        <div>
          <span className="eyebrow">Order management</span>
          <h1 style={{ marginTop: '.3rem' }}>Orders</h1>
        </div>
        <span className="badge tone-navy">{orders.data?.total ?? 0} total</span>
      </div>

      <div className="admin-panel">
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Reference, name, email, WhatsApp or service"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="status">
              Status
            </label>
            <select id="status" className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="payment">
              Payment
            </label>
            <select id="payment" className="select" value={payment} onChange={(event) => setPayment(event.target.value)}>
              <option value="">All payments</option>
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {orders.loading ? (
        <div className="loading-block">
          <span className="spinner" /> Loading orders…
        </div>
      ) : orders.error ? (
        <div className="alert alert--error">
          <Icon name="close" size={16} />
          <span>{orders.error}</span>
        </div>
      ) : (orders.data?.orders ?? []).length === 0 ? (
        <div className="empty">No orders match these filters.</div>
      ) : (
        <div className="admin-panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Files</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {(orders.data?.orders ?? []).map((order) => (
                  <tr key={order.ref}>
                    <td>
                      <Link className="mono" to={`/admin/orders/${order.ref}`}>
                        {order.ref}
                      </Link>
                    </td>
                    <td>
                      <div>{order.customerName}</div>
                      <div className="small muted">{order.customerEmail}</div>
                    </td>
                    <td>{order.service}</td>
                    <td>
                      <span className={`badge ${statusTone(order.status)}`}>{statusLabel(order.status)}</span>
                    </td>
                    <td>{paymentLabel(order.paymentStatus)}</td>
                    <td>{order.fileCount ?? 0}</td>
                    <td className="small muted">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
