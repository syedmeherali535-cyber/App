/**
 * Public API: services, portfolio, testimonials, settings and order submission.
 * No customer data is ever returned from these endpoints.
 */
import express from 'express';
import multer from 'multer';
import { ARTWORK_MIME, MAX_UPLOAD_BYTES, resolveStored, sniffMime, storeBuffer } from '../uploads.js';
import { publicSettings } from '../db.js';
import { sendNotification } from '../notify.js';
import { asyncH, cleanString, makeOrderRef, validateOrderInput } from '../util.js';

const ORDER_RATE_LIMIT = 10;
const ORDER_RATE_WINDOW_MS = 60 * 60 * 1000;

export default function createPublicRouter({ db, dirs, env }) {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 25 },
  });

  const attempts = new Map();
  function allowOrder(ip) {
    const now = Date.now();
    const entry = attempts.get(ip) || { count: 0, resetAt: now + ORDER_RATE_WINDOW_MS };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + ORDER_RATE_WINDOW_MS;
    }
    entry.count += 1;
    attempts.set(ip, entry);
    return entry.count <= ORDER_RATE_LIMIT;
  }

  router.get('/services', (req, res) => {
    const rows = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort_order ASC, id ASC').all();
    res.json({
      services: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        description: row.description,
        features: JSON.parse(row.features || '[]'),
        icon: row.icon,
      })),
    });
  });

  router.get('/portfolio', (req, res) => {
    const category = cleanString(req.query.category, 60);
    const rows = category
      ? db
          .prepare('SELECT * FROM portfolio_items WHERE category = ? ORDER BY sort_order ASC, id ASC')
          .all(category)
      : db.prepare('SELECT * FROM portfolio_items ORDER BY sort_order ASC, id ASC').all();
    res.json({
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        description: row.description,
        altText: row.alt_text,
        featured: Boolean(row.featured),
        isPlaceholder: Boolean(row.is_placeholder),
        imageUrl: `/api/portfolio/${row.id}/image`,
      })),
      categories: db
        .prepare('SELECT category, COUNT(*) AS count FROM portfolio_items GROUP BY category ORDER BY category')
        .all(),
    });
  });

  router.get('/portfolio/:id/image', (req, res) => {
    const row = db.prepare('SELECT image_file, image_mime FROM portfolio_items WHERE id = ?').get(req.params.id);
    if (!row || !row.image_file) return res.status(404).json({ error: 'Image not found.' });
    const file = resolveStored(dirs.portfolio, row.image_file);
    if (!file) return res.status(404).json({ error: 'Image not found.' });
    res.setHeader('Content-Type', row.image_mime || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(file);
  });

  router.get('/testimonials', (req, res) => {
    const settings = publicSettings(db);
    if (!settings.testimonials_enabled) return res.json({ testimonials: [] });
    const rows = db
      .prepare('SELECT id, name, location, service, quote FROM testimonials WHERE published = 1 ORDER BY id DESC')
      .all();
    res.json({ testimonials: rows });
  });

  router.get('/settings', (req, res) => {
    res.json(publicSettings(db));
  });

  router.post(
    '/orders',
    upload.single('artwork'),
    asyncH(async (req, res) => {
      if (!allowOrder(req.ip)) {
        return res.status(429).json({ error: 'Too many order submissions from this connection. Please try again later.' });
      }

      const { errors, value } = validateOrderInput(req.body);

      let artwork = null;
      if (req.file) {
        const sniffed = sniffMime(req.file.buffer);
        if (!sniffed || !ARTWORK_MIME[sniffed]) {
          errors.artwork = 'Artwork must be a PNG, JPG, JPEG or PDF file.';
        } else {
          artwork = { mime: sniffed, ext: ARTWORK_MIME[sniffed], original: req.file.originalname };
        }
      }

      if (Object.keys(errors).length > 0) {
        return res.status(422).json({ error: 'Please correct the highlighted fields.', fields: errors });
      }

      const settings = publicSettings(db);
      const ref = makeOrderRef(db);
      const history = [
        { status: 'NEW', at: new Date().toISOString(), note: 'Order submitted by customer.' },
      ];

      db.prepare(
        `INSERT INTO orders (ref, customer_name, customer_email, whatsapp, country, service, design_size, details,
           preferred_format, budget, marketing_opt_in, status, payment_status, quote_currency, status_history)
         VALUES (@ref, @customer_name, @customer_email, @whatsapp, @country, @service, @design_size, @details,
           @preferred_format, @budget, @marketing_opt_in, 'NEW', 'UNPAID', @quote_currency, @status_history)`,
      ).run({
        ...value,
        ref,
        quote_currency: settings.currency || 'USD',
        status_history: JSON.stringify(history),
      });

      if (artwork) {
        const stored = storeBuffer(dirs.artwork, req.file.buffer, artwork.ext);
        db.prepare(
          `INSERT INTO order_files (order_ref, kind, stored_name, original_name, mime, size)
           VALUES (?, 'artwork', ?, ?, ?, ?)`,
        ).run(ref, stored, cleanString(artwork.original, 180) || `artwork.${artwork.ext}`, artwork.mime, req.file.size);
      }

      db.prepare('INSERT OR IGNORE INTO customers (email, name) VALUES (?, ?)').run(
        value.customer_email,
        value.customer_name,
      );

      const order = {
        ref,
        ...value,
        whatsapp_link: settings.whatsapp_link,
        quote_amount: '',
        quote_currency: settings.currency || 'USD',
      };

      const results = [];
      for (const type of ['order-received', 'admin-new-order']) {
        const to = type === 'order-received' ? value.customer_email : env.ADMIN_NOTIFICATION_EMAIL;
        const result = await sendNotification({ env, type, order, to });
        db.prepare(
          'INSERT INTO notifications (order_ref, type, channel, status, detail) VALUES (?, ?, ?, ?, ?)',
        ).run(ref, type, 'email', result.status, result.detail);
        results.push({ type, status: result.status, detail: result.detail });
      }

      return res.status(201).json({
        ref,
        status: 'NEW',
        message: `Your order ${ref} has been received.`,
        notifications: results.map((r) => ({ type: r.type, status: r.status })),
        emailConfigured: results.some((r) => r.status === 'sent'),
      });
    }),
  );

  return router;
}
