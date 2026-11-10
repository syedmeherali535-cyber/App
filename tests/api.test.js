import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'meher-emb-test-'));
const env = {
  ADMIN_PASSWORD: 'test-password-123',
  SESSION_SECRET: 'test-session-secret-value',
  DATABASE_PATH: path.join(tmp, 'test.db'),
  UPLOAD_DIR: path.join(tmp, 'uploads'),
  NODE_ENV: 'test',
};

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('fake-png-payload-for-tests'),
]);

let server;
let base;
let cookie = '';

beforeAll(async () => {
  const { createApp } = await import('../server/app.js');
  const { app } = createApp({ env });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => {
  server?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

function orderForm(overrides = {}, withArtwork = true) {
  const form = new FormData();
  const fields = {
    customer_name: 'Ayesha Khan',
    customer_email: 'ayesha@example.com',
    whatsapp: '+923001234567',
    country: 'Pakistan',
    service: 'Cap Embroidery Digitizing',
    design_size: '2.5 inch front cap',
    details: 'Left chest cap logo, 4 colours, clean satin fill.',
    preferred_format: 'DST',
    budget: '30',
    marketing_opt_in: 'yes',
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  if (withArtwork) form.set('artwork', new Blob([PNG], { type: 'image/png' }), 'logo.png');
  return form;
}

describe('public API', () => {
  it('reports health and serves seeded catalogue data', async () => {
    const health = await fetch(`${base}/api/health`).then((res) => res.json());
    expect(health.ok).toBe(true);
    expect(health.adminConfigured).toBe(true);

    const services = await fetch(`${base}/api/services`).then((res) => res.json());
    expect(services.services.length).toBeGreaterThanOrEqual(6);

    const settings = await fetch(`${base}/api/settings`).then((res) => res.json());
    expect(settings.settings.business_name).toBe('Meher Ali EMB Studio');
    expect(JSON.stringify(settings)).not.toMatch(/password/i);

    const portfolio = await fetch(`${base}/api/portfolio`).then((res) => res.json());
    expect(Array.isArray(portfolio.items)).toBe(true);
  });

  it('rejects an invalid order with field level errors', async () => {
    const res = await fetch(`${base}/api/orders`, {
      method: 'POST',
      body: orderForm({ customer_email: 'not-an-email', details: 'short' }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.fields.customer_email).toBeTruthy();
    expect(body.fields.details).toBeTruthy();
  });

  it('rejects artwork whose content is not an allowed image or PDF', async () => {
    const form = orderForm();
    form.set('artwork', new Blob([Buffer.from('GIF89a-not-allowed')], { type: 'image/png' }), 'fake.png');
    const res = await fetch(`${base}/api/orders`, { method: 'POST', body: form });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.fields.artwork).toBeTruthy();
  });

  it('accepts a valid order, stores private artwork and returns a reference', async () => {
    const res = await fetch(`${base}/api/orders`, { method: 'POST', body: orderForm() });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ref).toMatch(/^ME-\d{4}-[A-Z0-9]{4,}$/);
    expect(body.emailConfigured).toBe(false);
    expect(body.notifications.every((entry) => entry.status === 'skipped')).toBe(true);

    const files = fs.readdirSync(path.join(env.UPLOAD_DIR, 'artwork'));
    expect(files.length).toBe(1);
  });
});

describe('admin protection', () => {
  it('refuses unauthenticated access to admin data and files', async () => {
    for (const route of ['/api/admin/overview', '/api/admin/orders', '/api/admin/customers']) {
      const res = await fetch(`${base}${route}`);
      expect(res.status).toBe(401);
    }
  });

  it('rejects a wrong password and accepts the configured one', async () => {
    const wrong = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'nope' }),
    });
    expect(wrong.status).toBe(401);

    const ok = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
    });
    expect(ok.status).toBe(200);
    const setCookie = ok.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/HttpOnly/i);
    cookie = setCookie.split(';')[0];

    const session = await fetch(`${base}/api/admin/session`, { headers: { Cookie: cookie } });
    expect(session.status).toBe(200);
  });

  it('moves an order through quotation and payment verification, logging history', async () => {
    const list = await fetch(`${base}/api/admin/orders`, { headers: { Cookie: cookie } }).then((res) => res.json());
    expect(list.orders.length).toBe(1);
    const ref = list.orders[0].ref;

    const patch = await fetch(`${base}/api/admin/orders/${ref}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        status: 'QUOTATION_SENT',
        payment_status: 'AWAITING_PAYMENT',
        quote_amount: '35.50',
        quote_currency: 'USD',
        status_note: 'Quotation sent on WhatsApp.',
      }),
    });
    expect(patch.status).toBe(200);
    const patched = await patch.json();
    expect(patched.notifications.some((entry) => entry.status === 'skipped')).toBe(true);

    const note = await fetch(`${base}/api/admin/orders/${ref}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ note: 'Customer asked for a lighter gold thread.' }),
    });
    expect(note.status).toBe(200);

    const detail = await fetch(`${base}/api/admin/orders/${ref}`, { headers: { Cookie: cookie } }).then((res) =>
      res.json(),
    );
    expect(detail.order.status).toBe('QUOTATION_SENT');
    expect(detail.order.quoteAmount).toBe('35.50');
    expect(detail.order.adminNotes).toContain('lighter gold');
    expect(detail.order.history.length).toBeGreaterThanOrEqual(2);
    expect(detail.files.filter((file) => file.kind === 'artwork').length).toBe(1);

    const overview = await fetch(`${base}/api/admin/overview`, { headers: { Cookie: cookie } }).then((res) =>
      res.json(),
    );
    expect(overview.totals.totalOrders).toBe(1);
  });

  it('serves artwork only to an authenticated administrator', async () => {
    const list = await fetch(`${base}/api/admin/orders`, { headers: { Cookie: cookie } }).then((res) => res.json());
    const ref = list.orders[0].ref;
    const detail = await fetch(`${base}/api/admin/orders/${ref}`, { headers: { Cookie: cookie } }).then((res) =>
      res.json(),
    );
    const file = detail.files[0];

    const anonymous = await fetch(`${base}/api/admin/orders/${ref}/files/${file.id}`);
    expect(anonymous.status).toBe(401);

    const authorized = await fetch(`${base}/api/admin/orders/${ref}/files/${file.id}`, {
      headers: { Cookie: cookie },
    });
    expect(authorized.status).toBe(200);
    expect(authorized.headers.get('cache-control')).toMatch(/no-store/i);
    expect(authorized.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('logs out and invalidates the session cookie', async () => {
    await fetch(`${base}/api/admin/logout`, { method: 'POST', headers: { Cookie: cookie } });
    const after = await fetch(`${base}/api/admin/session`, { headers: { Cookie: cookie } });
    expect(after.status).toBe(401);
  });
});
