/**
 * SQLite schema, constants and default content for Meher EMB.
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export const ORDER_STATUSES = [
  'NEW',
  'UNDER_REVIEW',
  'QUOTATION_SENT',
  'AWAITING_PAYMENT',
  'PAYMENT_VERIFIED',
  'IN_PROGRESS',
  'QUALITY_CHECK',
  'COMPLETED',
  'DELIVERED',
  'CANCELLED',
];

export const PAYMENT_STATUSES = ['UNPAID', 'AWAITING_PAYMENT', 'PAYMENT_VERIFIED', 'REFUNDED'];

export const DELIVERY_FORMATS = ['DST', 'PES', 'JEF', 'VP3', 'EMB'];

export const PORTFOLIO_CATEGORIES = [
  'Business Logos',
  'Brand Logos',
  'Cap Designs',
  '3D Puff',
  'Patches & Badges',
  'Small Chest Logos',
  'Detailed Embroidery Designs',
];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  features TEXT NOT NULL DEFAULT '[]',
  icon TEXT NOT NULL DEFAULT 'spool',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  image_file TEXT,
  image_mime TEXT,
  is_placeholder INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL,
  design_size TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  preferred_format TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'NEW',
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  quote_amount TEXT NOT NULL DEFAULT '',
  quote_currency TEXT NOT NULL DEFAULT 'USD',
  admin_notes TEXT NOT NULL DEFAULT '',
  status_history TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE TABLE IF NOT EXISTS order_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_ref TEXT NOT NULL,
  kind TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_files_ref ON order_files (order_ref);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_ref TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  quote TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Reserved for the future customer portal. No public registration is enabled
-- until an authentication/database service is approved and configured.
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const DEFAULT_SETTINGS = {
  business_name: 'Meher Ali EMB Studio',
  app_name: 'Meher EMB',
  tagline: 'Professional Embroidery Digitizing Services',
  email: 'syedmeherali535@gmail.com',
  whatsapp_link: 'https://wa.link/uhskv6',
  website: 'https://meheraliembstudio.blogspot.com/',
  pinterest: 'https://www.pinterest.com/meheraliembstudio/',
  currency: 'USD',
  turnaround: 'Most designs are delivered within 12–24 hours after payment verification.',
  order_notice:
    'Send your artwork and requirements. We reply with a quotation and private payment instructions — usually within a few hours.',
  payment_methods: 'Easypaisa, Bank AL Habib Bank Transfer, Payoneer, AirTM, Skrill',
  testimonials_enabled: '1',
};

const DEFAULT_SERVICES = [
  {
    slug: 'logo-embroidery-digitizing',
    title: 'Logo Embroidery Digitizing',
    summary: 'Clean, production-ready logo files for uniforms, polos and corporate wear.',
    description:
      'We redraw your logo for embroidery so every letter, curve and thin line sews cleanly on the machine. Ideal for company uniforms, workwear, polos and promotional apparel.',
    features: ['Lettering cleanup', 'Small text optimisation', 'Any logo colour count', 'DST, PES, JEF, VP3, EMB'],
    icon: 'logo',
    sort_order: 1,
  },
  {
    slug: 'cap-embroidery-digitizing',
    title: 'Cap Embroidery Digitizing',
    summary: 'Curved-panel files with the correct push/pull compensation for caps.',
    description:
      'Caps distort embroidery on the curve, so cap designs are digitised with dedicated underlay, pull compensation and a proper front-panel layout that stays centred and readable.',
    features: ['Curved panel compensation', 'Cap-frame friendly pathing', 'Structured underlay', 'Front, side and back placements'],
    icon: 'cap',
    sort_order: 2,
  },
  {
    slug: '3d-puff-embroidery',
    title: '3D Puff Embroidery',
    summary: 'Raised foam lettering that keeps crisp edges and even height.',
    description:
      '3D puff designs are built with foam-safe underlay, capped columns and clean travel so the foam lifts evenly without shredding or gaps.',
    features: ['Foam-safe underlay', 'Capped satin columns', 'Tatami and fill blending', 'Hat and flat-hoop versions'],
    icon: 'puff',
    sort_order: 3,
  },
  {
    slug: 'patch-badge-digitizing',
    title: 'Patch & Badge Digitizing',
    summary: 'Sew-on, iron-on and velcro patch files with a finished border.',
    description:
      'Patches need a clean outline, dense edges and a layout that survives trimming. We digitise sew-on, iron-on and velcro-backed badges with a professional finish.',
    features: ['Merrowed-style borders', 'Trim-safe density', 'Laser-cut ready outlines', 'Multi-colour badges'],
    icon: 'patch',
    sort_order: 4,
  },
  {
    slug: 'chest-logo-digitizing',
    title: 'T-Shirt Chest Logo Digitizing',
    summary: 'Small chest placements that stay legible at 2–3.5 inches.',
    description:
      'Small chest logos need simplified detail and adjusted density so the design stays readable on lightweight and stretchy fabric instead of puckering.',
    features: ['Small-size legibility pass', 'Fabric-specific density', 'Lightweight fabric settings', 'Left/right chest positioning'],
    icon: 'shirt',
    sort_order: 5,
  },
  {
    slug: 'custom-embroidery-digitizing',
    title: 'Custom Embroidery Digitizing',
    summary: 'Monograms, jackets, bags, aprons and any custom artwork.',
    description:
      'Send any artwork — sketch, photo, PDF or reference — and we will digitise it for your machine, fabric and placement with a stitch plan that runs cleanly.',
    features: ['Artwork redraw', 'Monogram lettering', 'Any placement or fabric', 'Revisions until it sews right'],
    icon: 'custom',
    sort_order: 6,
  },
];

function seedServices(db) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM services').get().c;
  if (count > 0) return;
  const insert = db.prepare(
    `INSERT INTO services (slug, title, summary, description, features, icon, sort_order, active)
     VALUES (@slug, @title, @summary, @description, @features, @icon, @sort_order, 1)`,
  );
  const run = db.transaction((rows) => {
    for (const row of rows) insert.run({ ...row, features: JSON.stringify(row.features) });
  });
  run(DEFAULT_SERVICES);
}

function seedSettings(db) {
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insert.run(key, value);
}

export function createDb(dbPath = process.env.DATABASE_PATH || './data/meher-emb.db') {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  seedServices(db);
  seedSettings(db);
  return db;
}

export function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULT_SETTINGS };
  for (const row of rows) out[row.key] = row.value;
  return out;
}

export function publicSettings(db) {
  const s = getSettings(db);
  return {
    business_name: s.business_name,
    app_name: s.app_name,
    tagline: s.tagline,
    email: s.email,
    whatsapp_link: s.whatsapp_link,
    website: s.website,
    pinterest: s.pinterest,
    currency: s.currency,
    turnaround: s.turnaround,
    order_notice: s.order_notice,
    payment_methods: s.payment_methods,
    testimonials_enabled: s.testimonials_enabled === '1',
    delivery_formats: DELIVERY_FORMATS,
  };
}
