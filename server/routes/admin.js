/**
 * Admin API. Every route below /login requires a valid signed session cookie,
 * so no customer data or private file is reachable without authentication.
 */
import fs from 'node:fs';
import express from 'express';
import multer from 'multer';
import {
  ARTWORK_MIME,
  MAX_UPLOAD_BYTES,
  PORTFOLIO_MIME,
  deliveryExtension,
  resolveStored,
  safeDownloadName,
  sniffMime,
  storeBuffer,
} from '../uploads.js';
import {
  DEFAULT_SETTINGS,
  DELIVERY_FORMATS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PORTFOLIO_CATEGORIES,
  getSettings,
} from '../db.js';
import { emailConfig, sendNotification } from '../notify.js';
import { asyncH, cleanString, isEmail, parseJson } from '../util.js';

const STATUS_NOTIFICATIONS = {
  QUOTATION_SENT: 'quotation',
  PAYMENT_VERIFIED: 'payment-verified',
  COMPLETED: 'completed',
  DELIVERED: 'delivered',
};

export default function createAdminRouter({ db, dirs, auth, env }) {
  const router = express.Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 5, fields: 25 },
  });

  // Block cross-origin state changes (defence in depth alongside SameSite cookies).
  router.use((req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const origin = req.headers.origin;
    if (!origin) return next();
    try {
      if (new URL(origin).host !== req.headers.host) {
        return res.status(403).json({ error: 'Cross-origin request blocked.' });
      }
    } catch {
      return res.status(403).json({ error: 'Cross-origin request blocked.' });
    }
    return next();
  });

  function orderSummary(row) {
    return {
      ref: row.ref,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      whatsapp: row.whatsapp,
      country: row.country,
      service: row.service,
      designSize: row.design_size,
      details: row.details,
      preferredFormat: row.preferred_format,
      budget: row.budget,
      marketingOptIn: Boolean(row.marketing_opt_in),
      status: row.status,
      paymentStatus: row.payment_status,
      quoteAmount: row.quote_amount,
      quoteCurrency: row.quote_currency,
      adminNotes: row.admin_notes,
      history: parseJson(row.status_history, []),
      fileCount: row.file_count ?? undefined,
    };
  }

  function getOrder(ref) {
    return db.prepare('SELECT * FROM orders WHERE ref = ?').get(ref);
  }

  function logNotification(orderRef, type, result) {
    db.prepare('INSERT INTO notifications (order_ref, type, channel, status, detail) VALUES (?, ?, ?, ?, ?)').run(
      orderRef,
      type,
      'email',
      result.status,
      result.detail,
    );
  }

  // ---------------------------------------------------------------------
  // Session
  // ---------------------------------------------------------------------
  router.post('/login', (req, res) => {
    if (!auth.isConfigured) {
      return res.status(503).json({ error: auth.setupMessage, configured: false });
    }
    if (!auth.rateLimit(req.ip)) {
      return res.status(429).json({ error: 'Too many login attempts. Please wait a few minutes and try again.' });
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!auth.verifyPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    auth.resetRateLimit(req.ip);
    auth.setSessionCookie(req, res, auth.issueToken());
    return res.json({ authenticated: true });
  });

  router.post('/logout', (req, res) => {
    auth.clearSessionCookie(req, res);
    res.json({ authenticated: false });
  });

  router.get('/session', (req, res) => {
    res.json({
      authenticated: Boolean(auth.sessionFromRequest(req)),
      configured: auth.isConfigured,
      setupMessage: auth.setupMessage,
      email: emailConfig(env),
      ephemeralSessionSecret: auth.ephemeralSecret,
      statuses: ORDER_STATUSES,
      paymentStatuses: PAYMENT_STATUSES,
      formats: DELIVERY_FORMATS,
      categories: PORTFOLIO_CATEGORIES,
    });
  });

  router.use(auth.requireAdmin);

  // ---------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------
  router.get('/overview', (req, res) => {
    const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
    for (const row of db.prepare('SELECT status, COUNT(*) AS c FROM orders GROUP BY status').all()) {
      byStatus[row.status] = row.c;
    }
    const total = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
    const pendingPayments = db
      .prepare(
        "SELECT COUNT(*) AS c FROM orders WHERE payment_status IN ('UNPAID','AWAITING_PAYMENT') AND status NOT IN ('CANCELLED','DELIVERED')",
      )
      .get().c;
    const active =
      byStatus.UNDER_REVIEW + byStatus.QUOTATION_SENT + byStatus.PAYMENT_VERIFIED + byStatus.IN_PROGRESS + byStatus.QUALITY_CHECK;
    const completed = byStatus.COMPLETED + byStatus.DELIVERED;

    const recent = db.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 8').all();
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 6').all();

    res.json({
      totals: {
        orders: total,
        newOrders: byStatus.NEW,
        pendingPayments,
        active,
        completed,
        cancelled: byStatus.CANCELLED,
        customers: db.prepare('SELECT COUNT(DISTINCT customer_email) AS c FROM orders').get().c,
        portfolio: db.prepare('SELECT COUNT(*) AS c FROM portfolio_items').get().c,
        services: db.prepare('SELECT COUNT(*) AS c FROM services WHERE active = 1').get().c,
      },
      byStatus,
      recentOrders: recent.map((row) => ({
        ref: row.ref,
        createdAt: row.created_at,
        customerName: row.customer_name,
        service: row.service,
        status: row.status,
        paymentStatus: row.payment_status,
        quoteAmount: row.quote_amount,
        quoteCurrency: row.quote_currency,
      })),
      notifications: notifications.map((row) => ({
        id: row.id,
        orderRef: row.order_ref,
        type: row.type,
        status: row.status,
        detail: row.detail,
        createdAt: row.created_at,
      })),
      email: emailConfig(env),
    });
  });

  // ---------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------
  router.get('/orders', (req, res) => {
    const q = cleanString(req.query.q, 80);
    const status = cleanString(req.query.status, 30).toUpperCase();
    const payment = cleanString(req.query.payment, 30).toUpperCase();
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const where = [];
    const params = {};
    if (q) {
      where.push(
        '(LOWER(o.ref) LIKE @q OR LOWER(o.customer_name) LIKE @q OR LOWER(o.customer_email) LIKE @q OR o.whatsapp LIKE @q OR LOWER(o.service) LIKE @q)',
      );
      params.q = `%${q.toLowerCase()}%`;
    }
    if (status && ORDER_STATUSES.includes(status)) {
      where.push('o.status = @status');
      params.status = status;
    }
    if (payment && PAYMENT_STATUSES.includes(payment)) {
      where.push('o.payment_status = @payment');
      params.payment = payment;
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = db
      .prepare(
        `SELECT o.*, (SELECT COUNT(*) FROM order_files f WHERE f.order_ref = o.ref) AS file_count
         FROM orders o ${clause}
         ORDER BY o.created_at DESC, o.id DESC LIMIT @limit OFFSET @offset`,
      )
      .all({ ...params, limit, offset });
    const total = db.prepare(`SELECT COUNT(*) AS c FROM orders o ${clause}`).get(params).c;

    res.json({ orders: rows.map(orderSummary), total, limit, offset });
  });

  router.get('/orders/:ref', (req, res) => {
    const row = getOrder(req.params.ref);
    if (!row) return res.status(404).json({ error: 'Order not found.' });
    const files = db.prepare('SELECT * FROM order_files WHERE order_ref = ? ORDER BY id ASC').all(row.ref);
    const notifications = db.prepare('SELECT * FROM notifications WHERE order_ref = ? ORDER BY id DESC').all(row.ref);
    res.json({
      order: orderSummary(row),
      files: files.map((file) => ({
        id: file.id,
        kind: file.kind,
        originalName: file.original_name,
        mime: file.mime,
        size: file.size,
        createdAt: file.created_at,
        downloadUrl: `/api/admin/orders/${encodeURIComponent(row.ref)}/files/${file.id}`,
      })),
      notifications,
    });
  });

  router.patch(
    '/orders/:ref',
    asyncH(async (req, res) => {
      const row = getOrder(req.params.ref);
      if (!row) return res.status(404).json({ error: 'Order not found.' });
      const body = req.body || {};
      const updates = [];
      const params = { ref: row.ref };
      const errors = {};
      let statusChanged = false;

      if ('status' in body) {
        const status = cleanString(body.status, 30).toUpperCase();
        if (!ORDER_STATUSES.includes(status)) errors.status = 'Unknown order status.';
        else {
          updates.push('status = @status');
          params.status = status;
          statusChanged = status !== row.status;
        }
      }
      if ('payment_status' in body) {
        const payment = cleanString(body.payment_status, 30).toUpperCase();
        if (!PAYMENT_STATUSES.includes(payment)) errors.payment_status = 'Unknown payment status.';
        else {
          updates.push('payment_status = @payment_status');
          params.payment_status = payment;
        }
      }
      if ('quote_amount' in body) {
        const amount = cleanString(body.quote_amount, 24);
        if (amount && !/^\d{1,9}([.,]\d{1,2})?$/.test(amount)) {
          errors.quote_amount = 'Enter a price such as 25 or 25.50.';
        } else {
          updates.push('quote_amount = @quote_amount');
          params.quote_amount = amount;
        }
      }
      if ('quote_currency' in body) {
        const currency = cleanString(body.quote_currency, 3).toUpperCase();
        if (!/^[A-Z]{3}$/.test(currency)) errors.quote_currency = 'Use a 3-letter currency code.';
        else {
          updates.push('quote_currency = @quote_currency');
          params.quote_currency = currency;
        }
      }
      if ('admin_notes' in body) {
        updates.push('admin_notes = @admin_notes');
        params.admin_notes = cleanString(body.admin_notes, 4000);
      }

      if (Object.keys(errors).length) return res.status(422).json({ error: 'Invalid update.', fields: errors });
      if (!updates.length) return res.status(400).json({ error: 'No supported fields were provided.' });

      if (statusChanged) {
        const history = parseJson(row.status_history, []);
        history.push({
          status: params.status,
          at: new Date().toISOString(),
          note: cleanString(body.status_note, 200) || 'Status updated by administrator.',
        });
        updates.push('status_history = @status_history');
        params.status_history = JSON.stringify(history);
      }

      db.prepare(`UPDATE orders SET ${updates.join(', ')}, updated_at = datetime('now') WHERE ref = @ref`).run(params);

      const notifications = [];
      const notifyType = statusChanged ? STATUS_NOTIFICATIONS[params.status] : null;
      if (notifyType) {
        const updated = getOrder(row.ref);
        const settings = getSettings(db);
        const result = await sendNotification({
          env,
          type: notifyType,
          order: {
            ...updated,
            customer_name: updated.customer_name,
            quote_amount: updated.quote_amount,
            quote_currency: updated.quote_currency,
            whatsapp_link: settings.whatsapp_link,
          },
          to: updated.customer_email,
        });
        logNotification(row.ref, notifyType, result);
        notifications.push({ type: notifyType, status: result.status, detail: result.detail });
      }

      const updated = getOrder(row.ref);
      res.json({ order: orderSummary(updated), notifications });
    }),
  );

  router.post('/orders/:ref/notes', (req, res) => {
    const row = getOrder(req.params.ref);
    if (!row) return res.status(404).json({ error: 'Order not found.' });
    const note = cleanString(req.body?.note, 1000);
    if (note.length < 2) return res.status(422).json({ error: 'Enter a note first.' });
    const stamped = `[${new Date().toISOString()}] ${note}`;
    const combined = row.admin_notes ? `${row.admin_notes}\n${stamped}` : stamped;
    db.prepare("UPDATE orders SET admin_notes = ?, updated_at = datetime('now') WHERE ref = ?").run(
      combined.slice(-4000),
      row.ref,
    );
    res.json({ adminNotes: combined.slice(-4000) });
  });

  router.post('/orders/:ref/notify', asyncH(async (req, res) => {
    const row = getOrder(req.params.ref);
    if (!row) return res.status(404).json({ error: 'Order not found.' });
    const type = cleanString(req.body?.type, 40);
    const settings = getSettings(db);
    const result = await sendNotification({
      env,
      type,
      order: { ...row, whatsapp_link: settings.whatsapp_link },
      to: row.customer_email,
    });
    logNotification(row.ref, type || 'unknown', result);
    res.json({ type, ...result });
  }));

  // ---------------------------------------------------------------------
  // Files (private)
  // ---------------------------------------------------------------------
  router.post(
    '/orders/:ref/files',
    upload.array('files', 5),
    (req, res) => {
      const row = getOrder(req.params.ref);
      if (!row) return res.status(404).json({ error: 'Order not found.' });
      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length) return res.status(400).json({ error: 'Choose at least one file to upload.' });

      const stored = [];
      for (const file of files) {
        const ext = deliveryExtension(file.originalname);
        if (!ext) {
          return res.status(422).json({
            error: `"${file.originalname}" is not an accepted delivery file. Use DST, PES, JEF, VP3, EMB, ZIP, PDF, PNG or JPG.`,
          });
        }
        const sniffed = sniffMime(file.buffer);
        if (['png', 'jpg', 'jpeg', 'pdf'].includes(ext)) {
          const expected = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';
          if (sniffed !== expected) {
            return res.status(422).json({ error: `"${file.originalname}" does not match its file type.` });
          }
        }
        stored.push({ file, ext });
      }

      const insert = db.prepare(
        `INSERT INTO order_files (order_ref, kind, stored_name, original_name, mime, size)
         VALUES (?, 'delivery', ?, ?, ?, ?)`,
      );
      const created = [];
      for (const { file, ext } of stored) {
        const name = storeBuffer(dirs.delivery, file.buffer, ext);
        const info = insert.run(row.ref, name, cleanString(file.originalname, 180), file.mimetype || 'application/octet-stream', file.size);
        created.push({ id: Number(info.lastInsertRowid), originalName: file.originalname, size: file.size });
      }
      db.prepare("UPDATE orders SET updated_at = datetime('now') WHERE ref = ?").run(row.ref);
      res.status(201).json({ files: created });
    },
  );

  router.get('/orders/:ref/files/:id', (req, res) => {
    const row = getOrder(req.params.ref);
    if (!row) return res.status(404).json({ error: 'Order not found.' });
    const file = db
      .prepare('SELECT * FROM order_files WHERE id = ? AND order_ref = ?')
      .get(req.params.id, row.ref);
    if (!file) return res.status(404).json({ error: 'File not found.' });
    const dir = file.kind === 'artwork' ? dirs.artwork : dirs.delivery;
    const full = resolveStored(dir, file.stored_name);
    if (!full) return res.status(404).json({ error: 'File is no longer available.' });
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Type', file.mime || 'application/octet-stream');
    res.download(full, safeDownloadName(file.original_name));
  });

  router.delete('/orders/:ref/files/:id', (req, res) => {
    const row = getOrder(req.params.ref);
    if (!row) return res.status(404).json({ error: 'Order not found.' });
    const file = db.prepare('SELECT * FROM order_files WHERE id = ? AND order_ref = ?').get(req.params.id, row.ref);
    if (!file) return res.status(404).json({ error: 'File not found.' });
    const dir = file.kind === 'artwork' ? dirs.artwork : dirs.delivery;
    const full = resolveStored(dir, file.stored_name);
    if (full) {
      try {
        fs.unlinkSync(full);
      } catch {
        /* file already gone */
      }
    }
    db.prepare('DELETE FROM order_files WHERE id = ?').run(file.id);
    res.json({ deleted: file.id });
  });

  // ---------------------------------------------------------------------
  // Customers (derived from orders)
  // ---------------------------------------------------------------------
  router.get('/customers', (req, res) => {
    const rows = db
      .prepare(
        `SELECT customer_email AS email, MAX(customer_name) AS name, COUNT(*) AS orders,
                MAX(created_at) AS lastOrder,
                SUM(CASE WHEN status IN ('COMPLETED','DELIVERED') THEN 1 ELSE 0 END) AS completed
         FROM orders GROUP BY customer_email ORDER BY lastOrder DESC`,
      )
      .all();
    res.json({ customers: rows });
  });

  // ---------------------------------------------------------------------
  // Portfolio management
  // ---------------------------------------------------------------------
  router.get('/portfolio', (req, res) => {
    const rows = db.prepare('SELECT * FROM portfolio_items ORDER BY sort_order ASC, id ASC').all();
    res.json({
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        description: row.description,
        altText: row.alt_text,
        featured: Boolean(row.featured),
        isPlaceholder: Boolean(row.is_placeholder),
        sortOrder: row.sort_order,
        imageUrl: row.image_file ? `/api/portfolio/${row.id}/image` : null,
      })),
    });
  });

  router.post('/portfolio', upload.single('image'), (req, res) => {
    const title = cleanString(req.body?.title, 120);
    const category = cleanString(req.body?.category, 60);
    if (title.length < 2) return res.status(422).json({ error: 'Give the design a title.' });
    if (!PORTFOLIO_CATEGORIES.includes(category)) {
      return res.status(422).json({ error: `Choose a category: ${PORTFOLIO_CATEGORIES.join(', ')}.` });
    }
    let image = null;
    if (req.file) {
      const sniffed = sniffMime(req.file.buffer);
      if (!sniffed || !PORTFOLIO_MIME[sniffed]) {
        return res.status(422).json({ error: 'Portfolio images must be PNG, JPG or WEBP.' });
      }
      image = { mime: sniffed, ext: PORTFOLIO_MIME[sniffed] };
    }
    const stored = image ? storeBuffer(dirs.portfolio, req.file.buffer, image.ext) : null;
    const info = db
      .prepare(
        `INSERT INTO portfolio_items (title, category, description, alt_text, image_file, image_mime, is_placeholder, featured, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(
        title,
        category,
        cleanString(req.body?.description, 400),
        cleanString(req.body?.alt_text, 200) || `${title} — embroidered ${category.toLowerCase()} design by Meher Ali EMB Studio.`,
        stored,
        image?.mime ?? null,
        req.body?.featured === 'true' ? 1 : 0,
        Number(req.body?.sort_order) || 0,
      );
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  });

  router.post('/portfolio/:id/image', upload.single('image'), (req, res) => {
    const row = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Portfolio item not found.' });
    if (!req.file) return res.status(400).json({ error: 'Choose an image to upload.' });
    const sniffed = sniffMime(req.file.buffer);
    if (!sniffed || !PORTFOLIO_MIME[sniffed]) {
      return res.status(422).json({ error: 'Portfolio images must be PNG, JPG or WEBP.' });
    }
    const stored = storeBuffer(dirs.portfolio, req.file.buffer, PORTFOLIO_MIME[sniffed]);
    db.prepare('UPDATE portfolio_items SET image_file = ?, image_mime = ?, is_placeholder = 0 WHERE id = ?').run(
      stored,
      sniffed,
      row.id,
    );
    res.json({ id: row.id, imageUrl: `/api/portfolio/${row.id}/image` });
  });

  router.patch('/portfolio/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Portfolio item not found.' });
    const updates = [];
    const params = { id: row.id };
    const body = req.body || {};
    if ('title' in body) {
      const title = cleanString(body.title, 120);
      if (title.length < 2) return res.status(422).json({ error: 'Title is too short.' });
      updates.push('title = @title');
      params.title = title;
    }
    if ('category' in body) {
      const category = cleanString(body.category, 60);
      if (!PORTFOLIO_CATEGORIES.includes(category)) return res.status(422).json({ error: 'Unknown category.' });
      updates.push('category = @category');
      params.category = category;
    }
    if ('description' in body) {
      updates.push('description = @description');
      params.description = cleanString(body.description, 400);
    }
    if ('alt_text' in body) {
      updates.push('alt_text = @alt_text');
      params.alt_text = cleanString(body.alt_text, 200);
    }
    if ('featured' in body) {
      updates.push('featured = @featured');
      params.featured = body.featured ? 1 : 0;
    }
    if ('sort_order' in body) {
      updates.push('sort_order = @sort_order');
      params.sort_order = Number(body.sort_order) || 0;
    }
    if (!updates.length) return res.status(400).json({ error: 'No supported fields were provided.' });
    db.prepare(`UPDATE portfolio_items SET ${updates.join(', ')} WHERE id = @id`).run(params);
    res.json({ id: row.id });
  });

  router.delete('/portfolio/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Portfolio item not found.' });
    db.prepare('DELETE FROM portfolio_items WHERE id = ?').run(row.id);
    res.json({ deleted: row.id });
  });

  // ---------------------------------------------------------------------
  // Services management
  // ---------------------------------------------------------------------
  const serviceFields = (body) => {
    const out = {};
    if ('title' in body) out.title = cleanString(body.title, 120);
    if ('summary' in body) out.summary = cleanString(body.summary, 300);
    if ('description' in body) out.description = cleanString(body.description, 2000);
    if ('icon' in body) out.icon = cleanString(body.icon, 30) || 'spool';
    if ('sort_order' in body) out.sort_order = Number(body.sort_order) || 0;
    if ('active' in body) out.active = body.active ? 1 : 0;
    if ('features' in body) {
      const list = Array.isArray(body.features)
        ? body.features
        : String(body.features || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
      out.features = JSON.stringify(list.slice(0, 12).map((item) => cleanString(item, 80)));
    }
    return out;
  };

  router.get('/services', (req, res) => {
    const rows = db.prepare('SELECT * FROM services ORDER BY sort_order ASC, id ASC').all();
    res.json({
      services: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        description: row.description,
        features: JSON.parse(row.features || '[]'),
        icon: row.icon,
        active: Boolean(row.active),
        sortOrder: row.sort_order,
      })),
    });
  });

  router.post('/services', (req, res) => {
    const fields = serviceFields(req.body || {});
    if (!fields.title || fields.title.length < 3) return res.status(422).json({ error: 'Service title is required.' });
    const slugBase =
      fields.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'service';
    let slug = slugBase;
    let n = 1;
    while (db.prepare('SELECT 1 FROM services WHERE slug = ?').get(slug)) slug = `${slugBase}-${n++}`;
    const info = db
      .prepare(
        `INSERT INTO services (slug, title, summary, description, features, icon, sort_order, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        slug,
        fields.title,
        fields.summary || '',
        fields.description || '',
        fields.features || '[]',
        fields.icon || 'spool',
        fields.sort_order || 0,
        fields.active === undefined ? 1 : fields.active,
      );
    res.status(201).json({ id: Number(info.lastInsertRowid), slug });
  });

  router.patch('/services/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Service not found.' });
    const fields = serviceFields(req.body || {});
    const keys = Object.keys(fields);
    if (!keys.length) return res.status(400).json({ error: 'No supported fields were provided.' });
    if (fields.title !== undefined && fields.title.length < 3) {
      return res.status(422).json({ error: 'Service title is too short.' });
    }
    const set = keys.map((key) => `${key} = @${key}`).join(', ');
    db.prepare(`UPDATE services SET ${set}, updated_at = datetime('now') WHERE id = @id`).run({ ...fields, id: row.id });
    res.json({ id: row.id });
  });

  router.delete('/services/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Service not found.' });
    db.prepare('DELETE FROM services WHERE id = ?').run(row.id);
    res.json({ deleted: row.id });
  });

  // ---------------------------------------------------------------------
  // Testimonials (only real ones the studio adds are ever published)
  // ---------------------------------------------------------------------
  router.get('/testimonials', (req, res) => {
    res.json({ testimonials: db.prepare('SELECT * FROM testimonials ORDER BY id DESC').all() });
  });

  router.post('/testimonials', (req, res) => {
    const name = cleanString(req.body?.name, 80);
    const quote = cleanString(req.body?.quote, 600);
    if (name.length < 2 || quote.length < 10) {
      return res.status(422).json({ error: 'A customer name and a real testimonial (10+ characters) are required.' });
    }
    const info = db
      .prepare('INSERT INTO testimonials (name, location, service, quote, published) VALUES (?, ?, ?, ?, ?)')
      .run(
        name,
        cleanString(req.body?.location, 80),
        cleanString(req.body?.service, 80),
        quote,
        req.body?.published ? 1 : 0,
      );
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  });

  router.patch('/testimonials/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Testimonial not found.' });
    db.prepare('UPDATE testimonials SET published = ? WHERE id = ?').run(req.body?.published ? 1 : 0, row.id);
    res.json({ id: row.id });
  });

  router.delete('/testimonials/:id', (req, res) => {
    db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);
    res.json({ deleted: Number(req.params.id) });
  });

  // ---------------------------------------------------------------------
  // Website settings
  // ---------------------------------------------------------------------
  router.get('/settings', (req, res) => {
    res.json({ settings: getSettings(db), email: emailConfig(env), defaults: DEFAULT_SETTINGS });
  });

  router.put('/settings', (req, res) => {
    const body = req.body || {};
    const allowed = Object.keys(DEFAULT_SETTINGS);
    const update = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    );
    const written = [];
    const errors = {};
    for (const key of allowed) {
      if (!(key in body)) continue;
      const value = cleanString(body[key], key === 'order_notice' ? 600 : 300);
      if (key === 'email' && !isEmail(value)) {
        errors.email = 'Enter a valid business email address.';
        continue;
      }
      if ((key === 'whatsapp_link' || key === 'website' || key === 'pinterest') && !/^https?:\/\//.test(value)) {
        errors[key] = 'Enter a full URL starting with http:// or https://';
        continue;
      }
      update.run(key, value);
      written.push(key);
    }
    if (Object.keys(errors).length) return res.status(422).json({ error: 'Invalid settings.', fields: errors });
    res.json({ updated: written, settings: getSettings(db) });
  });

  router.get('/notifications', (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    res.json({
      notifications: db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT ?').all(limit),
      email: emailConfig(env),
    });
  });

  return router;
}
