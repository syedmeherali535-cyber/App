import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { api } from '../../lib/api';
import { formatDate, paymentLabel, statusLabel, statusTone } from '../../lib/format';
import { useAsync, useDocumentTitle } from '../../lib/hooks';

export default function AdminOverview() {
  useDocumentTitle('Overview — Meher EMB Admin');
  const overview = useAsync(() => api.overview(), 'admin-overview');

  if (overview.loading) {
    return (
      <div className="loading-block">
        <span className="spinner" /> Loading dashboard…
      </div>
    );
  }

  if (overview.error || !overview.data) {
    return (
      <div className="alert alert--error">
        <Icon name="close" size={16} />
        <span>{overview.error || 'Dashboard data is unavailable.'}</span>
      </div>
    );
  }

  const { totals, byStatus, recentOrders, notifications, email } = overview.data;

  const stats = [
    { label: 'Total Orders', value: totals.orders, hint: 'All time' },
    { label: 'New Orders', value: totals.newOrders, hint: 'Awaiting review' },
    { label: 'Pending Payments', value: totals.pendingPayments, hint: 'Quoted, not verified' },
    { label: 'Active Orders', value: totals.active, hint: 'In production' },
    { label: 'Completed Orders', value: totals.completed, hint: 'Delivered / completed' },
    { label: 'Customers', value: totals.customers, hint: 'Unique emails' },
  ];

  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <div className="spread">
        <div>
          <span className="eyebrow">Overview</span>
          <h1 style={{ marginTop: '.3rem' }}>Studio dashboard</h1>
        </div>
        <Link className="btn btn--navy btn--sm" to="/admin/orders">
          Manage orders
        </Link>
      </div>

      <div className="grid grid-3">
        {stats.map((stat) => (
          <div className="stat" key={stat.label}>
            <span className="stat__label">{stat.label}</span>
            <span className="stat__value">{stat.value}</span>
            <span className="stat__hint">{stat.hint}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <div className="admin-panel">
          <h3>Orders by status</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byStatus).map(([status, count]) => (
                  <tr key={status}>
                    <td>
                      <span className={`badge ${statusTone(status)}`}>{statusLabel(status)}</span>
                    </td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-panel">
          <h3>Email notifications</h3>
          {email.configured ? (
            <div className="alert alert--success">
              <Icon name="mail" size={16} />
              <span>
                Provider: <strong>{email.provider}</strong> · From {email.from}
              </span>
            </div>
          ) : (
            <div className="alert alert--warn">
              <Icon name="mail" size={16} />
              <span>{email.message}</span>
            </div>
          )}
          <p className="small muted">
            Notifications are only recorded as “sent” when the provider accepts them. Nothing is queued while
            no provider is configured.
          </p>
          <div className="divider" />
          <h3 style={{ fontSize: '1.05rem' }}>Recent notification attempts</h3>
          {notifications.length === 0 ? (
            <p className="small muted" style={{ marginBottom: 0 }}>
              No notification attempts yet.
            </p>
          ) : (
            <ul className="stack" style={{ gap: '.5rem', paddingLeft: 0, listStyle: 'none', margin: 0 }}>
              {notifications.slice(0, 6).map((entry) => (
                <li key={entry.id} className="small">
                  <span className={`badge ${entry.status === 'sent' ? 'tone-success' : entry.status === 'failed' ? 'tone-danger' : 'tone-muted'}`}>
                    {entry.status}
                  </span>{' '}
                  <span className="mono">{entry.orderRef}</span> · {entry.type} · {formatDate(entry.createdAt)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="admin-panel">
        <div className="spread">
          <h3 style={{ margin: 0 }}>Recent orders</h3>
          <Link className="link-arrow" to="/admin/orders">
            All orders <Icon name="arrow" size={14} />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="empty">No orders yet. New submissions from the website appear here.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.ref}>
                    <td>
                      <Link className="mono" to={`/admin/orders/${order.ref}`}>
                        {order.ref}
                      </Link>
                    </td>
                    <td>{order.customerName}</td>
                    <td>{order.service}</td>
                    <td>
                      <span className={`badge ${statusTone(order.status)}`}>{statusLabel(order.status)}</span>
                    </td>
                    <td>{paymentLabel(order.paymentStatus)}</td>
                    <td className="small muted">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
