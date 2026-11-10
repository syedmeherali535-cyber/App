import { Icon } from '../../components/Icon';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useAsync, useDocumentTitle } from '../../lib/hooks';

export default function AdminCustomers() {
  useDocumentTitle('Customers — Meher EMB Admin');
  const customers = useAsync(() => api.customers(), 'admin-customers');

  if (customers.loading) {
    return (
      <div className="loading-block">
        <span className="spinner" /> Loading customers…
      </div>
    );
  }

  if (customers.error) {
    return (
      <div className="alert alert--error">
        <Icon name="close" size={16} />
        <span>{customers.error}</span>
      </div>
    );
  }

  const rows = customers.data?.customers ?? [];

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <div>
        <span className="eyebrow">Customers</span>
        <h1 style={{ marginTop: '.3rem' }}>Customer list</h1>
        <p className="muted small">
          Private data — visible only to the signed-in administrator. Never share or export publicly.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="empty">No customers yet.</div>
      ) : (
        <div className="admin-panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>Completed</th>
                  <th>Last order</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.email}>
                    <td>{row.name}</td>
                    <td className="mono small">{row.email}</td>
                    <td>{row.orders}</td>
                    <td>{row.completed}</td>
                    <td className="small muted">{formatDate(row.lastOrder)}</td>
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
